/**
 * TypeScript port of RecoilRelay_RecoilRelayEnvironment-test.js
 */

import React, { act } from 'react';
import { useRelayEnvironment } from 'react-relay';
import { atomFamily } from 'recoil';
import { MockPayloadGenerator, createMockEnvironment } from 'relay-test-utils';
import { describe, expect, test } from 'vitest';
import { testFeedbackQuery } from '../__test_utils__/MockQueries';
import { mockRelayEnvironment } from '../__test_utils__/mockRelayEnvironment';
import { ReadsAtom, flushPromisesAndTimers } from '../__test_utils__/TestUtils';
import {
  EnvironmentKey,
  RecoilRelayEnvironmentProvider
} from '../Environments';
import { graphQLQueryEffect } from '../graphQLQueryEffect';
import { graphQLSelectorFamily } from '../graphQLSelectorFamily';

describe('Multiple Environments', () => {
  test('graphQLQueryEffect()', async () => {
    const environmentA = createMockEnvironment();
    const environmentB = createMockEnvironment();
    const envA = new EnvironmentKey('A');
    const envB = new EnvironmentKey('B');

    const myAtoms = atomFamily({
      key: 'graphql multiple environments',
      effects: (id: string) => [
        graphQLQueryEffect({
          environment: id === 'A' ? envA : envB,
          query: testFeedbackQuery,
          variables: { id },
          mapResponse: ({ feedback }: any) => feedback?.seen_count,
        }),
      ],
    });

    function AssertEnvironment({ environment }: { environment: any }) {
      expect(environment).toBe(useRelayEnvironment());
      return null;
    }

    let swapEnvironments: (() => void) | undefined;
    function RegisterRelayEnvironments({ children }: { children: React.ReactNode }) {
      const [changeEnv, setChangeEnv] = React.useState(false);
      swapEnvironments = () => setChangeEnv(true);
      return React.createElement(RecoilRelayEnvironmentProvider, {
        environment: changeEnv ? environmentB : environmentA,
        environmentKey: envA,
        children: React.createElement(RecoilRelayEnvironmentProvider, {
          environment: changeEnv ? environmentA : environmentB,
          environmentKey: envB,
          children,
        }),
      });
    }

    const c = mockRelayEnvironment().renderElements(
      React.createElement(RegisterRelayEnvironments, {
        children: [
          React.createElement(ReadsAtom, { key: 'A', atom: myAtoms('A') }),
          React.createElement(ReadsAtom, { key: 'B', atom: myAtoms('B') }),
          React.createElement(AssertEnvironment, { key: 'assert', environment: environmentA }),
        ],
      })
    );

    await flushPromisesAndTimers();
    expect(c.textContent).toBe('"loading""loading"');

    act(() =>
      environmentA.mock.resolveMostRecentOperation(operation =>
        MockPayloadGenerator.generate(operation, {
          ID: () => operation.request.variables.id,
          Feedback: () => ({ seen_count: 123 }),
        }),
      ),
    );
    act(() =>
      environmentB.mock.resolveMostRecentOperation(operation =>
        MockPayloadGenerator.generate(operation, {
          ID: () => operation.request.variables.id,
          Feedback: () => ({ seen_count: 456 }),
        }),
      ),
    );
    await flushPromisesAndTimers();
    expect(c.textContent).toBe('123456');

    act(() => swapEnvironments?.());
    await flushPromisesAndTimers();
    expect(c.textContent).toBe('456123');
  });

  test('graphQLSelectorFamily()', async () => {
    const environmentA = createMockEnvironment();
    const environmentB = createMockEnvironment();
    const envA = new EnvironmentKey('A');
    const envB = new EnvironmentKey('B');

    const mySelectors = graphQLSelectorFamily({
      key: 'graphql multiple environments selector',
      environment: ({ id }: { id: string }) => (id === 'A' ? envA : envB),
      query: testFeedbackQuery,
      variables: ({ id }: { id: string }) => ({ id }),
      mapResponse: ({ feedback }: any) => feedback?.seen_count,
    });

    function RegisterRelayEnvironments({ children }: { children: React.ReactNode }) {
      const [changeEnv, setChangeEnv] = React.useState(false);
      return React.createElement(RecoilRelayEnvironmentProvider, {
        environment: changeEnv ? environmentB : environmentA,
        environmentKey: envA,
        children: React.createElement(RecoilRelayEnvironmentProvider, {
          environment: changeEnv ? environmentA : environmentB,
          environmentKey: envB,
          children,
        }),
      });
    }

    const c = mockRelayEnvironment().renderElements(
      React.createElement(RegisterRelayEnvironments, {
        children: [
          React.createElement(ReadsAtom, { key: 'A', atom: mySelectors({ id: 'A' }) }),
          React.createElement(ReadsAtom, { key: 'B', atom: mySelectors({ id: 'B' }) }),
        ],
      })
    );

    await flushPromisesAndTimers();
    expect(c.textContent).toBe('"loading""loading"');

    act(() =>
      environmentA.mock.resolveMostRecentOperation(operation =>
        MockPayloadGenerator.generate(operation, {
          ID: () => operation.request.variables.id,
          Feedback: () => ({ seen_count: 123 }),
        }),
      ),
    );
    act(() =>
      environmentB.mock.resolveMostRecentOperation(operation =>
        MockPayloadGenerator.generate(operation, {
          ID: () => operation.request.variables.id,
          Feedback: () => ({ seen_count: 456 }),
        }),
      ),
    );
    await flushPromisesAndTimers();
    expect(c.textContent).toBe('123456');
  });
}); 