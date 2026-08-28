import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { batchController } from "../controllers/batch.controller";
import { batchRepository } from "../repositories/batch.repository";
import { batchService } from "../services/batch.service";
import { createBatchSchema } from "../validations/batch.validation";

const batchRoutes = async (
    app: FastifyInstance,
    _opts: FastifyPluginOptions,
) => {
    const repository = batchRepository(app.prisma);
    const service = batchService(repository);
    const controller = batchController(service);

    app.get("/", controller.getAllBatches);
    app.get("/:id", controller.getBatch);
    app.post(
        "/",
        { schema: { body: createBatchSchema } },
        controller.createBatch,
    );
};

export default batchRoutes;
