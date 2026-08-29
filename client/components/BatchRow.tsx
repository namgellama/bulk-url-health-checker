import { Batch } from "@/apis/batch.api";
import { formatDate } from "@/utils/format-date";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

const statusConfig = {
    pending: {
        label: "Pending",
        className: "bg-yellow-100 text-yellow-700",
    },
    running: {
        label: "Running",
        className: "bg-blue-100 text-blue-700",
    },
    completed: {
        label: "Completed",
        className: "bg-green-100 text-green-700",
    },
    cancelled: {
        label: "Cancelled",
        className: "bg-gray-100 text-gray-600",
    },
};

function BatchRow({ batch }: { batch: Batch }) {
    const progress = useMemo(() => {
        if (batch.totalCount === 0) {
            return 0;
        }

        return Math.round((batch.completedCount / batch.totalCount) * 100);
    }, [batch.completedCount, batch.totalCount]);

    const status = statusConfig[batch.status];

    const router = useRouter();

    return (
        <tr className="transition hover:bg-gray-50">
            {/* Batch */}
            <td className="px-6 py-5">
                <div>
                    <p className="font-medium text-gray-900">
                        Batch #{batch.id.slice(0, 8)}
                    </p>

                    <p className="mt-1 font-mono text-xs text-gray-400">
                        {batch.id}
                    </p>
                </div>
            </td>

            {/* Status */}
            <td className="px-6 py-5">
                <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                >
                    {batch.status === "running" && (
                        <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                    )}

                    {status.label}
                </span>
            </td>

            {/* Progress */}
            <td className="min-w-55 px-6 py-5">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                        {batch.completedCount} / {batch.totalCount}
                    </span>

                    <span className="font-medium text-gray-900">
                        {progress}%
                    </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                        className="h-full rounded-full bg-black transition-all duration-500"
                        style={{
                            width: `${progress}%`,
                        }}
                    />
                </div>
            </td>

            {/* Results */}
            <td className="px-6 py-5">
                <div className="flex items-center gap-4 text-sm">
                    <span>
                        <span className="font-medium text-green-600">
                            {batch.successCount}
                        </span>{" "}
                        <span className="text-gray-400">success</span>
                    </span>

                    <span>
                        <span className="font-medium text-red-600">
                            {batch.failedCount}
                        </span>{" "}
                        <span className="text-gray-400">failed</span>
                    </span>
                </div>
            </td>

            {/* Created */}
            <td className="whitespace-nowrap px-6 py-5 text-sm text-gray-500">
                {formatDate(batch.createdAt)}
            </td>

            {/* Action */}
            <td className="px-6 py-5 text-right">
                <button
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => router.push(`/batches/${batch.id}`)}
                >
                    View →
                </button>
            </td>
        </tr>
    );
}

export default BatchRow;
