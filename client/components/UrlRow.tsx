import { urlStatusConfig } from "@/app/constants/urlStatusConfig";
import { Url } from "@/types/url";
import { formatDate } from "@/utils/formatDate";
import { formatResponseTime } from "@/utils/formatResponseTime";
import { getHostname } from "@/utils/getHostName";
import { useRouter } from "next/navigation";

const UrlRow = ({ url }: { url: Url }) => {
    const status = urlStatusConfig[url.status];

    const router = useRouter();

    return (
        <tr className="transition hover:bg-gray-50">
            {/* URL */}
            <td className="max-w-75 px-6 py-5">
                <a
                    href={url.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-medium text-gray-900 hover:text-blue-600 hover:underline"
                    title={url.url}
                >
                    {getHostname(url.url)}
                </a>

                <p
                    className="mt-1 truncate text-xs text-gray-400"
                    title={url.url}
                >
                    {url.url}
                </p>
            </td>

            {/* Status */}
            <td className="px-6 py-5">
                <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                >
                    {url.status === "checked" && (
                        <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                    )}

                    {status.label}
                </span>
            </td>

            {/* HTTP Status */}
            <td className="px-6 py-5">
                {url.httpStatus ? (
                    <span
                        className={
                            url.httpStatus >= 200 && url.httpStatus < 300
                                ? "font-medium text-green-600"
                                : "font-medium text-red-600"
                        }
                    >
                        {url.httpStatus}
                    </span>
                ) : (
                    <span className="text-gray-400">—</span>
                )}
            </td>

            {/* Response Time */}
            <td className="px-6 py-5 text-sm text-gray-600">
                {formatResponseTime(url.responseTimeMs)}
            </td>

            {/* Attempts */}
            <td className="px-6 py-5 text-sm text-gray-600">
                {url.attemptCount} / {url.maxAttempts}
            </td>

            {/* Page Title */}
            <td className="max-w-62.5 px-6 py-5">
                {url.pageTitle ? (
                    <p
                        className="truncate text-sm text-gray-700"
                        title={url.pageTitle}
                    >
                        {url.pageTitle}
                    </p>
                ) : url.errorMessage ? (
                    <p
                        className="truncate text-sm text-red-500"
                        title={url.errorMessage}
                    >
                        {url.errorMessage}
                    </p>
                ) : (
                    <span className="text-gray-400">—</span>
                )}
            </td>

            {/* Finished */}
            <td className="whitespace-nowrap px-6 py-5 text-sm text-gray-500">
                {url.finishedAt ? formatDate(url.finishedAt) : "—"}
            </td>

            {/* Action */}
            <td className="px-6 py-5 text-right">
                <button
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => router.push(`/urls/${url.id}`)}
                >
                    View →
                </button>
            </td>
        </tr>
    );
};

export default UrlRow;
