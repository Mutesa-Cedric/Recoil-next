# Recoil Sync Next &middot; [![NPM Version](https://img.shields.io/npm/v/recoil-sync-next)](https://www.npmjs.com/package/recoil-sync-next) [![Node.js CI](https://github.com/Mutesa-Cedric/Recoil-next/workflows/Node.js%20CI/badge.svg)](https://github.com/Mutesa-Cedric/Recoil-next/actions) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Mutesa-Cedric/Recoil-next/blob/main/LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

The `recoil-sync-next` package provides an add-on library to help synchronize [Recoil Next](https://github.com/Mutesa-Cedric/Recoil-next) state with external systems.

Please see the [**Recoil Sync Documentation**](https://recoiljs.org/docs/recoil-sync/introduction)

In Recoil, simple [asynchronous data queries](https://recoiljs.org/docs/guides/asynchronous-data-queries) can be implemented via selectors or `useEffect()` and [atom effects](https://recoiljs.org/docs/guides/atom-effects) can be used for bi-directional syncing of individual atoms. The `recoil-sync` add-on package provides some additional functionality:

- **Batching Atomic Transactions** - Updates for multiple atoms can be batched together as a single transaction with the external system. This can be important if an atomic transaction is required for consistent state of related atoms.
- **Abstract and Flexible** - This API allows users to specify what atoms to sync separately from describing the mechanism of how to sync. This allows components to use atoms and sync with different systems in different environments without changing their implementation. For example, a component may use atoms that persist to the URL when used in a stand-alone tool while persisting to a custom user database when embedded in another tool.
- **Validation and Backward Compatibility** - When dealing with state from external sources it is important to validate the input. When state is persisted beyond the lifetime of an app it can also be important to consider backward compatibility of previous versions of state. `recoil-sync` and [`refine`](https://recoiljs.org/docs/refine/introduction) help provide this functionality.
- **Complex Mapping of Atoms to External Storage** - There may not be a one-to-one mapping between atoms and external storage items. Atoms may migrate to use newer versions of items, may pull props from multiple items, just a piece of some compound state, or other complex mappings.
- **Sync with React Hooks or Props** - This library enables syncing atoms with React hooks or props that are not accessible from atom effects.

The `recoil-sync` library also provides built-in implementations for external stores, such as [syncing with the browser URL](https://recoiljs.org/docs/recoil-sync/url-persistence).

---

The basic idea is that a [`syncEffect()`](https://recoiljs.org/docs/recoil-sync/sync-effect) can be added to each atom that you wish to sync, and then a [`<RecoilSync/>`](https://recoiljs.org/docs/recoil-sync/api/RecoilSync) is added inside your `<RecoilRoot>` to specify how to sync those atoms. You can use built-in stores such as [`<RecoilURLSyncJSON>`](https://recoiljs.org/docs/recoil-sync/url-persistence), [make your own](https://recoiljs.org/docs/recoil-sync/implement-store), or sync different groups of atoms with different stores.

## Example

### URL Persistence

Here is a simple example [syncing an atom with the browser URL](https://recoiljs.org/docs/recoil-sync/url-persistence):

```jsx
const currentUserState =
  atom <
  number >
  {
    key: 'CurrentUser',
    default: 0,
    effects: [syncEffect({refine: number()})],
  };
```

Then, at the root of your application, simply include `<RecoilURLSyncJSON />` to sync all of those tagged atoms with the URL

```jsx
function MyApp() {
  return (
    <RecoilRoot>
      <RecoilURLSyncJSON location={{part: 'queryParams'}}>
        ...
      </RecoilURLSyncJSON>
    </RecoilRoot>
  );
}
```

That's it! Now this atom will initialize its state based on the URL during initial load, any state mutations will update the URL, and changes in the URL (such as the back button) will update the atom. See more examples in the [Sync Effect](https://recoiljs.org/docs/recoil-sync/sync-effect), [Store Implementation](https://recoiljs.org/docs/recoil-sync/implement-store), and [URL Persistence](https://recoiljs.org/docs/recoil-sync/url-persistence) guides.

## Migration from Recoil Sync

`recoil-sync-next` is a drop-in replacement for the original `recoil-sync` library. You can migrate your existing Recoil Sync project with minimal changes:

### 1. Update your dependencies

Replace `recoil-sync` with `recoil-sync-next` in your `package.json`:

```json
{
  "dependencies": {
    "recoil-sync-next": "^0.2.0"
  }
}
```

### 2. Update your imports

Simply change your import statements from `recoil-sync` to `recoil-sync-next`:

```javascript
// Before
import {syncEffect, RecoilSync, RecoilURLSyncJSON} from 'recoil-sync';

// After
import {syncEffect, RecoilSync, RecoilURLSyncJSON} from 'recoil-sync-next';
```

### 3. That's it!

Your existing Recoil Sync code will work exactly the same. All APIs, behavior, and functionality remain identical to the original Recoil Sync library.

## Installation

Please see the [Recoil Next installation guide](https://github.com/Mutesa-Cedric/Recoil-next#installation) and add `recoil-sync-next` as an additional dependency. `recoil-sync-next` also includes the [`refine`](https://recoiljs.org/docs/refine/introduction) library.

## Contributing

Development of Recoil happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving Recoil.

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

### License

Recoil is [MIT licensed](./LICENSE).
