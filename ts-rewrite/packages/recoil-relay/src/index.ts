/**
 * TypeScript port of RecoilRelay_index.js
 * Main entry point for recoil-relay package
 */

'use strict';

// Import and re-export everything
import {
    EnvironmentKey,
    RecoilRelayEnvironment,
    RecoilRelayEnvironmentProvider,
    registerRecoilSnapshotRelayEnvironment,
} from './Environments';

import { graphQLMutationEffect } from './graphQLMutationEffect';
import { graphQLQueryEffect } from './graphQLQueryEffect';
import { graphQLSelector } from './graphQLSelector';
import { graphQLSelectorFamily } from './graphQLSelectorFamily';
import { graphQLSubscriptionEffect } from './graphQLSubscriptionEffect';

// Export everything
export {
    EnvironmentKey,
    RecoilRelayEnvironment,
    RecoilRelayEnvironmentProvider,
    registerRecoilSnapshotRelayEnvironment,
    graphQLMutationEffect,
    graphQLQueryEffect,
    graphQLSelector,
    graphQLSelectorFamily,
    graphQLSubscriptionEffect,
}; 