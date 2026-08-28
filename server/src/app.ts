import fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

const app = fastify({ logger: true });

app.register(cors);
app.register(helmet);

app.get("/health", async (request, reply) => {
    return { status: "ok" };
});

export default app;
