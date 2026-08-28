import { urlQueue } from "../queues/url.queue";
import { type BatchRepository } from "../repositories/batch.repository";
import type { UrlRepository } from "../repositories/url.repository";
import { NotFoundError } from "../utils/error";
import type { CreateBatchInput } from "../validations/batch.validation";

export function batchService(
    batchRepository: BatchRepository,
    urlRepository: UrlRepository,
) {
    return {
        getAll: () => {
            return batchRepository.getAll();
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

            return batch;
        },
    };
}

export type BatchService = ReturnType<typeof batchService>;
