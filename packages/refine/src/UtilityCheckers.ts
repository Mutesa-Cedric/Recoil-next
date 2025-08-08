/**
 * TypeScript port of Refine_UtilityCheckers.js
 */

import type { Checker, CheckFailure, CheckResult } from './Checkers';
import { Path, compose, failure, success } from './Checkers';

/**
 * Cast the type of a value after passing a given checker
 *
 * For example:
 *
 * ```javascript
 * import {string, asType} from 'refine';
 *
 * type ID = string & { __brand: 'ID' };
 *
 * const IDChecker: Checker<ID> = asType(string(), s => s as ID);
 * ```
 */
function asType<A, B>(checker: Checker<A>, cast: (value: A) => B): Checker<B> {
  return compose(checker, ({ value, warnings }) =>
    success(cast(value), warnings),
  );
}

function unionFailure(
  message: string,
  path: Path,
  failures: readonly CheckFailure[],
): CheckFailure {
  return failure(
    `${message}: ${failures.map(f => f.message).join(', ')}`,
    path,
  );
}

/**
 * checker which asserts the value matches
 * at least one of the two provided checkers
 */
function or<A, B>(aChecker: Checker<A>, bChecker: Checker<B>): Checker<A | B> {
  return (value: unknown, path = new Path()) => {
    const a = aChecker(value, path);
    if (a.type === 'success') {
      return success(a.value, a.warnings);
    }

    const b = bChecker(value, path);
    if (b.type === 'success') {
      return success(b.value, b.warnings);
    }

    return unionFailure('value did not match either type', path, [a, b]);
  };
}

/**
 * checker which asserts the value matches
 * at least one of the provided checkers
 */
function union<V>(...checkers: readonly Checker<V>[]): Checker<V> {
  return (value: unknown, path = new Path()) => {
    const failures: CheckFailure[] = [];

    for (const checker of checkers) {
      const result = checker(value, path);
      if (result.type === 'success') {
        return success(result.value, result.warnings);
      } else {
        failures.push(result);
      }
    }

    return unionFailure('value did not match any provided type', path, failures);
  };
}

/**
 * checker which asserts the value matches
 * the first of the provided checkers that doesn't fail.
 * Unlike union(), this will pass through values that don't
 * match any of the provided checkers instead of failing.
 */
function match<T>(...checkers: readonly Checker<T>[]): Checker<T> {
  return (value: unknown, path = new Path()) => {
    for (const checker of checkers) {
      const result = checker(value, path);
      if (result.type === 'success') {
        return result;
      }
    }

    // If no checker matches, return the original value with success
    // This behavior matches the original Flow implementation
    return success(value as T, []);
  };
}

/**
 * wraps a given checker, making the valid value nullable
 *
 * By default, a value passed to nullable must match the checker spec exactly
 * when it is not null, or it will fail.
 *
 * passing the `nullWithWarningWhenInvalid` enables gracefully handling invalid
 * values that are less important -- if the provided checker is invalid,
 * the new checker will return null with a warning.
 */
function nullable<T>(
  checker: Checker<T>,
  options?: Readonly<{
    // if this is true, the checker will not fail
    // validation if an invalid value is provided, instead
    // returning null and including a warning as to the invalid type.
    nullWithWarningWhenInvalid?: boolean;
  }>,
): Checker<T | null> {
  const { nullWithWarningWhenInvalid = false } = options ?? {};

  return (value: unknown, parentPath = new Path()): CheckResult<T | null> => {
    if (value === null) {
      return success(value, []);
    }

    const result = checker(value, parentPath);
    if (result.type === 'success') {
      return success(result.value, result.warnings);
    }

    // if this is enabled, "succeed" the checker with a warning
    // if the non-null value does not match expectation
    if (nullWithWarningWhenInvalid) {
      return success(null, [result]);
    }

    const { message, path } = result;
    return failure(message, path);
  };
}

