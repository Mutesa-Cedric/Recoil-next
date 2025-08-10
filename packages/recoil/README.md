# Recoil Next

A continuation of Facebook's Recoil state management library for React, maintained by the community after Meta discontinued the project.

## Overview

Recoil Next provides state management for React apps. It provides several capabilities that are difficult to achieve with React alone, while being compatible with the newest features of React.

## Key Features

- **Minimal and Reactish**: Recoil works and thinks like React. Add some to your app and get going.
- **Data-Flow Graph**: Derived data and asynchronous queries are tamed with pure functions and efficient subscriptions.
- **Cross-App Observation**: Implement persistence, routing, time-travel debugging, or undo by observing all state changes across your app, without impairing code-splitting.

## Installation

```bash
npm install recoil-next
```

## Quick Start

```jsx
import React from 'react';
import { RecoilRoot, atom, useRecoilState } from 'recoil-next';

const textState = atom({
  key: 'textState',
  default: '',
});

function App() {
  return (
    <RecoilRoot>
      <CharacterCounter />
    </RecoilRoot>
  );
}

function CharacterCounter() {
  const [text, setText] = useRecoilState(textState);

  return (
    <div>
      <input type="text" value={text} onChange={(e) => setText(e.target.value)} />
      <p>Character count: {text.length}</p>
    </div>
  );
}
```

## API Reference

### Core Concepts

- **Atoms**: Units of state that components can subscribe to
- **Selectors**: Pure functions that derive state from atoms or other selectors
- **RecoilRoot**: Provides context for Recoil state

### Hooks

- `useRecoilState(state)` - Returns a tuple of the state value and setter
- `useRecoilValue(state)` - Returns the state value
- `useSetRecoilState(state)` - Returns the state setter function
- `useResetRecoilState(state)` - Returns a function to reset state to default

## Migration from Recoil

This library is a drop-in replacement for the original Recoil library. Simply replace your import:

```jsx
// Before
import { RecoilRoot, atom, useRecoilState } from 'recoil';

// After
import { RecoilRoot, atom, useRecoilState } from 'recoil-next';
```

## Requirements

- React 18.0.0 or later

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Community

This is a community-maintained continuation of the original Recoil project. We aim to maintain compatibility while adding new features and improvements.