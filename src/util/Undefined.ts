/**
 * Narrows `T` to a value which is not `null` or `undefined`,
 * or throws an error if it is `null` or `undefined`.
 */
export function throwIfNullish<T>(t: T | null | undefined): T {
  if (t === null || t === undefined) {
    throw new Error('Expected non-nullish value!');
  }
  return t;
}
