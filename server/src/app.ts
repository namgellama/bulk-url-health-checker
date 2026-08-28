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

const app = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

app.register(cors);
app.register(helmet);

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.get("/health", async (_request, _reply) => {
    return { status: "ok" };
});

app.setErrorHandler(
    (error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
        if (error.validation) {
            return reply.status(400).send({
                error: "Validation Error",
                message: error.message,
            });
        }

        if (error.statusCode) {
            return reply
                .status(error.statusCode)
                .send({ error: error.name, message: error.message });
        }

        return reply.status(500).send({ error: "Internal Server Error" });
    },
);

export default app;
