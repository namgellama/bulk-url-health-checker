import toast from "react-hot-toast";

import type { ApiError } from "../types/api-error";

export const handleErrorResponse = (
    error: ApiError,
    fallbackMessage: string,
) => {
    if (error.response?.data.errors && error.response?.data.errors.length > 0)
        error.response?.data.errors.map((error) => toast.error(error.message));
    else toast.error(error?.response?.data?.message ?? fallbackMessage);
};
