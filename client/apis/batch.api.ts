import { api } from "@/lib/api";
import { ApiError } from "@/types/api-error";
import { useQuery } from "@tanstack/react-query";

export interface Batch {
    id: string;
    status: "pending" | "running" | "completed" | "cancelled";
    totalCount: number;
    completedCount: number;
    successCount: number;
    failedCount: number;
    createdAt: string;
    updatedAt: string;
}

export const useFetchAllBatches = () => {
    const fetchAllBatches = async () => {
        const response = await api.get("/v1/batches");
        return response.data.data;
    };

    const {
        data: batches,
        isLoading,
        error,
    } = useQuery<Batch[], ApiError>({
        queryFn: fetchAllBatches,
        queryKey: ["batches"],
    });

    return { batches, isLoading, error };
};
