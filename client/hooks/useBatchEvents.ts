"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Batch } from "@/types/batch";
import type { Url } from "@/types/url";

type BatchWithUrls = Batch & {
    urls: Url[];
};

type UrlUpdatedEvent = {
    type: "url_updated";
    urlId: string;
    status: Url["status"];
    httpStatus?: number | null;
    responseTimeMs?: number | null;
    pageTitle?: string | null;
    finishedAt?: string | null;
};

type BatchUpdatedEvent = {
    type: "batch_updated";
    batch: {
        id: string;
        status: Batch["status"];
        totalCount: number;
        completedCount: number;
        successCount: number;
        failedCount: number;
    };
};

export function useBatchEvents(
    batchId: string,
    setBatch: React.Dispatch<React.SetStateAction<BatchWithUrls | null>>,
) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!batchId) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
            console.error("NEXT_PUBLIC_API_URL is not defined");
            return;
        }

        const eventSource = new EventSource(
            `${apiUrl}/v1/batches/${batchId}/events`,
        );

        eventSource.onopen = () => {
            console.log("🟢 SSE connected");
        };

        /*
         * Initial snapshot.
         *
         * Backend sends:
         *
         * event: snapshot
         * data: {...}
         *
         * This gives us the complete current state.
         */
        eventSource.addEventListener("snapshot", (event) => {
            try {
                const batch = JSON.parse(event.data) as BatchWithUrls;

                console.log("📸 SSE snapshot:", batch);

                setBatch(batch);

                queryClient.setQueryData<BatchWithUrls>(
                    ["batches", batchId],
                    batch,
                );
            } catch (error) {
                console.error("Failed to parse snapshot event:", error);
            }
        });

        /*
         * Individual URL update.
         *
         * IMPORTANT:
         * Don't update completedCount/successCount/failedCount here.
         *
         * Those values come from batch_updated.
         */
        eventSource.addEventListener("url_updated", (event) => {
            try {
                const update = JSON.parse(event.data) as UrlUpdatedEvent;

                console.log("🔗 URL updated:", update);

                // Update local state
                setBatch((current) => {
                    if (!current) return current;

                    return {
                        ...current,

                        urls: current.urls.map((url) =>
                            url.id === update.urlId
                                ? {
                                      ...url,
                                      status: update.status,
                                      httpStatus: update.httpStatus ?? null,
                                      responseTimeMs:
                                          update.responseTimeMs ?? null,
                                      pageTitle: update.pageTitle ?? null,
                                      finishedAt:
                                          update.finishedAt ?? url.finishedAt,
                                  }
                                : url,
                        ),
                    };
                });

                // Update React Query cache
                queryClient.setQueryData<BatchWithUrls>(
                    ["batches", batchId],
                    (current) => {
                        if (!current) return current;

                        return {
                            ...current,

                            urls: current.urls.map((url) =>
                                url.id === update.urlId
                                    ? {
                                          ...url,
                                          status: update.status,
                                          httpStatus: update.httpStatus ?? null,
                                          responseTimeMs:
                                              update.responseTimeMs ?? null,
                                          pageTitle: update.pageTitle ?? null,
                                          finishedAt:
                                              update.finishedAt ??
                                              url.finishedAt,
                                      }
                                    : url,
                            ),
                        };
                    },
                );
            } catch (error) {
                console.error("Failed to parse url_updated event:", error);
            }
        });

        /*
         * Batch update.
         *
         * This is the source of truth for:
         * - status
         * - totalCount
         * - completedCount
         * - successCount
         * - failedCount
         */
        eventSource.addEventListener("batch_updated", (event) => {
            try {
                const update = JSON.parse(event.data) as BatchUpdatedEvent;

                console.log("📊 Batch updated:", update);

                const batchUpdate = update.batch;

                // Update local state
                setBatch((current) => {
                    if (!current) return current;

                    return {
                        ...current,
                        status: batchUpdate.status,
                        totalCount: batchUpdate.totalCount,
                        completedCount: batchUpdate.completedCount,
                        successCount: batchUpdate.successCount,
                        failedCount: batchUpdate.failedCount,
                    };
                });

                // Update React Query cache
                queryClient.setQueryData<BatchWithUrls>(
                    ["batches", batchId],
                    (current) => {
                        if (!current) return current;

                        return {
                            ...current,
                            status: batchUpdate.status,
                            totalCount: batchUpdate.totalCount,
                            completedCount: batchUpdate.completedCount,
                            successCount: batchUpdate.successCount,
                            failedCount: batchUpdate.failedCount,
                        };
                    },
                );
            } catch (error) {
                console.error("Failed to parse batch_updated event:", error);
            }
        });

        eventSource.onerror = () => {
            console.log(
                "🔴 SSE connection lost. Browser will automatically retry.",
            );
        };

        return () => {
            console.log("🔌 Closing SSE connection");

            eventSource.close();
        };
    }, [batchId, queryClient, setBatch]);
}
