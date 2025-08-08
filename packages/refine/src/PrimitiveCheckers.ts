/**
 * TypeScript port of Refine_PrimitiveCheckers.js
 */

import type { Checker } from './Checkers';
import { Path, compose, failure, success } from './Checkers';

/**
 * a mixed (i.e. untyped) value
 */
function mixed(): Checker<unknown> {
  return MIXED_CHECKER;
}
const MIXED_CHECKER: Checker<unknown> = (value) => success(value, []);

/**
 * checker to assert if a mixed value matches a literal value
 */
function literal<T extends string | boolean | number | null | undefined>(
  literalValue: T,
): Checker<T> {
  const str = (value: T) => JSON.stringify(value);
  return (value: unknown, path = new Path()) => {
    return value === literalValue
      ? success(literalValue, [])
      : failure(`value is not literal ${str(literalValue) ?? 'undefined'}`, path);
  };
}

/**
 * boolean value checker
 */
function bool(): Checker<boolean> {
  // NOTE boolean is a reserved word so boolean() will not export properly in OSS
  return (value: unknown, path = new Path()) =>
    typeof value === 'boolean'
      ? success(value, [])
      : failure('value is not a boolean', path);
}

/**
 * checker to assert if a mixed value is a number
 */
function number(): Checker<number> {
  return (value: unknown, path = new Path()) =>
    typeof value === 'number'
      ? success(value, [])
      : failure('value is not a number', path);
}

/**
 * Checker to assert if a mixed value is a string.
 *
 * Provide an optional RegExp template to match string against.
 */
function string(regex?: RegExp): Checker<string> {
  return (value: unknown, path = new Path()) => {
    if (typeof value !== 'string') {
      return failure('value is not a string', path);
    }

    if (regex != null && !regex.test(value)) {
      return failure(`value does not match regex: ${regex.toString()}`, path);
    }

    return success(value, []);
  };
}

/**
 * Checker to assert if a mixed value matches a union of string literals.
 * Legal values are provided as key/values in an object and may be translated by
 * providing different values in the object.
 *
 * For example:
 * ```jsx
 * const suitChecker = stringLiterals({
 *   heart: 'heart',
 *   spade: 'spade',
 *   club: 'club',
 *   diamond: 'diamond',
 * });
 *
 * const suit: 'heart' | 'spade' | 'club' | 'diamond' = assertion(suitChecker())(x);
 * ```
 *
 * Strings can also be mapped to new values:
 * ```jsx
 * const placeholderChecker = stringLiterals({
 *   foo: 'spam',
 *   bar: 'eggs',
 * });
 * ```
 *
 * It can be useful to have a single source of truth for your literals.  To
 * only specify them once and use it for both the TypeScript union type and the
 * runtime checker you can use the following pattern:
 * ```jsx
 * const suits = {
 *   heart: 'heart',
 *   spade: 'spade',
 *   club: 'club',
 *   diamond: 'diamond',
 * } as const;
 * type Suit = typeof suits[keyof typeof suits];
 * const suitChecker = stringLiterals(suits);
 * ```
 */
function stringLiterals<T extends Record<string, unknown>>(
  enumValues: T,
): Checker<T[keyof T]> {
  return (value: unknown, path = new Path()) => {
    if (typeof value !== 'string') {
      return failure('value must be a string', path);
    }
    const out = enumValues[value];
    if (out == null) {
      return failure(
        `value is not one of ${Object.keys(enumValues).join(', ')}`,
        path,
      );
    }
    return success(out as T[keyof T], []);
  };
}

/*
 * Checker to assert if a mixed value matches a string | number value of an
 * object. This is useful for non TypeScript enums, in the form of {[string]: string}
 * or {[string]: number}.
 *
 * For example:
 * ```jsx
 * const MyEnum = {foo: 'bar', baz: 'bat'};
 * const enumObjectChecker = enumObject(MyEnum);
 * const value: 'bar' | 'bat' = assertion(enumObjectChecker())(x);
 * ```
 */
function enumObject<T extends Record<string, string> | Record<string, number>>(
  enumObj: T,
): Checker<T[keyof T]> {
  const enumValues = Object.keys(enumObj).reduce(
    (res, key) => Object.assign(res, { [enumObj[key]]: enumObj[key] }),
    {} as Record<string, T[keyof T]>,
  );
  const stringLiteralsChecker = stringLiterals(enumValues);
  return (rawValue: unknown, path = new Path()) => {
    const value = typeof rawValue === 'number' ? rawValue.toString() : rawValue;
    const result = stringLiteralsChecker(value, path);
    if (result.type === 'success' && typeof result.value !== typeof rawValue) {
      return failure('input must be the same type as the enum values', path);
    }
    return result;
  };
}

/**
 * checker to assert if a mixed value is a Date object
 *
 * For example:
 * ```jsx
 * const dateChecker = date();
 *
 * assertion(dateChecker())(new Date());
 * ```
 */
function date(): Checker<Date> {
  return (value: unknown, path = new Path()) => {
    if (!(value instanceof Date)) {
      return failure('value is not a date', path);
    }
    if (isNaN(value.getTime())) {
      return failure('invalid date', path);
    }
    return success(value, []);
  };
}

/**
 * checker to coerce a date string to a Date object.  This is useful for input
 * that was from a JSON encoded `Date` object.
 *
 * For example:
 * ```jsx
 * const jsonDateChecker = coerce(jsonDate({encoding: 'string'}));
 *
 * jsonDateChecker('October 26, 1985');
 * jsonDateChecker('1955-11-05T07:00:00.000Z');
 * jsonDateChecker(JSON.stringify(new Date()));
 * ```
 */
function jsonDate(): Checker<Date> {
  return compose(string(), ({ value, warnings }, path) => {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime())
      ? failure('value is not valid date string', path)
      : success(parsedDate, warnings);
  });
}

export {
  mixed,
  literal,
  bool,
  number,
  string,
  stringLiterals,
  date,
  jsonDate,
  enumObject,
}; 