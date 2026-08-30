"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateBatch, useUploadCsv } from "@/apis/batch.api";

const page = () => {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [urls, setUrls] = useState("");
    const [error, setError] = useState("");
    const [fileName, setFileName] = useState("");

    const { createBatchMutation, isLoading: isCreating } = useCreateBatch();

    const { uploadCsvMutation, isLoading: isUploading } = useUploadCsv();

    const isLoading = isCreating || isUploading;

    async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];

        if (!file) return;

        setError("");
        setFileName(file.name);

        if (!file.name.toLowerCase().endsWith(".csv")) {
            setError("Please upload a CSV file.");
            return;
        }

        try {
            const result = await uploadCsvMutation(file);

            router.push(`/batches/${result.id}`);
        } catch (error: any) {
            setError(
                error?.response?.data?.message || "Failed to upload CSV file.",
            );
        } finally {
            // Allow selecting the same file again.
            e.target.value = "";
        }
    }

    function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        setError("");

        const parsedUrls = urls
            .split("\n")
            .map((url) => url.trim())
            .filter(Boolean);

        if (parsedUrls.length === 0) {
            setError("Please enter at least one URL.");
            return;
        }

        const invalidUrls = parsedUrls.filter((url) => {
            try {
                const parsed = new URL(url);

                return (
                    parsed.protocol === "http:" || parsed.protocol === "https:"
                );
            } catch {
                return true;
            }
        });

        if (invalidUrls.length > 0) {
            setError(
                `${invalidUrls.length} invalid URL${
                    invalidUrls.length > 1 ? "s" : ""
                }. Please fix them before creating the batch.`,
            );
            return;
        }

        createBatchMutation({ urls: parsedUrls });
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
                        Add URLs manually or upload a CSV file.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h2 className="font-medium text-gray-900">URLs</h2>

                            <p className="mt-1 text-sm text-gray-500">
                                HTTP and HTTPS URLs are supported.
                            </p>
                        </div>

                        <div className="p-6">
                            {/* CSV Upload */}
                            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
                                <div className="text-center">
                                    <h3 className="text-sm font-medium text-gray-900">
                                        Upload CSV
                                    </h3>

                                    <p className="mt-1 text-xs text-gray-500">
                                        Upload a CSV containing the URLs you
                                        want to check.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        disabled={isLoading}
                                        className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isUploading
                                            ? "Uploading..."
                                            : "Choose CSV"}
                                    </button>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,text/csv"
                                        onChange={handleCsvUpload}
                                        disabled={isLoading}
                                        className="hidden"
                                    />

                                    {fileName && (
                                        <p className="mt-3 text-xs text-gray-500">
                                            Selected: {fileName}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="my-6 flex items-center gap-3">
                                <div className="h-px flex-1 bg-gray-200" />

                                <span className="text-xs text-gray-400">
                                    OR ENTER MANUALLY
                                </span>

                                <div className="h-px flex-1 bg-gray-200" />
                            </div>

                            {/* Manual URLs */}
                            <textarea
                                value={urls}
                                onChange={(e) => {
                                    setUrls(e.target.value);
                                    setError("");
                                }}
                                placeholder={`https://example.com
https://github.com
https://google.com`}
                                rows={14}
                                disabled={isLoading}
                                className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                            />

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
                                        isLoading || urls.trim().length === 0
                                    }
                                    className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isCreating
                                        ? "Creating..."
                                        : "Create Batch"}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default page;
