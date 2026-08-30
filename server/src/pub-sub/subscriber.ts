import IORedis from "ioredis";
import Env from "../utils/env";
import { batchChannel, type BatchEvent } from "../types/event";
import type { ServerResponse } from "node:http";

// Dedicated connection for SUBSCRIBE — a Redis connection in subscribe
// mode can't run other commands, so this must be separate from any
// connection used for normal GET/SET calls.
const subscriber = new IORedis(Env.REDIS_URL);

// Per-process registry: batchId -> set of open SSE responses on THIS instance.
const clientsByBatch = new Map<string, Set<ServerResponse>>();
const subscribedChannels = new Set<string>();

subscriber.on("message", (channel: string, message: string) => {
    const batchId = channel.split(":")[1];

    if (!batchId) return;

    const clients = clientsByBatch.get(batchId);

    if (!clients || clients.size === 0) return;

    try {
        const event: BatchEvent = JSON.parse(message);
        /* * IMPORTANT: * * Without "event: ..." * * SSE treats this as: * * message * * With this: * * event: url_updated * data: {...} * * the browser fires: * * eventSource.addEventListener("url_updated", ...) */ const payload =
            `event: ${event.type}\n` + `data: ${JSON.stringify(event)}\n\n`;
        for (const res of clients) {
            if (!res.writableEnded) {
                res.write(payload);
            }
        }
    } catch (error) {
        console.error("Failed to process batch SSE event:", error);
    }
});

export function subscribeClientToBatch(
    batchId: string,
    res: ServerResponse,
): () => void {
    const channel = batchChannel(batchId);

    if (!clientsByBatch.has(batchId)) {
        clientsByBatch.set(batchId, new Set());
    }

    clientsByBatch.get(batchId)!.add(res);

    /* * Only subscribe to Redis once per channel * on this API instance. */ if (
        !subscribedChannels.has(channel)
    ) {
        subscribedChannels.add(channel);
        subscriber.subscribe(channel).catch((error) => {
            console.error(`Failed to subscribe to ${channel}:`, error);
        });
    }

    /* * Cleanup when browser disconnects. */ return () => {
        const clients = clientsByBatch.get(batchId);
        if (!clients) return;
        clients.delete(res);
        if (clients.size === 0) {
            clientsByBatch.delete(batchId);
            subscribedChannels.delete(channel);
            subscriber.unsubscribe(channel).catch((error) => {
                console.error(`Failed to unsubscribe from ${channel}:`, error);
            });
        }
    };
}
