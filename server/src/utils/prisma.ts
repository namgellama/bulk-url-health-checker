import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import Env from "./env";

export const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: Env.DATABASE_URL,
    }),
});
