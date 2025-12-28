# Recoil-Next

[![NPM Version](https://img.shields.io/npm/v/recoil-next)](https://www.npmjs.com/package/recoil-next) [![Node.js CI](https://github.com/Mutesa-Cedric/Recoil-next/workflows/Node.js%20CI/badge.svg)](https://github.com/Mutesa-Cedric/Recoil-next/actions) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Mutesa-Cedric/Recoil-next/blob/main/LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

A continuation of the Recoil state management library for React.

The official Recoil project is no longer maintained. This fork provides:

- Active maintenance and bug fixes
- React 18+ compatibility
- Full TypeScript support
- Modern build tooling (Vitest, Rollup, ESLint)

## Installation

```shell
npm install recoil-next
```

Or with pnpm/yarn:

```shell
pnpm add recoil-next
# or
yarn add recoil-next
```

## Quick Start

```tsx
import {atom, selector, useRecoilState, useRecoilValue, RecoilRoot} from 'recoil-next';

// Define an atom
const countState = atom({
  key: 'countState',
  default: 0,
});

// Define a selector
const doubleCountState = selector({
  key: 'doubleCountState',
  get: ({get}) => get(countState) * 2,
});

// Use in components
function Counter() {
  const [count, setCount] = useRecoilState(countState);
  const doubleCount = useRecoilValue(doubleCountState);

  return (
    <div>
      <p>Count: {count}</p>
      <p>Double: {doubleCount}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

// Wrap your app with RecoilRoot
function App() {
  return (
    <RecoilRoot>
      <Counter />
    </RecoilRoot>
  );
}
```

## Migration from Recoil

Replace `recoil` with `recoil-next` in your imports:

```javascript
// Before
import {atom, selector, useRecoilState} from 'recoil';

// After
import {atom, selector, useRecoilState} from 'recoil-next';
```

All APIs remain identical to the original Recoil library.

## Documentation

See the original Recoil documentation: https://recoiljs.org/docs/introduction/core-concepts

## Examples

Check out the [examples](./examples) directory for usage examples.

## Contributing

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

## License

[MIT](./LICENSE)
