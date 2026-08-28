import { Job, Worker } from "bullmq";
import { redis } from "../utils/redis";
import { prisma } from "../utils/prisma";
import { checkUrl } from "../utils/url-checker";

const worker = new Worker("url-queue", processUrl, {
    connection: redis,
    concurrency: 5,
});

worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed`, error);
});

export async function processUrl(job: Job) {
    const { urlId, batchId, jobVersion } = job.data;

    // Re-check current state before doing any work — if the batch was
    // cancelled or this URL was re-queued (retry-failed bumped the version)
    // while this job sat in the queue, bail out without hitting the network.
    const row = await prisma.url.findUnique({ where: { id: urlId } });
    if (!row || row.jobVersion !== jobVersion || row.status === "cancelled") {
        return; // stale job — no-op
    }

    await prisma.url.updateMany({
        where: { id: urlId, jobVersion },
        data: {
            status: "checking",
            startedAt: new Date(),
            attemptCount: { increment: 1 },
        },
    });

    try {
        const result = await checkUrl(row.url);
        await writeResult(urlId, batchId, jobVersion, "success", result);
    } catch (err) {
        // BullMQ will retry automatically (attempts: 3, backoff). This catch
        // just records the interim failure info; final DB status is "failed"
        // only if this was the last attempt.
        const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 3);
        if (isLastAttempt) {
            await writeResult(urlId, batchId, jobVersion, "failed", {
                httpStatus: null,
                responseTimeMs: 0,
                pageTitle: null,
                errorMessage:
                    err instanceof Error ? err.message : "Unknown error",
            });
        }
        throw err; // rethrow so BullMQ still counts/logs the attempt
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

        const batch = await tx.batch.update({
            where: { id: batchId },
            data: {
                completedCount: { increment: 1 },
                ...(status === "success"
                    ? { successCount: { increment: 1 } }
                    : { failedCount: { increment: 1 } }),
            },
        });

        // flip batch to "completed" once every url is done
        if (
            batch.completedCount >= batch.totalCount &&
            batch.status === "running"
        ) {
            await tx.batch.update({
                where: { id: batchId },
                data: { status: "completed" },
            });
        }

        return batch;
    });

    if (outcome) {
        console.log("🚀 ~ writeResult ~ outcome:", outcome);
    }
}
