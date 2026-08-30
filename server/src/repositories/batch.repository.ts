import type { PrismaClient } from "../generated/prisma/client";
import { BadRequestError } from "../utils/error";
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

        cancel: (id: string) => {
            return prisma.$transaction(async (tx) => {
                const batch = await tx.batch.findUnique({
                    where: { id },
                });

                if (!batch) {
                    return null;
                }

                if (batch.status === "completed") {
                    throw new BadRequestError(
                        "Cannot cancel a completed batch",
                    );
                }

                if (batch.status === "cancelled") {
                    return {
                        batch,
                        cancelledUrlIds: [],
                    };
                }

                /*
                 * Get URLs that are still active before cancelling them.
                 * We need their IDs so the service can publish url_updated
                 * SSE events for each cancelled URL.
                 */
                const activeUrls = await tx.url.findMany({
                    where: {
                        batchId: id,
                        status: {
                            in: ["queued", "checking"],
                        },
                    },
                    select: {
                        id: true,
                    },
                });

                /*
                 * Cancel the batch.
                 */
                const updatedBatch = await tx.batch.update({
                    where: {
                        id,
                        status: {
                            not: "cancelled",
                        },
                    },
                    data: {
                        status: "cancelled",
                    },
                });

                /*
                 * Cancel URLs that have not finished yet.
                 *
                 * Completed successful/failed URLs remain unchanged.
                 */
                await tx.url.updateMany({
                    where: {
                        batchId: id,
                        status: {
                            in: ["queued", "checking"],
                        },
                    },
                    data: {
                        status: "cancelled",
                        finishedAt: new Date(),
                    },
                });

                return {
                    batch: updatedBatch,
                    cancelledUrlIds: activeUrls.map((url) => url.id),
                };
            });
        },
    };
}

export type BatchRepository = ReturnType<typeof batchRepository>;
