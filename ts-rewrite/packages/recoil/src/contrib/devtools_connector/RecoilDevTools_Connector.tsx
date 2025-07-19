/**
 * Typescript port of RecoilDevTools_Connector.js
 */

import type { Snapshot } from '../../core/Snapshot';
import {
  useGotoRecoilSnapshot,
  useRecoilSnapshot,
} from '../../hooks/SnapshotHooks';
import React, { useEffect, useRef } from 'react';

type Props = Readonly<{
  name?: string;
  persistenceLimit?: number;
  initialSnapshot?: Snapshot | null;
  devMode?: boolean | null;
  maxDepth?: number;
  maxItems?: number;
  serializeFn?: (value: any, key: string) => any;
}>;

type ConnectProps = Readonly<{
  goToSnapshot: (snapshot: Snapshot) => void;
}> & Props;

function connect(props: ConnectProps): {
  track: (transactionId: number, snapshot: Snapshot) => void;
  disconnect: () => void;
} | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // Type declaration for the global Recoil DevTools extension
  const devToolsExtension = (window as any).__RECOIL_DEVTOOLS_EXTENSION__;
  return devToolsExtension?.connect?.(props) || null;
}

let CONNECTION_INDEX = 0;

/**
 * Recoil Dev Tools Connector
 */
function Connector({
  name = `Recoil Connection ${CONNECTION_INDEX++}`,
  persistenceLimit = 50,
  maxDepth,
  maxItems,
  serializeFn,
  devMode = true,
}: Props): React.ReactElement | null {
  const transactionIdRef = useRef(0);
  const connectionRef = useRef<{
    disconnect: () => void;
    track: (transactionId: number, snapshot: Snapshot) => void;
  } | null>(null);
  const goToSnapshot = useGotoRecoilSnapshot();
  const snapshot = useRecoilSnapshot();
  const release = snapshot.retain();

  useEffect(() => {
    if (connectionRef.current == null) {
      connectionRef.current = connect({
        name,
        persistenceLimit,
        devMode,
        goToSnapshot,
        maxDepth,
        maxItems,
        serializeFn,
      });
    }

    return () => {
      connectionRef.current?.disconnect();
      connectionRef.current = null;
    };
  }, [
    devMode,
    goToSnapshot,
    maxDepth,
    maxItems,
    name,
    persistenceLimit,
    serializeFn,
  ]);

  useEffect(() => {
    try {
      const transactionID = transactionIdRef.current++;
      connectionRef.current?.track?.(transactionID, snapshot);
    } finally {
      release();
    }
  }, [snapshot, release]);

  return null;
}

export default Connector; 