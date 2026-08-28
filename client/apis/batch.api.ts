import { api } from "@/lib/api";
import { ApiError } from "@/types/api-error";
import { useQuery } from "@tanstack/react-query";

interface Batch {
    id: string;
    status: "pending" | "running" | "completed" | "cancelled";
    totalCount: number;
    completedCount: number;
    successCount: number;
    failedCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export const useFetchAllBatches = () => {
    const fetchAllBatches = async () => {
        const response = await api.get("/v1/batches");
        return response.data.data;
    };

    const { data, isLoading, error } = useQuery<Batch[], ApiError>({
        queryFn: fetchAllBatches,
        queryKey: ["batches"],
    });

    return { data, isLoading, error };
};
