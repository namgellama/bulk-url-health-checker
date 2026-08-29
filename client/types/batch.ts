export type BatchStatus = "pending" | "running" | "completed" | "cancelled";

export interface Batch {
    id: string;
    status: BatchStatus;
    totalCount: number;
    completedCount: number;
    successCount: number;
    failedCount: number;
    createdAt: string;
    updatedAt: string;
}
