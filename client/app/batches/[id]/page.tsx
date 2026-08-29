"use client";

import { useFetchBatch } from "@/apis/batch.api";
import BatchDetails from "@/components/BatchDetails";
import Link from "next/link";
import { useParams } from "next/navigation";

const page = () => {
    const params = useParams<{ id: string }>();

    const { batch, isLoading, error } = useFetchBatch(params.id);

    if (isLoading) {
        return <LoadingState />;
    }

    if (error || !batch) {
        return <ErrorState />;
    }

    return <BatchDetails batch={batch} />;
};

export default page;

function LoadingState() {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-7xl animate-pulse">
                <div className="mb-6 h-5 w-32 rounded bg-gray-200" />

                <div className="mb-6 h-10 w-72 rounded bg-gray-200" />

                <div className="mb-6 h-28 rounded-xl bg-white" />

                <div className="mb-6 grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="h-28 rounded-xl bg-white" />
                    ))}
                </div>

                <div className="h-96 rounded-xl bg-white" />
            </div>
        </div>
    );
}

function ErrorState() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
            <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
                <h2 className="font-semibold text-gray-900">
                    Failed to load batch
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                    The batch could not be found or something went wrong while
                    fetching it.
                </p>

                <Link
                    href="/batches"
                    className="mt-5 inline-block rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                >
                    Back to batches
                </Link>
            </div>
        </div>
    );
}
