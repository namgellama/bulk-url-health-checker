import type { AxiosError } from "axios";

export interface ApiError extends AxiosError<{
    message?: string;
    errors?: any[];
}> {}
