import type { PrismaClient } from "../generated/prisma/client";
import type { CreateBatchInput } from "../validations/batch.validation";

export function batchRepository(prisma: PrismaClient) {
    return {
        getAll: () => {
            return prisma.batch.findMany();
        },

        getById: (id: string) => {
            return prisma.batch.findUnique({
                where: { id },
                include: { urls: true },
            });
        },

        create: (body: CreateBatchInput) => {
            return prisma.batch.create({
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
        },
    };
}

export type BatchRepository = ReturnType<typeof batchRepository>;
