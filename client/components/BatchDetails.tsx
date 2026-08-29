import { batchStatusConfig } from "@/app/constants/batchStatusConfig";
import { urlStatusConfig } from "@/app/constants/urlStatusConfig";
import { Batch } from "@/types/batch";
import { Url } from "@/types/url";
import { formatDate } from "@/utils/formatDate";
import { formatResponseTime } from "@/utils/formatResponseTime";
import { getHostname } from "@/utils/getHostName";
import Link from "next/link";

function BatchDetails({ batch }: { batch: Batch & { urls: Url[] } }) {
    const progress =
        batch.totalCount === 0
            ? 0
            : Math.round((batch.completedCount / batch.totalCount) * 100);

    const status = batchStatusConfig[batch.status];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-7xl">
                {/* Back */}
                <Link
                    href="/batches"
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

                    {batch.status === "running" && (
                        <button className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                            Cancel Batch
                        </button>
                    )}
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
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {batch.urls.map((urlCheck) => (
                                    <UrlRow
                                        key={urlCheck.id}
                                        urlCheck={urlCheck}
                                    />
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

function UrlRow({ urlCheck }: { urlCheck: Url }) {
    const status = urlStatusConfig[urlCheck.status];

    return (
        <tr className="transition hover:bg-gray-50">
            {/* URL */}
            <td className="max-w-75 px-6 py-5">
                <a
                    href={urlCheck.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-medium text-gray-900 hover:text-blue-600 hover:underline"
                    title={urlCheck.url}
                >
                    {getHostname(urlCheck.url)}
                </a>

                <p
                    className="mt-1 truncate text-xs text-gray-400"
                    title={urlCheck.url}
                >
                    {urlCheck.url}
                </p>
            </td>

            {/* Status */}
            <td className="px-6 py-5">
                <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                >
                    {urlCheck.status === "checked" && (
                        <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                    )}

                    {status.label}
                </span>
            </td>

            {/* HTTP Status */}
            <td className="px-6 py-5">
                {urlCheck.httpStatus ? (
                    <span
                        className={
                            urlCheck.httpStatus >= 200 &&
                            urlCheck.httpStatus < 300
                                ? "font-medium text-green-600"
                                : "font-medium text-red-600"
                        }
                    >
                        {urlCheck.httpStatus}
                    </span>
                ) : (
                    <span className="text-gray-400">—</span>
                )}
            </td>

            {/* Response Time */}
            <td className="px-6 py-5 text-sm text-gray-600">
                {formatResponseTime(urlCheck.responseTimeMs)}
            </td>

            {/* Attempts */}
            <td className="px-6 py-5 text-sm text-gray-600">
                {urlCheck.attemptCount} / {urlCheck.maxAttempts}
            </td>

            {/* Page Title */}
            <td className="max-w-62.5 px-6 py-5">
                {urlCheck.pageTitle ? (
                    <p
                        className="truncate text-sm text-gray-700"
                        title={urlCheck.pageTitle}
                    >
                        {urlCheck.pageTitle}
                    </p>
                ) : urlCheck.errorMessage ? (
                    <p
                        className="truncate text-sm text-red-500"
                        title={urlCheck.errorMessage}
                    >
                        {urlCheck.errorMessage}
                    </p>
                ) : (
                    <span className="text-gray-400">—</span>
                )}
            </td>

            {/* Finished */}
            <td className="whitespace-nowrap px-6 py-5 text-sm text-gray-500">
                {urlCheck.finishedAt ? formatDate(urlCheck.finishedAt) : "—"}
            </td>
        </tr>
    );
}

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
