# Refine Next &middot; [![NPM Version](https://img.shields.io/npm/v/refine-next)](https://www.npmjs.com/package/refine-next) [![Node.js CI](https://github.com/Mutesa-Cedric/Recoil-next/workflows/Node.js%20CI/badge.svg)](https://github.com/Mutesa-Cedric/Recoil-next/actions) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Mutesa-Cedric/Recoil-next/blob/main/LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Refine Next** is a type-refinement / validator combinator library for mixed / unknown values in TypeScript.

Refine Next is currently released as [refine-next](https://www.npmjs.com/package/refine-next) on NPM.

Please see the [**Refine Documentation**](https://recoiljs.org/docs/refine/Introduction). To get started learning about Refine, check out the documentation on the core concepts of [Utilities](https://recoiljs.org/docs/refine/api/Utilities) and [Checkers](https://recoiljs.org/docs/refine/api/Checkers).

## Why would I want to use Refine?

- Refine is useful when your code encounters `unknown` TypeScript type or `mixed` Flow type values and you need to [assert those values have a specific static type](https://recoiljs.org/docs/refine/Introduction#type-refinement-example).
- Refine provides an API for building type-refinement helper functions which can validate that an unknown value conforms to an expected type.
- Refine can validate input values and [upgrade from previous versions](https://recoiljs.org/docs/refine/Introduction#backward-compatible-example).

## Type Refinement Example

Coerce unknown types to a strongly typed variable. [`assertion()`](https://recoiljs.org/docs/refine/api/Utilities#assertion) will throw if the input doesn't match the expected type while [`coercion()`](https://recoiljs.org/docs/refine/api/Utilities#coercion) will return `null`.

```jsx
const myObjectChecker = object({
  numberProperty: number(),
  stringProperty: optional(string()),
  arrayProperty: array(number()),
});

const myObjectAssertion = assertion(myObjectChecker);
const myObject: CheckerReturnType<myObjectChecker> = myObjectAssertion({
  numberProperty: 123,
  stringProperty: 'hello',
  arrayProperty: [1, 2, 3],
});
```

## Backward Compatible Example

Using [`match()`](https://recoiljs.org/docs/refine/api/Advanced_Checkers#match) and [`asType()`](https://recoiljs.org/docs/refine/api/Advanced_Checkers#asType) you can upgrade from previous types to the latest version.

```jsx
const myChecker: Checker<{str: string}> = match(
  object({str: string()}),
  asType(string(), str => ({str: str})),
  asType(number(), num => ({str: String(num)})),
);

const obj1: {str: string} = coercion(myChecker({str: 'hello'}));
const obj2: {str: string} = coercion(myChecker('hello'));
const obj3: {str: string} = coercion(myChecker(123));
```

## JSON Parser Example

Refine wraps `JSON` to provide a built-in strongly typed parser.

```jsx
const myParser = jsonParser(array(object({num: number()})));

const result = myParser('[{"num": 1}, {"num": 2}]');

if (result != null) {
  // we can now access values in num typesafe way
  assert(result[0].num === 1);
} else {
  // value failed to match parser spec
}
```

## Migration from Refine

`refine-next` is a drop-in replacement for the original `@recoiljs/refine` library. You can migrate your existing Refine project with minimal changes:

### 1. Update your dependencies

Replace `@recoiljs/refine` with `refine-next` in your `package.json`:

```json
{
  "dependencies": {
    "refine-next": "^0.2.0"
  }
}
```

### 2. Update your imports

Simply change your import statements from `@recoiljs/refine` to `refine-next`:

```javascript
// Before
import {
  object,
  number,
  string,
  optional,
  array,
  assertion,
  coercion,
} from '@recoiljs/refine';

// After
import {
  object,
  number,
  string,
  optional,
  array,
  assertion,
  coercion,
} from 'refine-next';
```

### 3. That's it!

Your existing Refine code will work exactly the same. All APIs, behavior, and functionality remain identical to the original Refine library.

## Usage in Recoil Sync Next

The **Recoil Sync Next** library leverages **Refine Next** for type refinement, input validation, and upgrading types for backward compatibility. See the [`recoil-sync-next` docs](https://github.com/Mutesa-Cedric/Recoil-next/blob/main/README-recoil-sync.md) for more details.

## Installation

Refine Next is currently bundled as part of the [Recoil Sync Next](https://github.com/Mutesa-Cedric/Recoil-next/blob/main/README-recoil-sync.md) package.

## Contributing

Development of Recoil happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving Recoil.

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

### License

Recoil is [MIT licensed](./LICENSE).
