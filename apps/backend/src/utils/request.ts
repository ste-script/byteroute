/**
 * Firsts header value.
 * @param value - The value input.
 * @returns The header value result.
 */

export function firstHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
