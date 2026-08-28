export type BatchEvent =
    | {
          type: "url_updated";
          urlId: string;
          status: "checking" | "success" | "failed" | "cancelled";
          httpStatus?: number | null;
          responseTimeMs?: number | null;
          pageTitle?: string | null;
      }
    | {
          type: "batch_status_changed";
          status: "pending" | "running" | "completed" | "cancelled";
      };

export function batchChannel(batchId: string): string {
    return `batch:${batchId}:events`;
}
