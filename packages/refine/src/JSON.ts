/**
 * TypeScript port of Refine_JSON.js
 */

import type {Checker} from './Checkers';
import {assertion} from './API';

/**
 * function which takes a json string, parses it,
 * and matches it with a checker (returning null if no match)
 */
export type JSONParser<T> = (jsonString: string | null) => T;

/**
 * @param text A valid JSON string or null.
 * @param reviver A function that transforms the results. This function is called for each member of the object.
 * If a member contains nested objects, the nested objects are transformed before the parent object is.
 */
function tryParseJSONMixed(
  text: string | null,
  reviver?: (key: unknown, value: unknown) => unknown,
): unknown {
  if (text == null) {
    return null;
  }
  try {
    return JSON.parse(text, reviver as any);
  } catch {
    return null;
  }
}

/**
 * creates a JSON parser which will error if the resulting value is invalid
 */
function jsonParserEnforced<T>(
  checker: Checker<T>,
  suffix?: string,
): JSONParser<T> {
  const assertedChecker = assertion(checker, suffix ?? 'value is invalid');
  return (rawJSON: string | null) => {
    return assertedChecker(tryParseJSONMixed(rawJSON ?? ''));
  };
}

/**
 * convienience function to wrap a checker in a function
 * for easy JSON string parsing.
 */
function jsonParser<T>(checker: Checker<T>): JSONParser<T | null> {
  return (rawJSON: string | null) => {
    const result = checker(tryParseJSONMixed(rawJSON));
    return result.type === 'success' ? result.value : null;
  };
}

export {jsonParserEnforced, jsonParser};
