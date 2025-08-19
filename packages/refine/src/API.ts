/**
 * TypeScript port of Refine_API.js
 */

import err from '../../shared/src/util/Recoil_err';
import type {Checker, CheckFailure, CheckResult} from './Checkers';

/**
 * function to assert that a given value matches a checker
 */
export type AssertionFunction<V> = (value: unknown) => V;

/**
 * function to coerce a given value to a checker type, returning null if invalid
 */
export type CoercionFunction<V> = (value: unknown) => V | null;

/**
 * helper for raising an error based on a failure
 */
function raiseError(suffix: string, resultFailure?: CheckFailure): never {
  if (resultFailure != null) {
    const path = resultFailure.path.toString();
    const message = resultFailure.message;
    throw err(`[refine.js (path=${path}, message=${message})]: ${suffix}`);
  }

  throw err(`[refine.js (null result)]: ${suffix}`);
}

/**
 * create a function to assert a value matches a checker, throwing otherwise
 *
 * For example,
 *
 * ```
 * const assert = assertion(array(number()));
 * const value: Array<number> = assert([1,2]);
 *
 * try {
 *   // should throw with `Refine.js assertion failed: ...`
 *   const invalid = assert('test');
 * } catch {
 * }
 * ```
 */
function assertion<T>(
  checker: Checker<T>,
  errorMessage: string = 'assertion error',
): AssertionFunction<T> {
  return (value: unknown) => {
    const result = checker(value);
    return result.type === 'success'
      ? result.value
      : raiseError(errorMessage, result);
  };
}

/**
 * create a CoercionFunction given a checker.
 *
 * Allows for null-coercing a value to a given type using a checker. Optionally
 * provide a callback which receives the full check
 * result object (e.g. for logging).
 *
 * Example:
 *
 * ```javascript
 * import {coercion, record, string} from 'refine';
 * import MyLogger from './MyLogger';
 *
 * const Person = record({
 *   name: string(),
 *   hobby: string(),
 * });
 *
 * const coerce = coercion(Person, result => MyLogger.log(result));
 *
 * declare value: mixed;
 *
 * // ?Person
 * const person = coerce(value);
 * ```
 */
function coercion<T>(
  checker: Checker<T>,
  onResult?: (result: CheckResult<T>) => void,
): CoercionFunction<T> {
  return (value: unknown) => {
    const result = checker(value);

    if (onResult != null) {
      onResult(result);
    }

    return result.type === 'success' ? result.value : null;
  };
}

export {assertion, coercion};
