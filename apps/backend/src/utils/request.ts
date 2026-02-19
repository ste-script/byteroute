/**
 * Normalize a header value that may be a string array (Express multi-value headers).
 * Returns the first value, or undefined if absent.
 */
export function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
