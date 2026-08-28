import type { AxiosError } from "axios";

export interface ApiError extends AxiosError<{
    detail?: string;
    errors?: any[];
}> {}
