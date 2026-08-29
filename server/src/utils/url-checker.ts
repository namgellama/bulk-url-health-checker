import { HttpStatusError } from "./error";

export interface CheckResult {
    httpStatus: number | null;
    responseTimeMs: number;
    pageTitle: string | null;
    errorMessage: string | null;
}

const TIMEOUT_MS = 10_000;

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

        if (!res.ok) {
            console.log("res", res);
            // 4xx/5xx — reached the server, but it's not a healthy response.
            // Throw so processUrl records it as "failed" with the real status.
            throw new HttpStatusError(
                res.status,
                responseTimeMs,
                pageTitle,
                res.statusText,
            );
        }

        return {
            httpStatus: res.status,
            responseTimeMs,
            pageTitle,
            errorMessage: null,
        };
    } finally {
        clearTimeout(timeout);
    }
}
