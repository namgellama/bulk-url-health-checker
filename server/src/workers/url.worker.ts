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

    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Re-check current state before doing any work — if the batch was
    // cancelled or this URL was re-queued (retry-failed bumped the version)
    // while this job sat in the queue, bail out without hitting the network.
    const row = await prisma.url.findUnique({ where: { id: urlId } });

    if (!row || row.jobVersion !== jobVersion || row.status === "cancelled") {
        return; // stale job — no-op
    }

    /*
     * Mark batch as running.
     *
     * updateMany with status = pending makes this safe when
     * multiple workers start at the same time.
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
     * Mark URL as checking.
     */
    await prisma.url.updateMany({
        where: {
            id: urlId,
            jobVersion,
        },
        data: {
            status: "checking",
            startedAt: new Date(),
            attemptCount: {
                increment: 1,
            },
        },
    });

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
         * Update URL.
         *
         * jobVersion prevents stale/retried jobs from
         * modifying the URL.
         */
        const { count } = await tx.url.updateMany({
            where: { id: urlId, jobVersion: expectedVersion }, // idempotency guard
            data: {
                status,
                httpStatus: result.httpStatus,
                responseTimeMs: result.responseTimeMs,
                pageTitle: result.pageTitle,
                errorMessage: result.errorMessage,
                finishedAt: new Date(),
            },
        });

        if (count === 0) return null; // superseded — discard

        /*
         * Update batch counters.
         */
        const currentBatch = await tx.batch.findUnique({
            where: { id: batchId },
        });

        if (!currentBatch) {
            return null;
        }

        const completedCount = currentBatch.completedCount + 1;

        /*
         * The batch should already be running here.
         *
         * Only transition to completed when every URL
         * has finished.
         */
        const newStatus =
            completedCount >= currentBatch.totalCount
                ? "completed"
                : currentBatch.status;

        const batch = await tx.batch.update({
            where: { id: batchId },
            data: {
                completedCount: { increment: 1 },
                ...(status === "success"
                    ? { successCount: { increment: 1 } }
                    : { failedCount: { increment: 1 } }),
                status: newStatus,
            },
        });

        return batch;
    });

    if (!outcome) {
        return;
    }

    await invalidateBatchListCache();

    /*
     * URL event
     */
    await publishBatchEvent(batchId, {
        type: "url_updated",
        urlId,
        status,
        httpStatus: result.httpStatus,
        responseTimeMs: result.responseTimeMs,
        pageTitle: result.pageTitle,
    });

    /*
     * Batch event
     */
    await publishBatchEvent(batchId, {
        type: "batch_updated",
        batch: outcome,
    });
}
