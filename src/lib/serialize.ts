/**
 * Serializes an object to JSON, converting BigInt values to strings
 */
export function serializeBigInt<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}
