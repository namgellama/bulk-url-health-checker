import { api } from "@/lib/api";
import { ApiError } from "@/types/api-error";
import { Batch } from "@/types/batch";
import { Url } from "@/types/url";
import { handleErrorResponse } from "@/utils/handleErrorResponse";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

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

export const useCreateBatch = () => {
    const router = useRouter();

    const fetchBatch = async (data: { urls: string[] }) => {
        const response = await api.post(`/v1/batches`, data);
        return response.data.data;
    };

    const { mutateAsync: createBatchMutation, isPending: isLoading } =
        useMutation<Batch, ApiError, { urls: string[] }>({
            mutationFn: fetchBatch,
            onSuccess: (batch) => {
                router.push(`/batches/${batch.id}`);
            },
            onError: (error) => {
                handleErrorResponse(error, "Error creating batch");
            },
        });

    return { createBatchMutation, isLoading };
};

export const useUploadCsv = () => {
    const router = useRouter();

    const uplaodCsv = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post(`/v1/batches/upload-csv`, formData);
        return response.data.data;
    };

    const { mutateAsync: uploadCsvMutation, isPending: isLoading } =
        useMutation<Batch, ApiError, File>({
            mutationFn: uplaodCsv,
            onSuccess: (batch) => {
                router.push(`/batches/${batch.id}`);
            },
            onError: (error) => {
                handleErrorResponse(error, "Error upload csv");
            },
        });

    return { uploadCsvMutation, isLoading };
};

export const useCancelBatch = (id: string) => {
    const cancelbatch = async () => {
        const response = await api.post(`/v1/batches/${id}/cancel`);
        return response.data.data;
    };

    const { mutateAsync: cancelBatchMutation, isPending: isLoading } =
        useMutation<Batch, ApiError, void>({
            mutationFn: cancelbatch,
            onSuccess: (batch) => {},
            onError: (error) => {
                handleErrorResponse(error, "Error cancelling batch");
            },
        });

    return { cancelBatchMutation, isLoading };
};

export const useRetryFailedBatch = (id: string) => {
    const retryFailedBatch = async () => {
        const response = await api.post(`/v1/batches/${id}/retry-failed`);
        return response.data.data;
    };

    const { mutateAsync: retryFailedBatchMutation, isPending: isLoading } =
        useMutation<Batch, ApiError, void>({
            mutationFn: retryFailedBatch,
            onSuccess: (batch) => {},
            onError: (error) => {
                handleErrorResponse(error, "Error retrying failed batch");
            },
        });

    return { retryFailedBatchMutation, isLoading };
};