/**
 * wraps a given checker, making the valid value voidable (undefined)
 *
 * By default, a value passed to voidable must match the checker spec exactly
 * when it is not undefined, or it will fail.
 *
 * passing the `undefinedWithWarningWhenInvalid` enables gracefully handling invalid
 * values that are less important -- if the provided checker is invalid,
 * the new checker will return undefined.
 *
 * For example:
 *
 * ```javascript
 * import {voidable, object, string} from 'refine';
 *
 * const Options = object({
 *   // this must be a string, or Options is not valid
 *   filename: string(),
 *
 *   // this must be a string or undefined,
 *   // or Options is not valid
 *   displayName: voidable(string()),
 *
 *   // if this field is not a string,
 *   // it will be undefined and Options will pass the checker
 *   description: voidable(string(), {
 *     undefinedWithWarningWhenInvalid: true,
 *   })
 * })
 *
 * const result = Options({filename: 'test', description: 1});
 *
 * invariant(result.type === 'success');
 * invariant(result.value.description === undefined);
 * invariant(result.warnings.length === 1); // there will be a warning
 * ```
 */
function voidable<T>(
  checker: Checker<T>,
  options?: Readonly<{
    undefinedWithWarningWhenInvalid?: boolean;
  }>,
): Checker<T | undefined> {
  const { undefinedWithWarningWhenInvalid = false } = options ?? {};

  return (value: unknown, parentPath = new Path()): CheckResult<T | undefined> => {
    if (value === undefined) {
      return success(value, []);
    }

    const result = checker(value, parentPath);
    if (result.type === 'success') {
      return success(result.value, result.warnings);
    }

    // if this is enabled, "succeed" the checker with a warning
    // if the non-undefined value does not match expectation
    if (undefinedWithWarningWhenInvalid) {
      return success(undefined, [result]);
    }

    const { message, path } = result;
    return failure(message, path);
  };
}

/**
 * wraps a given checker, providing a default fallback value if the value
 * fails to match the provided checker.
 *
 * For example:
 *
 * ```javascript
 * import {withDefault, object, string} from 'refine';
 *
 * const Config = object({
 *   mode: withDefault(stringLiterals({dev: 'dev', prod: 'prod'}), 'dev')
 * })
 *
 * const result = Config({});
 *
 * invariant(result.type === 'success');
 * invariant(result.value.mode === 'dev');
 * ```
 */
function withDefault<T>(checker: Checker<T>, fallback: T): Checker<T> {
  return (value: unknown, path = new Path()) => {
    const result = checker(value, path);
    if (result.type === 'success') {
      return result;
    }

    return success(fallback, []);
  };
}

/**
 * Adds an additional constraint to a checker. The constraint function should
 * return false when the constraint is violated.
 *
 * For example:
 *
 * ```javascript
 * import {constraint, number} from 'refine';
 *
 * const positive = constraint(number(), n => n > 0, 'must be positive');
 * ```
 */
function constraint<T>(
  checker: Checker<T>,
  constraintFunc: (value: T) => boolean,
  constraintMessage: string = 'constraint violated',
): Checker<T> {
  return compose(checker, ({ value, warnings }, path) => {
    return constraintFunc(value)
      ? success(value, warnings)
      : failure(constraintMessage, path);
  });
}

/**
 * Lazily evaluate a checker function. This is useful for recursive type definitions.
 *
 * For example:
 *
 * ```javascript
 * import {lazy, object, string, array} from 'refine';
 *
 * const TreeNode = lazy(() => object({
 *   value: string(),
 *   children: array(TreeNode)
 * }));
 * ```
 */
function lazy<T>(getChecker: () => Checker<T>): Checker<T> {
  let checker: Checker<T> | null = null;
  return (value: unknown, path?: Path) => {
    if (checker === null) {
      checker = getChecker();
    }
    return checker(value, path);
  };
}

/**
 * create a custom checker function.
 *
 * ```javascript
 * import {custom} from 'refine';
 *
 * const evenNumber = custom(
 *   value => typeof value === 'number' && value % 2 === 0 ? value : null,
 *   'value must be an even number'
 * );
 * ```
 */
function custom<T>(
  checkValue: (value: unknown) => T | null,
  failureMessage: string = 'failed to return non-null from custom checker.',
): Checker<T> {
  return (value: unknown, path = new Path()) => {
    try {
      const checked = checkValue(value);
      return checked != null
        ? success(checked, [])
        : failure(failureMessage, path);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return failure(message, path);
    }
  };
}

export {
  or,
  union,
  match,
  nullable,
  voidable,
  withDefault,
  constraint,
  asType,
  lazy,
  custom,
}; 