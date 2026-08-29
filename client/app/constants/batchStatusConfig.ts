import { BatchStatus } from "@/types/batch";

export const batchStatusConfig: Record<
    BatchStatus,
    { label: string; className: string }
> = {
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
