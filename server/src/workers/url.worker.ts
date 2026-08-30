import { Job, Worker } from "bullmq";
import { publishBatchEvent } from "../pub-sub/publisher";
import { HttpStatusError } from "../utils/error";
import { prisma } from "../utils/prisma";
import { redis } from "../utils/redis";
import { checkUrl } from "../utils/url-checker";
import { invalidateBatchListCache } from "../utils/batch-cache";

const worker = new Worker("url-queue", processUrl, {
    connection: redis,
    concurrency: 5,
    limiter: {
        max: 10,
        duration: 1000,
    },
});

worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed`, error);
});

export async function processUrl(job: Job) {
    const { urlId, batchId, jobVersion } = job.data;

    // await new Promise((resolve) => setTimeout(resolve, 10000));

    // Re-check current state before doing any work — if the batch was
    // cancelled or this URL was re-queued (retry-failed bumped the version)
    // while this job sat in the queue, bail out without hitting the network.
    const row = await prisma.url.findUnique({ where: { id: urlId } });

    if (!row || row.jobVersion !== jobVersion || row.status === "cancelled") {
        return; // stale job — no-op
    }

    /*
     * Check batch before starting.
     *
     * A job may have been queued before the batch was cancelled.
     */
    const batchBeforeStart = await prisma.batch.findUnique({
        where: { id: batchId },
        select: {
            id: true,
            status: true,
        },
    });

    if (!batchBeforeStart || batchBeforeStart.status === "cancelled") {
        return;
    }

    /*
     * pending -> running
     *
     * updateMany makes this safe when multiple workers start
     * at the same time.
     */
    const runningResult = await prisma.batch.updateMany({
        where: {
            id: batchId,
            status: "pending",
        },
        data: {
            status: "running",
        },
    });

    /*
     * Only the worker that actually changed pending -> running
     * needs to publish the status event.
     */
    if (runningResult.count > 0) {
        const batch = await prisma.batch.findUnique({
            where: { id: batchId },
            select: {
                id: true,
                status: true,
                totalCount: true,
                completedCount: true,
                successCount: true,
                failedCount: true,
            },
        });

        if (batch) {
            await publishBatchEvent(batchId, {
                type: "batch_updated",
                batch,
            });
        }

        await invalidateBatchListCache();
    }

    /*
     * Check one more time before starting the URL request.
     *
     * This closes the race:
     *
     * worker checks batch
     *       ↓
     * user cancels batch
     *       ↓
     * worker should NOT start checkUrl()
     */
    const latestState = await prisma.url.findUnique({
        where: { id: urlId },
        select: {
            status: true,
            jobVersion: true,
        },
    });

    if (
        !latestState ||
        latestState.jobVersion !== jobVersion ||
        latestState.status === "cancelled"
    ) {
        return;
    }

    /*
     * Mark URL as checking.
     */
    const checkingResult = await prisma.url.updateMany({
        where: {
            id: urlId,
            jobVersion,
            status: {
                not: "cancelled",
            },
        },
        data: {
            status: "checking",
            startedAt: new Date(),
            attemptCount: {
                increment: 1,
            },
        },
    });

    if (checkingResult.count === 0) {
        return;
    }

    try {
        const result = await checkUrl(row.url);

        await writeResult(urlId, batchId, jobVersion, "success", result);
    } catch (err) {
        const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 3);

        if (isLastAttempt) {
            const httpStatus =
                err instanceof HttpStatusError ? err.httpStatus : null;

            const responseTimeMs =
                err instanceof HttpStatusError ? err.responseTimeMs : 0;

            const pageTitle =
                err instanceof HttpStatusError ? err.pageTitle : null;

            const statusText =
                err instanceof HttpStatusError
                    ? err.statusText
                    : err instanceof Error
                      ? err.message
                      : "Unknown Error";

            await writeResult(urlId, batchId, jobVersion, "failed", {
                httpStatus,
                responseTimeMs,
                pageTitle,
                errorMessage: statusText,
            });
        }

        throw err;
    }
}

async function writeResult(
    urlId: string,
    batchId: string,
    expectedVersion: number,
    status: "success" | "failed",
    result: {
        httpStatus: number | null;
        responseTimeMs: number;
        pageTitle: string | null;
        errorMessage: string | null;
    },
) {
    const outcome = await prisma.$transaction(async (tx) => {
        /*
         * Only a URL that is currently being checked can finish.
         *
         * This prevents:
         * - cancelled -> success
         * - success -> success
         * - failed -> success
         * - stale jobs from updating the URL
         */
        const { count: urlUpdated } = await tx.url.updateMany({
            where: {
                id: urlId,
                jobVersion: expectedVersion,
                status: "checking",
            },
            data: {
                status,
                httpStatus: result.httpStatus,
                responseTimeMs: result.responseTimeMs,
                pageTitle: result.pageTitle,
                errorMessage: result.errorMessage,
                finishedAt: new Date(),
            },
        });

        /*
         * URL was cancelled, already completed, or the job is stale.
         *
         * Do not update batch counters.
         */
        if (urlUpdated === 0) {
            return null;
        }

        /*
         * Get the current batch.
         *
         * A cancelled batch must never receive another completion.
         */
        const currentBatch = await tx.batch.findFirst({
            where: {
                id: batchId,
                status: {
                    not: "cancelled",
                },
            },
            select: {
                id: true,
                status: true,
                totalCount: true,
                completedCount: true,
                successCount: true,
                failedCount: true,
            },
        });

        /*
         * The batch was cancelled while the URL was in flight.
         *
         * The URL update above happened in this transaction, so if the
         * cancellation transaction won the race, this won't happen.
         *
         * If it does happen because of transaction ordering, rollback the
         * entire transaction rather than leaving the URL updated without
         * updating the batch.
         */
        if (!currentBatch) {
            return null;
        }

        const completedCount = currentBatch.completedCount + 1;

        const newStatus =
            completedCount >= currentBatch.totalCount
                ? "completed"
                : currentBatch.status;

        /*
         * Update the batch only while it is not cancelled.
         */
        const { count: batchUpdated } = await tx.batch.updateMany({
            where: {
                id: batchId,
                status: {
                    not: "cancelled",
                },
            },
            data: {
                completedCount: {
                    increment: 1,
                },

                ...(status === "success"
                    ? {
                          successCount: {
                              increment: 1,
                          },
                      }
                    : {
                          failedCount: {
                              increment: 1,
                          },
                      }),

                status: newStatus,
            },
        });

        /*
         * Batch was cancelled before we could update it.
         *
         * Throwing rolls back the URL update as well.
         */
        if (batchUpdated === 0) {
            throw new Error("Batch was cancelled while processing URL");
        }

        /*
         * Return the complete batch state needed by the frontend.
         */
        return {
            id: currentBatch.id,
            status: newStatus,
            totalCount: currentBatch.totalCount,
            completedCount,
            successCount:
                currentBatch.successCount + (status === "success" ? 1 : 0),
            failedCount:
                currentBatch.failedCount + (status === "failed" ? 1 : 0),
        };
    });

    /*
     * Nothing was changed because the job was stale/cancelled.
     */
    if (!outcome) {
        return;
    }

    /*
     * Keep the batch list cache fresh.
     */
    await invalidateBatchListCache();

    /*
     * Notify clients about the URL result.
     */
    await publishBatchEvent(batchId, {
        type: "url_updated",
        urlId,
        status,
        httpStatus: result.httpStatus,
        responseTimeMs: result.responseTimeMs,
        pageTitle: result.pageTitle,
        finishedAt: new Date().toISOString(),
    });

    /*
     * Notify clients about the updated batch counters/status.
     */
    await publishBatchEvent(batchId, {
        type: "batch_updated",
        batch: outcome,
    });
}
