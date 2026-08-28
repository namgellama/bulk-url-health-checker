import { type BatchRepository } from "../repositories/batch.repository";
import { NotFoundError } from "../utils/error";
import type { CreateBatchInput } from "../validations/batch.validation";

export function batchService(batchRepository: BatchRepository) {
    return {
        getAll: () => {
            return batchRepository.getAll();
        },

        getById: async (id: string) => {
            const batch = await batchRepository.getById(id);

            if (!batch) throw new NotFoundError("Batch not found");

            return batch;
        },

        create: (body: CreateBatchInput) => {
            return batchRepository.create(body);
        },
    };
}

export type BatchService = ReturnType<typeof batchService>;
