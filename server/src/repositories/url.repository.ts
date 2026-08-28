import type { PrismaClient } from "../generated/prisma/client";

export function urlRepository(prisma: PrismaClient) {
    return {
        updateBulkJobIds: (body: { id: string; jobId: string }[]) => {
            return prisma.$transaction(
                body.map(({ id, jobId }) =>
                    prisma.url.update({ where: { id }, data: { jobId } }),
                ),
            );
        },
    };
}

export type UrlRepository = ReturnType<typeof urlRepository>;
