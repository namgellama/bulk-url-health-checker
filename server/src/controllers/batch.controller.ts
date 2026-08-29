import type { FastifyReply, FastifyRequest } from "fastify";
import { subscribeClientToBatch } from "../pub-sub/subscriber";
import type { BatchService } from "../services/batch.service";
import type { CreateBatchInput } from "../validations/batch.validation";
import { BadRequestError } from "../utils/error";
import { parseCsvUrls } from "../utils/csv-parser";

export function batchController(batchService: BatchService) {
    return {
        getAllBatches: async (_req: FastifyRequest, reply: FastifyReply) => {
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

        createBatchFromCsv: async (
            req: FastifyRequest,
            reply: FastifyReply,
        ) => {
            const file = await req.file();

            if (!file) {
                throw new BadRequestError("CSV file is required");
            }

            const csvText = await file.toBuffer();

            const urls = parseCsvUrls(csvText.toString());

            const batch = await batchService.create({ urls });

            return reply.status(201).send({
                success: true,
                message: "Batch created successfully",
                data: batch,
            });
        },

        getBatchEvents: (
            req: FastifyRequest<{ Params: { id: string } }>,
            reply: FastifyReply,
        ) => {
            const res = reply.raw;

            reply.hijack();

            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no",
            });

            res.write(": connected\n\n");

            const unsubscribe = subscribeClientToBatch(req.params.id, res);

            const heartbeat = setInterval(() => {
                res.write(": heartbeat\n\n");
            }, 15_000);

            req.raw.on("close", () => {
                clearInterval(heartbeat);
                unsubscribe();
            });
        },
    };
}
