import { Queue } from "bullmq";
import { redis } from "../utils/redis";

export const urlQueue = new Queue("url-queue", {
    connection: redis,
});
