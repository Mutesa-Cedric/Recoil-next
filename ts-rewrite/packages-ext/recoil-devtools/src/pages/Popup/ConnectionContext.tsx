/**
 * TypeScript port of ConnectionContext.tsx
 * Recoil DevTools browser extension.
 */

import React from 'react';
import type Connection from '../../utils/Connection';

const ConnectionContext: React.Context<Connection | null | undefined> =
  React.createContext<Connection | null | undefined>(null);

export default ConnectionContext;
