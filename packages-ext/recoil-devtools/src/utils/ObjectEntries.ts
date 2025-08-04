// TypeScript port of ObjectEntries.js

declare const __DEV__: boolean;

/**
 * The return type of Object.entries() in TypeScript is Array<[string, any]>,
 * even if the object's type is stricter.
 *
 * This helper provides a way to carry TypeScript typing through to the result.
 *
 * BEWARE: `Object.entries` coerces numeric keys to strings,
 * so this function does too. E.g., `objectEntries({1: 'lol'})` is
 * equivalent to `[['1', 'lol']]` and NOT `[[1, 'lol']]`. Thus, TypeScript will
 * incorrectly type the return in these cases.
 */
export default function objectEntries<TKey extends string | number | symbol, TValue>(
  obj: Record<TKey, TValue>
): Array<[string, TValue]> {
  if (__DEV__) {
    if (obj instanceof Map) {
      // eslint-disable-next-line fb-www/no-console
      console.error(
        "objectEntries doesn't work on Map instances; use instance.entries() instead",
      );
    }
  }
  return Object.entries(obj) as Array<[string, TValue]>;
}
