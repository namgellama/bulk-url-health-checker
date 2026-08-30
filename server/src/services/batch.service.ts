import { publishBatchEvent } from "../pub-sub/publisher";
import { urlQueue } from "../queues/url.queue";
import { type BatchRepository } from "../repositories/batch.repository";
import type { UrlRepository } from "../repositories/url.repository";
import {
    getCachedBatches,
    invalidateBatchListCache,
    setCachedBatches,
} from "../utils/batch-cache";
import { NotFoundError } from "../utils/error";
import type { CreateBatchInput } from "../validations/batch.validation";

export function batchService(
    batchRepository: BatchRepository,
    urlRepository: UrlRepository,
) {
    return {
        getAll: async () => {
            const cached = await getCachedBatches();

            if (cached) {
                return cached;
            }

            const batches = await batchRepository.getAll();

            await setCachedBatches(batches);

            return batches;
        },

        getById: async (id: string) => {
            const batch = await batchRepository.getById(id);

            if (!batch) throw new NotFoundError("Batch not found");

            return batch;
        },

        create: async (body: CreateBatchInput) => {
            const batch = await batchRepository.create(body);

            const jobsWithIds = batch.urls.map((url) => ({
                url,
                jobId: `${url.id}-v${url.jobVersion}`,
            }));

            await urlQueue.addBulk(
                jobsWithIds.map(({ url, jobId }) => ({
                    name: "check-url",
                    data: {
                        urlId: url.id,
                        batchId: batch.id,
                        jobVersion: url.jobVersion,
                    },
                    opts: {
                        jobId,
                        attempts: 3,
                        backoff: { type: "exponential", delay: 1000 },
                    },
                })),
            );

            await urlRepository.updateBulkJobIds(
                jobsWithIds.map(({ url, jobId }) => ({ id: url.id, jobId })),
            );

            await invalidateBatchListCache();

            return batch;
        },

        cancel: async (id: string) => {
            const result = await batchRepository.cancel(id);

            if (!result) {
                throw new NotFoundError("Batch not found");
            }

            await invalidateBatchListCache();

            /*
             * Notify clients that individual URLs were cancelled.
             */
            for (const urlId of result.cancelledUrlIds) {
                await publishBatchEvent(id, {
                    type: "url_updated",
                    urlId,
                    status: "cancelled",
                    httpStatus: null,
                    responseTimeMs: null,
                    pageTitle: null,
                    finishedAt: new Date().toISOString(),
                });
            }

            /*
             * Notify clients that the batch itself was cancelled.
             */
            await publishBatchEvent(id, {
                type: "batch_updated",
                batch: {
                    id: result.batch.id,
                    status: result.batch.status,
                    totalCount: result.batch.totalCount,
                    completedCount: result.batch.completedCount,
                    successCount: result.batch.successCount,
                    failedCount: result.batch.failedCount,
                },
            });

            return result.batch;
        },

        retryFailed: async (id: string) => {
            const result = await batchRepository.retryFailed(id);

            if (!result) {
                throw new NotFoundError("Batch not found");
            }

            /*
             * Create new BullMQ jobs ONLY for the failed URLs.
             */
            const jobs = result.urls.map((url) => ({
                name: "check-url",
                data: {
                    urlId: url.id,
                    batchId: result.batch.id,
                    jobVersion: url.jobVersion,
                },
                opts: {
                    attempts: 3,
                    backoff: {
                        type: "exponential",
                        delay: 1000,
                    },
                },
            }));

            const createdJobs = await urlQueue.addBulk(jobs);

            /*
             * Store the new BullMQ job IDs.
             */
            await batchRepository.updateRetryJobIds(
                result.urls.map((url, index) => ({
                    urlId: url.id,
                    jobId: createdJobs[index]?.id || "",
                    jobVersion: url.jobVersion,
                })),
            );

            await invalidateBatchListCache();

            /*
             * Tell connected batch pages that these URLs
             * are queued again.
             */
            for (const url of result.urls) {
                await publishBatchEvent(result.batch.id, {
                    type: "url_updated",
                    urlId: url.id,
                    status: "queued",
                    httpStatus: null,
                    responseTimeMs: null,
                    pageTitle: null,
                    finishedAt: null,
                });
            }

            /*
             * Tell the frontend that the batch is running again
             * and counters have been reset appropriately.
             */
            await publishBatchEvent(result.batch.id, {
                type: "batch_updated",
                batch: result.batch,
            });

            return result.batch;
        },
    };
}

export type BatchService = ReturnType<typeof batchService>;
