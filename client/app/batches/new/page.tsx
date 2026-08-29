"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateBatch } from "@/apis/batch.api";

const page = () => {
    const router = useRouter();
    const [urls, setUrls] = useState("");
    const [error, setError] = useState("");

    const { createBatchMutation, isLoading } = useCreateBatch();

    const parsedUrls = useMemo(() => {
        return urls
            .split("\n")
            .map((url) => url.trim())
            .filter(Boolean);
    }, [urls]);

    const validUrls = useMemo(() => {
        return parsedUrls.filter((url) => {
            try {
                const parsed = new URL(url);

                return (
                    parsed.protocol === "http:" || parsed.protocol === "https:"
                );
            } catch {
                return false;
            }
        });
    }, [parsedUrls]);

    const invalidCount = parsedUrls.length - validUrls.length;

    async function handleSubmit(e: React.SubmitEvent) {
        e.preventDefault();

        setError("");

        if (parsedUrls.length === 0) {
            setError("Please enter at least one URL.");
            return;
        }

        if (invalidCount > 0) {
            setError(
                `${invalidCount} invalid URL${
                    invalidCount > 1 ? "s" : ""
                }. Please fix them before creating the batch.`,
            );
            return;
        }

        await createBatchMutation({ urls: validUrls });
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-4xl">
                {/* Back */}
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mb-6 text-sm font-medium text-gray-500 hover:text-gray-900"
                >
                    ← Back
                </button>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Create URL Health Check
                    </h1>

                    <p className="mt-2 text-sm text-gray-500">
                        Add the URLs you want to check. Enter one URL per line.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        {/* Input header */}
                        <div className="border-b border-gray-200 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="font-medium text-gray-900">
                                        URLs
                                    </h2>

                                    <p className="mt-1 text-sm text-gray-500">
                                        HTTP and HTTPS URLs are supported.
                                    </p>
                                </div>

                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                                    {parsedUrls.length}{" "}
                                    {parsedUrls.length === 1 ? "URL" : "URLs"}
                                </span>
                            </div>
                        </div>

                        {/* Textarea */}
                        <div className="p-6">
                            <textarea
                                value={urls}
                                onChange={(e) => setUrls(e.target.value)}
                                placeholder={`https://example.com
https://github.com
https://google.com`}
                                rows={14}
                                disabled={isLoading}
                                className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                            />

                            {/* URL stats */}
                            <div className="mt-4 flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-green-500" />
                                    <span className="text-gray-500">Valid</span>
                                    <span className="font-medium text-gray-900">
                                        {validUrls.length}
                                    </span>
                                </div>

                                {invalidCount > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-red-500" />

                                        <span className="text-gray-500">
                                            Invalid
                                        </span>

                                        <span className="font-medium text-red-600">
                                            {invalidCount}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
                            <p className="text-xs text-gray-500">
                                Each URL will be checked independently.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    disabled={isLoading}
                                    className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        isLoading ||
                                        parsedUrls.length === 0 ||
                                        invalidCount > 0
                                    }
                                    className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isLoading ? "Creating..." : "Create Batch"}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Tips */}
                <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="text-sm font-medium text-gray-900">Tips</h3>

                    <ul className="mt-3 space-y-2 text-sm text-gray-500">
                        <li>• Enter one URL per line.</li>

                        <li>
                            • URLs must start with{" "}
                            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                                http://
                            </code>{" "}
                            or{" "}
                            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                                https://
                            </code>
                            .
                        </li>

                        <li>
                            • Each URL will be processed independently by the
                            health checker.
                        </li>

                        <li>
                            • Failed checks will be retried according to the
                            configured retry policy.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default page;
