/**
 * TypeScript port of Refine_ContainerCheckers.js
 */

import type {Checker, CheckFailure} from './Checkers';
import {Path, compose, failure, success} from './Checkers';

// Check that the provided value is a plain object and not an instance of some
// other container type, built-in, or user class.
function isPlainObject<T extends Record<string, unknown>>(value: T): boolean {
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

/**
 * checker to assert if a mixed value is an array of
 * values determined by a provided checker
 */
function array<V>(valueChecker: Checker<V>): Checker<readonly V[]> {
  return (value: unknown, path = new Path()) => {
    if (!Array.isArray(value)) {
      return failure('value is not an array', path);
    }

    const len = value.length;
    const out = new Array<V>(len);
    const warnings: CheckFailure[] = [];

    for (let i = 0; i < len; i++) {
      const element = value[i];
      const result = valueChecker(element, path.extend(`[${i}]`));
      if (result.type === 'failure') {
        return failure(result.message, result.path);
      }
      out[i] = result.value;
      if (result.warnings.length !== 0) {
        warnings.push(...result.warnings);
      }
    }

    return success(out, warnings);
  };
}

/**
 * checker to assert if a mixed value is a tuple of
 * fixed values based on an array of checker functions.
 */
function tuple<Checkers extends readonly Checker<any>[]>(
  checkers: Checkers,
): Checker<{
  readonly [K in keyof Checkers]: Checkers[K] extends Checker<infer T>
    ? T
    : never;
}> {
  return (value: unknown, path = new Path()) => {
    if (!Array.isArray(value)) {
      return failure('value is not an array', path);
    }

    if (value.length !== checkers.length) {
      return failure(
        `tuple must have exactly ${checkers.length} elements but got ${value.length}`,
        path,
      );
    }

    const out = new Array(checkers.length);
    const warnings: CheckFailure[] = [];

    for (let i = 0; i < checkers.length; i++) {
      const checker = checkers[i];
      const element = value[i];
      const result = checker(element, path.extend(`[${i}]`));
      if (result.type === 'failure') {
        return failure(result.message, result.path);
      }
      out[i] = result.value;
      if (result.warnings.length !== 0) {
        warnings.push(...result.warnings);
      }
    }

    return success(out as any, warnings);
  };
}

/**
 * checker to assert if a mixed value is a {[string]: V}
 * with value types determined by a provided checker
 */
function dict<V>(
  valueChecker: Checker<V>,
): Checker<Readonly<Record<string, V>>> {
  return (value: unknown, path = new Path()) => {
    if (
      typeof value !== 'object' ||
      value === null ||
      !isPlainObject(value as Record<string, unknown>)
    ) {
      return failure('value is not an object', path);
    }

    const obj = value as Record<string, unknown>;
    const out: Record<string, V> = {};
    const warnings: CheckFailure[] = [];

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const element = obj[key];
        const result = valueChecker(element, path.extend(`.${key}`));
        if (result.type === 'failure') {
          return failure(result.message, result.path);
        }
        out[key] = result.value;
        if (result.warnings.length !== 0) {
          warnings.push(...result.warnings);
        }
      }
    }

    return success(out, warnings);
  };
}

// OptionalProperty class for marking optional properties
export class OptionalProperty<T> {
  readonly checker: Checker<T>;
  constructor(checker: Checker<T>) {
    this.checker = checker;
  }
}

// Type alias for optional property checkers
export type OptionalPropertyChecker<T> = OptionalProperty<T>;

/**
 * checker which can only be used with `object` or `writableObject`. Marks a
 * field as optional, skipping the key in the result if it doesn't
 * exist in the input.
 *
 * @example
 * ```jsx
 * import {object, string, optional} from 'refine';
 *
 * const checker = object({a: string(), b: optional(string())});
 * assert(checker({a: 1}).type === 'success');
 * ```
 */
function optional<T>(
  checker: Checker<T>,
): OptionalPropertyChecker<T | undefined> {
  return new OptionalProperty<T | undefined>(
    (value: unknown, path = new Path()) => {
      const result = checker(value, path);
      if (result.type === 'failure') {
        return {
          ...result,
          message: '(optional property) ' + result.message,
        };
      } else {
        return result;
      }
    },
  );
}

// Helper type to extract the type from a checker or optional checker
type ExtractCheckerType<T> =
  T extends Checker<infer U>
    ? U
    : T extends OptionalPropertyChecker<infer U>
      ? U
      : never;

// Helper type to make optional properties optional in the result type
type MakeOptional<T> = {
  [K in keyof T as T[K] extends OptionalPropertyChecker<any>
    ? never
    : K]: ExtractCheckerType<T[K]>;
} & {
  [K in keyof T as T[K] extends OptionalPropertyChecker<any>
    ? K
    : never]?: ExtractCheckerType<T[K]>;
};

