/**
 * Extract an array of items from an API response that might be:
 *  - a bare array: [...]
 *  - a paginated wrapper: { items: [...], total, limit, offset }
 */
export function extractItems<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object" && "items" in raw) {
    const items = (raw as { items: unknown }).items;
    if (Array.isArray(items)) return items as T[];
  }
  return [];
}
