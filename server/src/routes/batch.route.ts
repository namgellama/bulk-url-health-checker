import type {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyRequest,
    FastifyReply,
} from "fastify";
import {
    createBatchSchema,
    type CreateBatchInput,
} from "../validations/batch.validation";

const batchRoutes = async (
    app: FastifyInstance,
    _opts: FastifyPluginOptions,
) => {
    app.get("/", async (_req: FastifyRequest, reply: FastifyReply) => {
        const batches = await app.prisma.batch.findMany();

        return reply.send({
            success: true,
            message: "All batches fetched successfully",
            data: batches,
        });
    });

    app.post(
        "/",
        { schema: { body: createBatchSchema } },
        async (req: FastifyRequest, reply: FastifyReply) => {
            const body = req.body as CreateBatchInput;

            const batch = await app.prisma.batch.create({
                data: {
                    totalCount: body.urls.length,
                    urls: {
                        createMany: {
                            data: body.urls.map((url) => ({ url })),
                        },
                    },
                },
                include: {
                    urls: true,
                },
            });

            return reply.status(201).send({
                success: true,
                message: "Batch created successfully",
                data: batch,
            });
        },
    );
};

export default batchRoutes;
