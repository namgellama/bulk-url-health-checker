import { z } from "zod";

export const createBatchSchema = z.object({
    urls: z.array(z.url()).min(1, "At least one URL is required"),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
