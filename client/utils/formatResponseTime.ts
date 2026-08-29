export function formatResponseTime(ms: number | null) {
    if (ms === null) return "—";

    return `${ms} ms`;
}
