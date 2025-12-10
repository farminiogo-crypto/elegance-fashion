/**
 * Truncates text to a specified maximum length and adds ellipsis if needed
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number = 50): string {
    if (!text || text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength).trim() + '...';
}

/**
 * Truncates product name to a reasonable display length
 * @param name - Product name to truncate
 * @returns Truncated product name
 */
export function truncateProductName(name: string): string {
    return truncateText(name, 45);
}
