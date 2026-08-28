import IORedis from "ioredis";
import Env from "./env";

export const redis = new IORedis(Env.REDIS_URL, {
    maxRetriesPerRequest: null,
});
