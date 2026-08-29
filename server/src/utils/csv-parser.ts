import { parse } from "csv-parse/sync";

export function parseCsvUrls(csvContent: string): string[] {
    const rows = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
    });

    return rows.map((row: any) => row.url);
}
