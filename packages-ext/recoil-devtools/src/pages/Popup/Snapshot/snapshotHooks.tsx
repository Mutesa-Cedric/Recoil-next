/**
 * TypeScript port of snapshotHooks.tsx
 * Recoil DevTools browser extension.
 */

import type {SerializedValue} from '../../../utils/Serialization';

import ConnectionContext from '../ConnectionContext';

import {useSelectedTransaction} from '../useSelectionHooks';

import {useContext, useMemo} from 'react';

export const useAtomsList = (): Array<NodeInfo> | null | undefined => {
  const connection = useContext(ConnectionContext);
  const [txID] = useSelectedTransaction();
  const {snapshot, sortedKeys} = useMemo(() => {
    const localSnapshot = connection?.tree.getSnapshot(txID);
    return {
      snapshot: localSnapshot,
      sortedKeys: Object.keys(localSnapshot ?? {}).sort(),
    };
  }, [connection, txID]);

  const atoms = useMemo(() => {
    const value: NodeInfo[] = [];
    sortedKeys.forEach(key => {
      const node = connection?.getNode(key);
      const content = snapshot?.[key];
      if (node != null && node.type === 'atom' && content != null) {
        value.push({name: key, content});
      }
    });
    return value;
  }, [connection, snapshot, sortedKeys]);

  if (snapshot == null || connection == null) {
    return null;
  }
  return atoms;
};

type NodeInfo = {
  name: string;
  content: SerializedValue;
};

export const useSelectorsList = (): Array<NodeInfo> | null | undefined => {
  const connection = useContext(ConnectionContext);
  const [txID] = useSelectedTransaction();
  const {snapshot, sortedKeys} = useMemo(() => {
    const localSnapshot = connection?.tree.getSnapshot(txID);
    return {
      snapshot: localSnapshot,
      sortedKeys: Object.keys(localSnapshot ?? {}).sort(),
    };
  }, [connection, txID]);

  const selectors = useMemo(() => {
    const value: NodeInfo[] = [];
    sortedKeys.forEach(key => {
      const node = connection?.getNode(key);
      const content = snapshot?.[key];
      if (node != null && node.type === 'selector' && content != null) {
        value.push({name: key, content});
      }
    });
    return value;
  }, [connection, snapshot, sortedKeys]);

  if (snapshot == null || connection == null) {
    return null;
  }
  return selectors;
};
