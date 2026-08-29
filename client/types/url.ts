export type UrlStatus =
    | "queued"
    | "checked"
    | "success"
    | "failed"
    | "cancelled";

export interface Url {
    id: string;
    url: string;
    status: UrlStatus;
    attemptCount: number;
    maxAttempts: number;
    httpStatus: number | null;
    responseTimeMs: number | null;
    pageTitle: string | null;
    errorMessage: string | null;
    jobId: string;
    jobVersion: number;
    createdAt: string;
    updatedAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    batchId: string;
}
