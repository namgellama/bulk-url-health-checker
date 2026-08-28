import IORedis from "ioredis";
import { batchChannel, type BatchEvent } from "../types/event";
import Env from "../utils/env";

// Separate connection from the BullMQ worker connection —
// pub/sub commands need their own dedicated connection.
const publisher = new IORedis(Env.REDIS_URL);

export async function publishBatchEvent(
    batchId: string,
    event: BatchEvent,
): Promise<void> {
    await publisher.publish(batchChannel(batchId), JSON.stringify(event));
}
