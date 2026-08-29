import { api } from "@/lib/api";
import { ApiError } from "@/types/api-error";
import { Batch } from "@/types/batch";
import { Url } from "@/types/url";
import { useQuery } from "@tanstack/react-query";

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

export const useFetchBatch = (id: string | undefined) => {
    const fetchBatch = async () => {
        const response = await api.get(`/v1/batches/${id}`);
        return response.data.data;
    };

    const {
        data: batch,
        isLoading,
        error,
    } = useQuery<Batch & { urls: Url[] }, ApiError>({
        queryFn: fetchBatch,
        queryKey: ["batches", id],
        enabled: !!id,
    });

    return { batch, isLoading, error };
};
