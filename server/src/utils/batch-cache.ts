import { redis } from "./redis";

const BATCH_LIST_CACHE_KEY = "batches:list";
const BATCH_LIST_CACHE_TTL = 30;

export async function getCachedBatches() {
    const cached = await redis.get(BATCH_LIST_CACHE_KEY);

    if (!cached) {
        return null;
    }

    return JSON.parse(cached);
}

export async function setCachedBatches(batches: unknown[]) {
    await redis.set(
        BATCH_LIST_CACHE_KEY,
        JSON.stringify(batches),
        "EX",
        BATCH_LIST_CACHE_TTL,
    );
}

export async function invalidateBatchListCache() {
    await redis.del(BATCH_LIST_CACHE_KEY);
}
