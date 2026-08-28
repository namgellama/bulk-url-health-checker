import type {
    FastifyInstance,
    FastifyPluginAsync,
    FastifyPluginOptions,
} from "fastify";
import fp from "fastify-plugin";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Env from "../utils/env";

declare module "fastify" {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}

const dbPlugin: FastifyPluginAsync = async (
    fastify: FastifyInstance,
    _opts: FastifyPluginOptions,
) => {
    const prisma = new PrismaClient({
        adapter: new PrismaPg({
            connectionString: Env.DATABASE_URL,
        }),
    });
    await prisma.$connect();

    fastify.decorate("prisma", prisma);

    fastify.addHook("onClose", async (instance: FastifyInstance) => {
        await instance.prisma.$disconnect();
    });
};

export default fp(dbPlugin);
