import { UrlStatus } from "@/types/url";

export const urlStatusConfig: Record<
    UrlStatus,
    {
        label: string;
        className: string;
    }
> = {
    queued: {
        label: "Queued",
        className: "bg-gray-100 text-gray-600",
    },
    checking: {
        label: "Checking",
        className: "bg-blue-100 text-blue-700",
    },
    success: {
        label: "Healthy",
        className: "bg-green-100 text-green-700",
    },
    failed: {
        label: "Failed",
        className: "bg-red-100 text-red-700",
    },
    cancelled: {
        label: "Cancelled",
        className: "bg-gray-100 text-gray-600",
    },
};
