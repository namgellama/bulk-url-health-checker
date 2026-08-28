import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { batchController } from "../controllers/batch.controller";
import { batchRepository } from "../repositories/batch.repository";
import { batchService } from "../services/batch.service";
import { createBatchSchema } from "../validations/batch.validation";
import { urlRepository } from "../repositories/url.repository";

const batchRoutes = async (
    app: FastifyInstance,
    _opts: FastifyPluginOptions,
) => {
    const repository = batchRepository(app.prisma);
    const repositoryUrl = urlRepository(app.prisma);
    const service = batchService(repository, repositoryUrl);
    const controller = batchController(service);

    app.get("/", controller.getAllBatches);
    app.get("/:id", controller.getBatch);
    app.post(
        "/",
        { schema: { body: createBatchSchema } },
        controller.createBatch,
    );
    app.get("/:id/events", controller.getBatchEvents);
};

export default batchRoutes;
