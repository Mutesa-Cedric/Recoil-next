/**
 * TypeScript port of RecoilRelay_Environments.js
 */

'use strict';

import React, {useEffect, ReactNode} from 'react';
import {useRecoilStoreID, Snapshot, StoreID} from 'recoil-next';
import {RelayEnvironmentProvider} from 'react-relay';
import {IEnvironment} from 'relay-runtime';
import err from '../../shared/src/util/Recoil_err';

export class EnvironmentKey {
  private _name: string;

  constructor(name: string) {
    this._name = name;
  }

  toJSON(): string {
    return this._name;
  }
}

const environmentStore: Map<
  StoreID,
  Map<EnvironmentKey, IEnvironment>
> = new Map();
const cleanupHandlers: Map<
  StoreID,
  Map<EnvironmentKey, NodeJS.Timeout>
> = new Map();

function registerRelayEnvironment(
  storeID: StoreID,
  environment: IEnvironment,
  environmentKey: EnvironmentKey,
): () => void {
  if (!environmentStore.has(storeID)) {
    environmentStore.set(storeID, new Map());
  }
  const previousEnvironment = environmentStore
    .get(storeID)
    ?.get(environmentKey);
  if (previousEnvironment != null && previousEnvironment !== environment) {
    throw err(
      `A consistent Relay environment should be used with the same Recoil store and EnvironmentKey "${environmentKey.toJSON()}"`,
    );
  }
  environmentStore.get(storeID)?.set(environmentKey, environment);

  // Cleanup registered Relay Environments when they are no longer used to
  // avoid memory leaks.
  const pendingCleanup = cleanupHandlers.get(storeID)?.get(environmentKey);
  if (pendingCleanup != null) {
    clearTimeout(pendingCleanup);
    cleanupHandlers.get(storeID)?.delete(environmentKey);
  }
  return () => {
    const cleanupHandle = setTimeout(() => {
      environmentStore.get(storeID)?.delete(environmentKey);
    }, 0);
    const oldHandler = cleanupHandlers.get(storeID)?.get(environmentKey);
    if (oldHandler != null) {
      clearTimeout(oldHandler);
    }
    if (!cleanupHandlers.has(storeID)) {
      cleanupHandlers.set(storeID, new Map());
    }
    cleanupHandlers.get(storeID)?.set(environmentKey, cleanupHandle);
  };
}

interface RecoilRelayEnvironmentProps {
  environmentKey: EnvironmentKey;
  environment: IEnvironment;
  children: ReactNode;
}

/**
 * Associates a RelayEnvironment with an EnvironmentKey for this <RecoilRoot>.
 */
export function RecoilRelayEnvironment({
  environmentKey,
  environment,
  children,
}: RecoilRelayEnvironmentProps): React.ReactElement {
  const storeID = useRecoilStoreID();
  registerRelayEnvironment(storeID, environment, environmentKey);

  // Cleanup to avoid leaking retaining Relay Environments.
  useEffect(
    () => registerRelayEnvironment(storeID, environment, environmentKey),
    [storeID, environment, environmentKey],
  );

  return <>{children}</>;
}

interface RecoilRelayEnvironmentProviderProps {
  environmentKey: EnvironmentKey;
  environment: IEnvironment;
  children: ReactNode;
}

/**
 * A provider which sets up the Relay environment for its children and
 * registers that environment for any Recoil atoms or selectors using that
 * environmentKey.
 *
 * This is basically a wrapper around both <RelayEnvironmentProvider> and
 * <RecoilRelayEnvironment>.
 */
export function RecoilRelayEnvironmentProvider({
  environmentKey,
  environment,
  children,
}: RecoilRelayEnvironmentProviderProps): React.ReactElement {
  return (
    <RecoilRelayEnvironment
      environmentKey={environmentKey}
      environment={environment}>
      <RelayEnvironmentProvider environment={environment}>
        {children}
      </RelayEnvironmentProvider>
    </RecoilRelayEnvironment>
  );
}

export function registerRecoilSnapshotRelayEnvironment(
  snapshot: Snapshot,
  environmentKey: EnvironmentKey,
  environment: IEnvironment,
): () => void {
  // Access storeID through snapshot internals - this is a workaround since
  // getStoreID() doesn't exist in the TypeScript types
  const storeID = (snapshot as any).getStoreID();
  return registerRelayEnvironment(storeID, environment, environmentKey);
}

export function getRelayEnvironment(
  environmentOpt: IEnvironment | EnvironmentKey,
  storeID: StoreID,
  parentStoreID?: StoreID,
): IEnvironment {
  let environment: IEnvironment;

  if (environmentOpt instanceof EnvironmentKey) {
    const retrievedEnvironment =
      environmentStore.get(storeID)?.get(environmentOpt) ??
      (parentStoreID != null
        ? environmentStore.get(parentStoreID)?.get(environmentOpt)
        : null);
    if (retrievedEnvironment == null) {
      throw err(
        `<RecoilRelayEnvironment> must be used at the top of your <RecoilRoot> with the same EnvironmentKey "${environmentOpt.toJSON()}" to register the Relay environment.`,
      );
    }
    environment = retrievedEnvironment;
  } else {
    environment = environmentOpt;
  }
  return environment;
}
