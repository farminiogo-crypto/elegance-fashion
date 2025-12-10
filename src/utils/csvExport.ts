/**
 * Converts an array of objects to CSV format
 * @param data - Array of objects to convert
 * @param headers - Optional custom headers (if not provided, uses object keys)
 * @returns CSV string
 */
export function convertToCSV<T extends Record<string, any>>(
    data: T[],
    headers?: string[]
): string {
    if (data.length === 0) {
        return '';
    }

    // Use provided headers or extract from first object
    const csvHeaders = headers || Object.keys(data[0]);

    // Create header row
    const headerRow = csvHeaders.join(',');

    // Create data rows
    const dataRows = data.map(item => {
        return csvHeaders.map(header => {
            const value = item[header];

            // Handle null/undefined
            if (value === null || value === undefined) {
                return '';
            }

            // Convert to string and escape quotes
            const stringValue = String(value).replace(/"/g, '""');

            // Wrap in quotes if contains comma, newline, or quote
            if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                return `"${stringValue}"`;
            }

            return stringValue;
        }).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
}

/**
 * Downloads a CSV file
 * @param csvContent - CSV content string
 * @param filename - Name of the file to download
 */
export function downloadCSV(csvContent: string, filename: string): void {
    // Create blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
}

/**
 * Exports data as CSV file
 * @param data - Array of objects to export
 * @param filename - Name of the file to download
 * @param headers - Optional custom headers
 */
export function exportToCSV<T extends Record<string, any>>(
    data: T[],
    filename: string,
    headers?: string[]
): void {
    const csvContent = convertToCSV(data, headers);
    downloadCSV(csvContent, filename);
}
