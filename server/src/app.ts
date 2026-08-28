import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastify, {
    type FastifyError,
    type FastifyReply,
    type FastifyRequest,
} from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
    serializerCompiler,
    validatorCompiler,
} from "fastify-type-provider-zod";
import dbPlugin from "./plugins/db.plugin";
import batchRoutes from "./routes/batch.route";
import { AppError } from "./utils/error";

const app = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

app.register(cors);
app.register(helmet);
app.register(dbPlugin);

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.get("/health", async (_request, _reply) => {
    return { status: "ok" };
});

app.register(batchRoutes, {
    prefix: "/api/v1/batches",
});

app.setErrorHandler(
    (error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
        if (error.validation) {
            return reply.status(400).send({
                error: "Validation Error",
                message: error.message,
            });
        }

        if (error instanceof AppError) {
            return reply
                .status(error.statusCode)
                .send({ name: error.name, message: error.message });
        }

        return reply.status(500).send({ error: "Internal Server Error" });
    },
);

export default app;
