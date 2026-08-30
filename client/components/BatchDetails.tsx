import { batchStatusConfig } from "@/app/constants/batchStatusConfig";
import { Batch } from "@/types/batch";
import { Url } from "@/types/url";
import { formatDate } from "@/utils/formatDate";
import Link from "next/link";
import UrlRow from "./UrlRow";
import { useCancelBatch, useRetryFailedBatch } from "@/apis/batch.api";

function BatchDetails({ batch }: { batch: Batch & { urls: Url[] } }) {
    const progress =
        batch.totalCount === 0
            ? 0
            : Math.round((batch.completedCount / batch.totalCount) * 100);

    const status = batchStatusConfig[batch.status];

    const { cancelBatchMutation, isLoading: isCancelling } = useCancelBatch(
        batch.id,
    );

    const { retryFailedBatchMutation, isLoading: isRetrying } =
        useRetryFailedBatch(batch.id);

    const isLoading = isCancelling || isRetrying;

    const handleBatchCancel = async () => {
        await cancelBatchMutation();
    };

    const handleRetryFailed = async () => {
        await retryFailedBatchMutation();
    };

    const canRetry =
        batch.failedCount > 0 &&
        batch.status !== "running" &&
        batch.status !== "cancelled";

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-7xl">
                {/* Back */}
                <Link
                    href="/"
                    className="mb-6 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900"
                >
                    ← Back to batches
                </Link>

                {/* Header */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold text-gray-900">
                                Batch #{batch.id.slice(0, 8)}
                            </h1>

                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                            >
                                {batch.status === "running" && (
                                    <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                                )}

                                {status.label}
                            </span>
                        </div>

                        <p className="mt-2 font-mono text-xs text-gray-400">
                            {batch.id}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        {/* Retry Failed */}
                        {canRetry && (
                            <button
                                type="button"
                                onClick={handleRetryFailed}
                                disabled={isLoading}
                                className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isRetrying
                                    ? "Retrying..."
                                    : `Retry Failed (${batch.failedCount})`}
                            </button>
                        )}

                        {/* Cancel */}
                        {batch.status === "running" && (
                            <button
                                type="button"
                                onClick={handleBatchCancel}
                                disabled={isLoading}
                                className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isCancelling
                                    ? "Cancelling..."
                                    : "Cancel Batch"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress */}
                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <h2 className="font-medium text-gray-900">
                                Batch Progress
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                {batch.completedCount} of {batch.totalCount}{" "}
                                URLs checked
                            </p>
                        </div>

                        <span className="text-2xl font-semibold text-gray-900">
                            {progress}%
                        </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                        <div
                            className="h-full rounded-full bg-black transition-all duration-500"
                            style={{
                                width: `${progress}%`,
                            }}
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard label="Total URLs" value={batch.totalCount} />

                    <StatCard
                        label="Successful"
                        value={batch.successCount}
                        valueClassName="text-green-600"
                    />

                    <StatCard
                        label="Failed"
                        value={batch.failedCount}
                        valueClassName="text-red-600"
                    />

                    <StatCard label="Completed" value={batch.completedCount} />
                </div>

                {/* Batch Information */}
                <div className="mb-6 grid gap-6 lg:grid-cols-2">
                    <InfoCard title="Batch Information">
                        <InfoRow
                            label="Batch ID"
                            value={
                                <span className="font-mono text-xs">
                                    {batch.id}
                                </span>
                            }
                        />

                        <InfoRow label="Status" value={status.label} />

                        <InfoRow
                            label="Created"
                            value={formatDate(batch.createdAt)}
                        />

                        <InfoRow
                            label="Last Updated"
                            value={formatDate(batch.updatedAt)}
                        />
                    </InfoCard>

                    <InfoCard title="Results">
                        <InfoRow label="Total URLs" value={batch.totalCount} />

                        <InfoRow
                            label="Successful"
                            value={batch.successCount}
                        />

                        <InfoRow label="Failed" value={batch.failedCount} />

                        <InfoRow
                            label="Remaining"
                            value={batch.totalCount - batch.completedCount}
                        />
                    </InfoCard>
                </div>

                {/* URL Results */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-medium text-gray-900">
                                    URL Results
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Health check results for each URL
                                </p>
                            </div>

                            <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                                {batch.urls.length} URLs
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-200 bg-gray-50">
                                <tr className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    <th className="px-6 py-3">URL</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">HTTP</th>
                                    <th className="px-6 py-3">Response</th>
                                    <th className="px-6 py-3">Attempts</th>
                                    <th className="px-6 py-3">Page Title</th>
                                    <th className="px-6 py-3">Finished</th>
                                    <th className="px-6 py-3" />
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {batch.urls.map((url) => (
                                    <UrlRow key={url.id} url={url} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BatchDetails;

function StatCard({
    label,
    value,
    valueClassName = "text-gray-900",
}: {
    label: string;
    value: number;
    valueClassName?: string;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>

            <p className={`mt-2 text-2xl font-semibold ${valueClassName}`}>
                {value.toLocaleString()}
            </p>
        </div>
    );
}

function InfoCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="font-medium text-gray-900">{title}</h2>
            </div>

            <div className="divide-y divide-gray-100">{children}</div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 px-6 py-4">
            <span className="text-sm text-gray-500">{label}</span>

            <span className="text-right text-sm font-medium text-gray-900">
                {value}
            </span>
        </div>
    );
}
