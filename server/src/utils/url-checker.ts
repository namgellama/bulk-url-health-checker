export interface CheckResult {
    httpStatus: number | null;
    responseTimeMs: number;
    pageTitle: string | null;
    errorMessage: string | null;
}

const TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 100_000;

export async function checkUrl(url: string): Promise<CheckResult> {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            signal: controller.signal,
            redirect: "follow",
            headers: { "User-Agent": "url-health-checker/1.0" },
        });
        const responseTimeMs = Date.now() - start;

        let pageTitle: string | null = null;
        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("text/html")) {
            const text = await res.text();
            const match = text.match(/<title[^>]*>([^<]*)<\/title>/i);
            pageTitle = match?.[1]?.trim() ?? null;
        }

        return {
            httpStatus: res.status,
            responseTimeMs,
            pageTitle,
            errorMessage: null,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        // Throw so BullMQ's own retry/backoff kicks in — don't swallow it here
        throw new Error(message);
    } finally {
        clearTimeout(timeout);
    }
}