/**
 * checker to assert if a mixed value is a fixed-property object,
 * with key-value pairs determined by a provided object of checkers.
 * Any extra properties in the input object values are ignored.
 * Class instances are not supported, use the custom() checker for those.
 *
 * Example:
 * ```jsx
 * const myObject = object({
 *   name: string(),
 *   job: object({
 *     years: number(),
 *     title: string(),
 *   }),
 * });
 * ```
 *
 * Properties can be optional using `optional()`:
 * ```jsx
 * const customer = object({
 *   name: string(),
 *   reference: optional(string()),
 * });
 * ```
 */
function object<
  Checkers extends Readonly<
    Record<string, Checker<any> | OptionalPropertyChecker<any>>
  >,
>(checkers: Checkers): Checker<Readonly<MakeOptional<Checkers>>> {
  const checkerProperties: readonly string[] = Object.keys(checkers);

  return (value: unknown, path = new Path()) => {
    if (
      typeof value !== 'object' ||
      value === null ||
      !isPlainObject(value as Record<string, unknown>)
    ) {
      return failure('value is not an object', path);
    }

    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const warnings: CheckFailure[] = [];

    for (const key of checkerProperties) {
      const provided: Checker<any> | OptionalProperty<any> = checkers[key];

      let check: Checker<any>;
      let element: unknown;
      if (provided instanceof OptionalProperty) {
        check = provided.checker;
        if (!obj.hasOwnProperty(key)) {
          continue;
        }
        element = obj[key];
      } else {
        check = provided;
        element = obj.hasOwnProperty(key) ? obj[key] : undefined;
      }

      const result = check(element, path.extend(`.${key}`));

      if (result.type === 'failure') {
        return failure(result.message, result.path);
      }

      out[key] = result.value;
      if (result.warnings.length !== 0) {
        warnings.push(...result.warnings);
      }
    }

    return success(out as any, warnings);
  };
}

/**
 * checker to assert if a mixed value is a Set of
 * values determined by a provided checker
 */
function set<T>(checker: Checker<T>): Checker<ReadonlySet<T>> {
  return (value: unknown, path = new Path()) => {
    if (!(value instanceof Set)) {
      return failure('value is not a Set', path);
    }

    const out = new Set<T>();
    const warnings: CheckFailure[] = [];
    let index = 0;

    for (const element of value) {
      const result = checker(element, path.extend(`[${index}]`));
      if (result.type === 'failure') {
        return failure(result.message, result.path);
      }
      out.add(result.value);
      if (result.warnings.length !== 0) {
        warnings.push(...result.warnings);
      }
      index++;
    }

    return success(out, warnings);
  };
}

/**
 * checker to assert if a mixed value is a Map with
 * key/value types determined by provided checkers
 */
function map<K, V>(
  keyChecker: Checker<K>,
  valueChecker: Checker<V>,
): Checker<ReadonlyMap<K, V>> {
  return (value: unknown, path = new Path()) => {
    if (!(value instanceof Map)) {
      return failure('value is not a Map', path);
    }

    const out = new Map<K, V>();
    const warnings: CheckFailure[] = [];
    let index = 0;

    for (const [entryKey, entryValue] of value) {
      const keyResult = keyChecker(entryKey, path.extend(`[${index}].key`));
      if (keyResult.type === 'failure') {
        return failure(keyResult.message, keyResult.path);
      }

      const valueResult = valueChecker(
        entryValue,
        path.extend(`[${index}].value`),
      );
      if (valueResult.type === 'failure') {
        return failure(valueResult.message, valueResult.path);
      }

      out.set(keyResult.value, valueResult.value);
      if (keyResult.warnings.length !== 0) {
        warnings.push(...keyResult.warnings);
      }
      if (valueResult.warnings.length !== 0) {
        warnings.push(...valueResult.warnings);
      }
      index++;
    }

    return success(out, warnings);
  };
}

/**
 * checker to assert if a mixed value is a mutable array of
 * values determined by a provided checker
 */
function writableArray<V>(valueChecker: Checker<V>): Checker<V[]> {
  return compose(array(valueChecker), ({value, warnings}) =>
    success([...value], warnings),
  );
}

/**
 * checker to assert if a mixed value is a mutable {[string]: V}
 * with value types determined by a provided checker
 */
function writableDict<V>(valueChecker: Checker<V>): Checker<Record<string, V>> {
  return compose(dict(valueChecker), ({value, warnings}) =>
    success({...value}, warnings),
  );
}

/**
 * Like `object()` but returns a mutable object
 */
function writableObject<
  Checkers extends Readonly<
    Record<string, Checker<any> | OptionalPropertyChecker<any>>
  >,
>(checkers: Checkers): Checker<MakeOptional<Checkers>> {
  return compose(object(checkers), ({value, warnings}) =>
    success({...value} as any, warnings),
  );
}

export {
  array,
  tuple,
  dict,
  optional,
  object,
  set,
  map,
  writableArray,
  writableDict,
  writableObject,
};
