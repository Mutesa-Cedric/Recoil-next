# Todo Example

A simple todo application demonstrating [recoil-next](https://github.com/Mutesa-Cedric/Recoil-next) state management with React.

## Getting Started

From the repository root:

```bash
# Install dependencies
pnpm install

# Run the example
pnpm --filter todo-example dev
```

Or from the example directory:

```bash
cd examples/todo-example
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

## Features Demonstrated

- Atoms for todo list state
- Selectors for filtered/computed state
- `useRecoilState` for reading and writing state
- `useRecoilValue` for reading state
- `useSetRecoilState` for writing state
