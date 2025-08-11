/**
 * TypeScript port of SearchContext.tsx
 * Recoil DevTools browser extension.
 */

import type {SetterOrUpdater} from 'recoil-next';

import React from 'react';

type SearchContext = {
  searchVal: string,
  setSearchVal: SetterOrUpdater<string>,
};

const context: React.Context<SearchContext> =
  React.createContext<SearchContext>({searchVal: '', setSearchVal: () => {}});

export default context;
