// TypeScript port of Connection.js

import type {
  BackgroundPostMessage,
  DependenciesSetType,
  Node,
  NodeState,
  TransactionType,
  ValuesMessageType,
} from '../types/DevtoolsTypes';
import type {SerializedValue} from './Serialization';
import {RecoilDevToolsActions} from '../constants/Constants';
import {depsHaveChaged} from '../utils/GraphUtils';
import EvictableList from './EvictableList';
import TXHashTable from './TXHashtable';

function nullthrows<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error('Value is null or undefined');
  }
  return value;
}

class Connection {
  id: number;
  displayName: string;
  tree: TXHashTable<SerializedValue>;
  dependencies: TXHashTable<DependenciesSetType>;
  transactions: EvictableList<TransactionType>;
  nodes: Map<string, Node>;
  nodesState: TXHashTable<NodeState>;
  devMode: boolean;
  port: chrome.runtime.Port;

  constructor(
    id: number,
    port: chrome.runtime.Port,
    persistenceLimit: number = 50,
    initialValues?: ValuesMessageType | null,
    displayName?: string | null,
    devMode?: boolean | null,
  ) {
    this.id = nullthrows(id);
    this.displayName = displayName ?? 'Recoil Connection';
    this.tree = new TXHashTable<SerializedValue>(persistenceLimit);
    this.nodesState = new TXHashTable<NodeState>(persistenceLimit);
    this.dependencies = new TXHashTable<DependenciesSetType>(persistenceLimit);
    this.transactions = new EvictableList<TransactionType>(persistenceLimit);
    this.nodes = new Map();
    this.devMode = devMode ?? false;
    this.port = port;

    if (initialValues != null && Object.keys(initialValues).length > 0) {
      this.initializeValues(initialValues);
    }
  }

  initializeValues(values: ValuesMessageType) {
    this.transactions.add({
      modifiedValues: [{name: 'INIT', isSubscriber: false}],
      id: 0,
      ts: new Date(),
    });
    this.persistValues(values, 0);
  }

  processMessage(msg: BackgroundPostMessage, _isInit: boolean = false): number {
    const txID = this.transactions.getNextIndex();
    if (msg.message?.modifiedValues != null) {
      this.transactions.add({
        modifiedValues: Object.keys(msg.message.modifiedValues).map(key => ({
          name: key,
          isSubscriber:
            msg.message?.modifiedValues?.[key].isSubscriber === true,
        })),
        id: txID,
        ts: new Date(),
      });

      this.persistValues(msg.message?.modifiedValues, txID);
    }

    return txID;
  }

  persistValues(values: ValuesMessageType | null, txID: number) {
    if (values == null) {
      return;
    }
    Object.keys(values).forEach((key: string) => {
      const item = values[key];
      this.nodes.set(key, {
        type: item?.nodeType,
      });
      this.tree.set(key, item?.content, txID);
      this.nodesState.set(
        key,
        {
          updateCount: (this.nodesState.get(key)?.updateCount ?? 0) + 1,
        },
        txID,
      );

      const newDeps = new Set(item?.deps ?? []);
      if (depsHaveChaged(this.dependencies.get(key), newDeps)) {
        this.dependencies.set(key, newDeps, txID);
      }
    });
  }

  getNode(name: string | number): Node | undefined {
    return this.nodes.get(String(name));
  }

  goToSnapshot(id: number): void {
    this.port?.postMessage({
      action: RecoilDevToolsActions.GO_TO_SNAPSHOT,
      connectionId: this.id,
      snapshotId: id,
    });
  }
}

export default Connection;
