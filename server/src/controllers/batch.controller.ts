import type { FastifyReply, FastifyRequest } from "fastify";
import type { BatchService } from "../services/batch.service";
import type { CreateBatchInput } from "../validations/batch.validation";

export function batchController(batchService: BatchService) {
    return {
        getAllBatches: async (req: FastifyRequest, reply: FastifyReply) => {
            const batches = await batchService.getAll();

            return reply.send({
                success: true,
                message: "All batches fetched successfully",
                data: batches,
            });
        },

        getBatch: async (
            req: FastifyRequest<{ Params: { id: string } }>,
            reply: FastifyReply,
        ) => {
            const batch = await batchService.getById(req.params.id);

            return reply.send({
                success: true,
                message: "Batch fetched successfully",
                data: batch,
            });
        },

        createBatch: async (
            req: FastifyRequest<{ Body: CreateBatchInput }>,
            reply: FastifyReply,
        ) => {
            const batch = await batchService.create(req.body);

            return reply.status(201).send({
                success: true,
                message: "Batch created successfully",
                data: batch,
            });
        },
    };
}
