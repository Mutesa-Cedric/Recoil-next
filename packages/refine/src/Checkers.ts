/**
 * TypeScript port of Refine_Checkers.js
 */

/**
 * the result of failing to match a value to its expected type
 */
export type CheckFailure = Readonly<{
  type: 'failure';
  message: string;
  path: Path;
}>;

/**
 * the result of successfully matching a value to its expected type
 */
export type CheckSuccess<V> = Readonly<{
  type: 'success';
  value: V;
  // if using `nullable` with the `nullWithWarningWhenInvalid` option,
  // failures will be appended here
  warnings: readonly CheckFailure[];
}>;

/**
 * the result of checking whether a type matches an expected value
 */
export type CheckResult<V> = CheckSuccess<V> | CheckFailure;

/**
 * a function which checks if a given mixed value matches a type V,
 * returning the value if it does, otherwise a failure message.
 */
export type Checker<V> = (value: unknown, path?: Path) => CheckResult<V>;

/**
 * utility type to extract TypeScript type matching checker structure
 *
 * ```
 * const check = array(record({a: number()}));
 *
 * // equal to: type MyArray = readonly {a: number}[];
 * type MyArray = CheckerReturnType<typeof check>;
 * ```
 */
export type CheckerReturnType<CheckerFunction extends Checker<any>> =
  CheckerFunction extends Checker<infer T> ? T : never;

/**
 * Path during checker traversal
 */
export class Path {
  parent: Path | null;
  field: string;

  constructor(parent: Path | null = null, field: string = '<root>') {
    this.parent = parent;
    this.field = field;
  }

  // Method to extend path by a field while traversing a container
  extend(field: string): Path {
    return new Path(this, field);
  }

  toString(): string {
    const pieces: string[] = [];
    let current: Path | null = this;

    while (current != null) {
      pieces.push(current.field);
      current = current.parent;
    }

    return pieces.reverse().join('');
  }
}

/**
 * wrap value in an object signifying successful checking
 */
export function success<V>(
  value: V,
  warnings: readonly CheckFailure[] = [],
): CheckSuccess<V> {
  return {type: 'success', value, warnings};
}

/**
 * indicate typecheck failed
 */
export function failure(message: string, path: Path): CheckFailure {
  return {type: 'failure', message, path};
}

/**
 * utility function for composing checkers
 */
export function compose<T, V>(
  checker: Checker<T>,
  next: (success: CheckSuccess<T>, path: Path) => CheckResult<V>,
): Checker<V> {
  return (value: unknown, path = new Path()) => {
    const result = checker(value, path);
    return result.type === 'failure' ? result : next(result, path);
  };
}
