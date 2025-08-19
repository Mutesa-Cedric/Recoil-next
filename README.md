# Recoil-Next &middot; [![NPM Version](https://img.shields.io/npm/v/recoil-next)](https://www.npmjs.com/package/recoil-next) [![Node.js CI](https://github.com/Mutesa-Cedric/Recoil-next/workflows/Node.js%20CI/badge.svg)](https://github.com/Mutesa-Cedric/Recoil-next/actions) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Mutesa-Cedric/Recoil-next/blob/main/LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Recoil-Next is a **continuation** of the Recoil state management library for React. This project was created because the official Recoil project is no longer being updated or maintained. Since the official Recoil has been discontinued, this fork aims to continue supporting Recoil with:

- **Active maintenance** and ongoing development
- **Modern React 18+ compatibility**
- **Full TypeScript support** with complete type definitions
- **Improved build system** with individual package builds
- **Better developer experience** with enhanced tooling

Website: https://recoiljs.org (Original Recoil documentation)

## Documentation

For the original Recoil documentation, visit: https://recoiljs.org/docs/introduction/core-concepts

**Note**: This is a continuation of Recoil. The original documentation is still relevant for learning Recoil concepts and APIs.

## 🚀 What's New in This Version

This continuation of Recoil includes several improvements:

- **Active Maintenance**: Ongoing development and bug fixes
- **Modern React 18+ Support**: Full compatibility with the latest React versions
- **Complete TypeScript Migration**: All packages are now written in TypeScript with full type safety
- **Individual Package Builds**: Each package can be built independently
- **Modern Tooling**: Uses Vitest for testing, Rollup for building, and modern ESLint/Prettier
- **Self-Sustaining Packages**: Each package has its own build system and can be published independently
- **Enhanced Developer Experience**: Better error messages, improved debugging, and modern development tools

## 📦 Packages

This monorepo contains the following packages:

- **`recoil`** - Core Recoil state management library
- **`recoil-relay`** - GraphQL integration with Relay
- **`recoil-sync`** - External state synchronization
- **`refine-next`** - Type checking and validation utilities
- **`recoil-shared`** - Shared utilities and polyfills

## Installation

The Recoil-Next package lives in [npm](https://www.npmjs.com/get-npm).

To install the latest stable version, run the following command:

```shell
npm install recoil-next
```

Or if you're using [yarn](https://classic.yarnpkg.com/en/docs/install/):

```shell
yarn add recoil-next
```

## Migration from Recoil

Recoil-Next is a drop-in replacement for the original Recoil library. You can migrate your existing Recoil project with minimal changes:

### 1. Update your dependencies

Replace `recoil` with `recoil-next` in your `package.json`:

```json
{
  "dependencies": {
    "recoil-next": "^0.2.0"
  }
}
```

### 2. Update your imports

Simply change your import statements from `recoil` to `recoil-next`:

```javascript
// Before
import {atom, selector, useRecoilState, useRecoilValue} from 'recoil';

// After
import {atom, selector, useRecoilState, useRecoilValue} from 'recoil-next';
```

### 3. That's it!

Your existing Recoil code will work exactly the same. All APIs, behavior, and functionality remain identical to the original Recoil library.

## Contributing

Development of Recoil-Next happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving Recoil-Next.

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

### License

Recoil-Next is [MIT licensed](./LICENSE).
