export type BatchEvent =
    | {
          type: "url_updated";
          urlId: string;
          status: "checking" | "success" | "failed" | "cancelled";
          httpStatus?: number | null;
          responseTimeMs?: number | null;
          pageTitle?: string | null;
          finishedAt?: string | null;
      }
    | {
          type: "batch_updated";
          batch: {
              id: string;
              status: "pending" | "running" | "completed" | "cancelled";
              totalCount: number;
              completedCount: number;
              successCount: number;
              failedCount: number;
          };
      };
export function batchChannel(batchId: string): string {
    return `batch:${batchId}:events`;
}
