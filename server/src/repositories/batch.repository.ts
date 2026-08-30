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

        retryFailed: (id: string) => {
            return prisma.$transaction(async (tx) => {
                const batch = await tx.batch.findUnique({
                    where: { id },
                });

                if (!batch) {
                    return null;
                }

                if (batch.status === "running") {
                    throw new BadRequestError(
                        "Cannot retry failed URLs while the batch is running",
                    );
                }

                if (batch.status === "cancelled") {
                    throw new BadRequestError(
                        "Cannot retry failed URLs from a cancelled batch",
                    );
                }

                /*
                 * Only retry URLs that actually finished in a failed state.
                 */
                const failedUrls = await tx.url.findMany({
                    where: {
                        batchId: id,
                        status: "failed",
                    },
                    select: {
                        id: true,
                        url: true,
                        jobVersion: true,
                        maxAttempts: true,
                    },
                });

                if (failedUrls.length === 0) {
                    throw new BadRequestError(
                        "There are no failed URLs to retry",
                    );
                }

                /*
                 * A new jobVersion makes any old/stale job unable to
                 * modify these URLs.
                 */
                const retriedUrls = await Promise.all(
                    failedUrls.map((url) =>
                        tx.url.update({
                            where: {
                                id: url.id,
                            },
                            data: {
                                status: "queued",

                                jobVersion: {
                                    increment: 1,
                                },

                                attemptCount: 0,
                                httpStatus: null,
                                responseTimeMs: null,
                                pageTitle: null,
                                errorMessage: null,
                                startedAt: null,
                                finishedAt: null,
                                jobId: null,
                            },
                            select: {
                                id: true,
                                url: true,
                                jobVersion: true,
                                maxAttempts: true,
                            },
                        }),
                    ),
                );

                /*
                 * These failed URLs were previously counted as completed.
                 *
                 * Example:
                 *
                 * total = 10
                 * completed = 10
                 * failed = 3
                 *
                 * After retry:
                 *
                 * completed = 7
                 * failed = 0
                 */
                const newCompletedCount =
                    batch.completedCount - failedUrls.length;

                const updatedBatch = await tx.batch.update({
                    where: {
                        id,
                    },
                    data: {
                        status: "running",

                        completedCount: Math.max(0, newCompletedCount),

                        failedCount: 0,
                    },
                    select: {
                        id: true,
                        status: true,
                        totalCount: true,
                        completedCount: true,
                        successCount: true,
                        failedCount: true,
                    },
                });

                return {
                    batch: updatedBatch,
                    urls: retriedUrls,
                };
            });
        },

        updateRetryJobIds: (
            updates: {
                urlId: string;
                jobId: string;
                jobVersion: number;
            }[],
        ) => {
            return prisma.$transaction(
                updates.map((update) =>
                    prisma.url.updateMany({
                        where: {
                            id: update.urlId,
                            jobVersion: update.jobVersion,
                            status: "queued",
                        },
                        data: {
                            jobId: update.jobId,
                        },
                    }),
                ),
            );
        },
    };
}

export type BatchRepository = ReturnType<typeof batchRepository>;
