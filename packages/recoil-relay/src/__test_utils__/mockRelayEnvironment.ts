/**
 * TypeScript port of RecoilRelay_mockRelayEnvironment.js
 */

import { snapshot_UNSTABLE } from 'recoil-next';
import { createMockEnvironment } from 'relay-test-utils';
import React from 'react';
import {
  EnvironmentKey,
  RecoilRelayEnvironment,
  registerRecoilSnapshotRelayEnvironment,
} from '../Environments';
import { renderElements as renderRecoilElements } from './TestUtils';

type RelayMockEnvironment = ReturnType<typeof createMockEnvironment>;

interface MockRelayEnvironmentReturn {
  environment: RelayMockEnvironment;
  mockEnvironmentKey: EnvironmentKey;
  renderElements: (elements: React.ReactNode) => HTMLDivElement;
  snapshot: ReturnType<typeof snapshot_UNSTABLE>;
}



export function mockRelayEnvironment(): MockRelayEnvironmentReturn {
  // Create mock environment without auto-resolution
  const environment = createMockEnvironment();
  const mockEnvironmentKey = new EnvironmentKey('Mock');
  
  
  function renderElements(elements: React.ReactNode) {
    return renderRecoilElements(
      React.createElement(RecoilRelayEnvironment, {
        environment,
        environmentKey: mockEnvironmentKey,
        children: elements,
      })
    );
  }
  
  const snapshot = snapshot_UNSTABLE();
  snapshot.retain();
  registerRecoilSnapshotRelayEnvironment(
    snapshot,
    mockEnvironmentKey,
    environment,
  );
  
  return {
    environment,
    mockEnvironmentKey,
    renderElements,
    snapshot,
  };
} 