"use client";

import { useFetchAllBatches } from "@/apis/batch.api";
import { useRouter } from "next/navigation";
import BatchRow from "./BatchRow";

export default function BatchList() {
    const { batches = [], isLoading, error } = useFetchAllBatches();
    const router = useRouter();

    if (isLoading) {
        return <LoadingState />;
    }

    if (error) {
        return <ErrorState />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            URL Health Checks
                        </h1>

                        <p className="mt-1 text-sm text-gray-500">
                            Monitor the health of your bulk URL checks.
                        </p>
                    </div>

                    <button
                        className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                        onClick={() => router.push("/batches/new")}
                    >
                        + New Batch
                    </button>
                </div>

                {/* Summary */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard label="Total Batches" value={batches.length} />

                    <SummaryCard
                        label="Running"
                        value={
                            batches.filter(
                                (batch) => batch.status === "running",
                            ).length
                        }
                    />

                    <SummaryCard
                        label="Completed"
                        value={
                            batches.filter(
                                (batch) => batch.status === "completed",
                            ).length
                        }
                    />

                    <SummaryCard
                        label="URLs Checked"
                        value={batches.reduce(
                            (total, batch) => total + batch.completedCount,
                            0,
                        )}
                    />
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <h2 className="font-medium text-gray-900">
                            All Batches
                        </h2>
                    </div>

                    {batches.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-gray-200 bg-gray-50">
                                    <tr className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        <th className="px-6 py-3">Batch</th>

                                        <th className="px-6 py-3">Status</th>

                                        <th className="px-6 py-3">Progress</th>

                                        <th className="px-6 py-3">Results</th>

                                        <th className="px-6 py-3">Created</th>

                                        <th className="px-6 py-3" />
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {batches.map((batch) => (
                                        <BatchRow
                                            key={batch.id}
                                            batch={batch}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>

            <p className="mt-2 text-2xl font-semibold text-gray-900">
                {value.toLocaleString()}
            </p>
        </div>
    );
}

function EmptyState() {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">
                🔗
            </div>

            <h3 className="font-medium text-gray-900">No batches yet</h3>

            <p className="mt-1 max-w-sm text-sm text-gray-500">
                Create your first batch to start checking the health of multiple
                URLs at once.
            </p>

            <button
                className="mt-5 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                onClick={() => router.push("/batches/new")}
            >
                Create Batch
            </button>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8">
                    <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
                    <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-200" />
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />

                    <div className="mt-6 space-y-4">
                        {[1, 2, 3, 4].map((item) => (
                            <div
                                key={item}
                                className="h-16 animate-pulse rounded bg-gray-100"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ErrorState() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
            <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
                <h2 className="font-semibold text-gray-900">
                    Failed to load batches
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                    Something went wrong while fetching your batches.
                </p>
            </div>
        </div>
    );
}
