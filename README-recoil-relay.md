# Recoil Relay Next &middot; [![NPM Version](https://img.shields.io/npm/v/recoil-relay-next)](https://www.npmjs.com/package/recoil-relay-next) [![Node.js CI](https://github.com/Mutesa-Cedric/Recoil-next/workflows/Node.js%20CI/badge.svg)](https://github.com/Mutesa-Cedric/Recoil-next/actions) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Mutesa-Cedric/Recoil-next/blob/main/LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

The `recoil-relay-next` library helps [Recoil Next](https://github.com/Mutesa-Cedric/Recoil-next) perform type safe and efficient queries using [GraphQL](https://graphql.org/) with the [Relay](https://relay.dev) library.

Please see the [**Recoil Relay GraphQL Documentation**](https://recoiljs.org/docs/recoil-relay/introduction)

`recoil-relay` provides `graphQLSelector()` and `graphQLSelectorFamily()` selectors which can easily query with GraphQL.  The queries are synced with the Recoil data-flow graph so downstream selectors can derive state from them, they can depend on upstream Recoil state, and they are automatically subscribed to any changes in the graph from Relay.  Everything stays in sync automatically.

## Example
After setting up your Relay environment adding a GraphQL query is as simple as defining a [GraphQL selector](https://recoiljs.org/docs/recoil-relay/graphql-selectors).

```jsx
const userNameQuery = graphQLSelector({
  key: 'UserName',
  environment: myEnvironment,
  query: graphql`
    query UserQuery($id: ID!) {
      user(id: $id) {
        name
      }
    }
  `,
  variables: ({get}) => ({id: get(currentIDAtom)}),
  mapResponse: data => data.user?.name,
});
```
Then use it like any other Recoil [selector](https://recoiljs.org/docs/api-reference/core/selector):
```jsx
function MyComponent() {
  const userName = useRecoilValue(userNameQuery);
  return <span>{userName}</span>;
}
```

## Migration from Recoil Relay

`recoil-relay-next` is a drop-in replacement for the original `recoil-relay` library. You can migrate your existing Recoil Relay project with minimal changes:

### 1. Update your dependencies

Replace `recoil-relay` with `recoil-relay-next` in your `package.json`:

```json
{
  "dependencies": {
    "recoil-relay-next": "^0.2.0"
  }
}
```

### 2. Update your imports

Simply change your import statements from `recoil-relay` to `recoil-relay-next`:

```javascript
// Before
import { graphQLSelector, graphQLSelectorFamily } from 'recoil-relay';

// After
import { graphQLSelector, graphQLSelectorFamily } from 'recoil-relay-next';
```

### 3. That's it!

Your existing Recoil Relay code will work exactly the same. All APIs, behavior, and functionality remain identical to the original Recoil Relay library.

## Installation

Please see the [Recoil Next installation guide](https://github.com/Mutesa-Cedric/Recoil-next#installation) for installing Recoil Next and the [Relay documentation](https://relay.dev/docs/getting-started/installation-and-setup/) for installing and setting up the Relay library, GraphQL compiler, Babel plugin, and ESLint plugin. Then add `recoil-relay-next` as a dependency.

## Contributing

Development of Recoil happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving Recoil.

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

### License

Recoil is [MIT licensed](./LICENSE).
