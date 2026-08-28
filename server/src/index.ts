import Fastify from "fastify";

const fastify = Fastify({ logger: true });

fastify.get("/health", async (request, reply) => {
    return { status: "ok" };
});

fastify.listen({ port: 8000 }, function (err, address) {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
    // Server is now listening on ${address}
});
