/**
 * TypeScript port of Refine_index.js
 */

// Type exports
export type { AssertionFunction, CoercionFunction } from './API';
export type { JSONParser } from './JSON';
export type {
  Checker,
  CheckFailure,
  CheckResult,
  CheckSuccess,
  CheckerReturnType,
} from './Checkers';
export type { OptionalPropertyChecker } from './ContainerCheckers';

// Function imports
import { assertion, coercion } from './API';
import { Path } from './Checkers';
import {
  array,
  dict,
  map,
  object,
  optional,
  set,
  tuple,
  writableArray,
  writableDict,
  writableObject,
} from './ContainerCheckers';
import { jsonParser, jsonParserEnforced } from './JSON';
import {
  bool,
  date,
  enumObject,
  jsonDate,
  literal,
  mixed,
  number,
  string,
  stringLiterals,
} from './PrimitiveCheckers';
import {
  asType,
  constraint,
  custom,
  lazy,
  match,
  nullable,
  or,
  union,
  voidable,
  withDefault,
} from './UtilityCheckers';

// Main exports
export {
  // API
  assertion,
  coercion,
  jsonParser,
  jsonParserEnforced,
  Path,

  // Checkers - Primitives
  mixed,
  literal,
  bool,
  number,
  string,
  stringLiterals,
  enumObject,
  date,
  jsonDate,

  // Checkers - Utility
  asType,
  or,
  union,
  match,
  nullable,
  voidable,
  withDefault,
  constraint,
  lazy,
  custom,

  // Checkers - Containers
  array,
  tuple,
  dict,
  object,
  optional,
  set,
  map,
  writableArray,
  writableDict,
  writableObject,
}; 