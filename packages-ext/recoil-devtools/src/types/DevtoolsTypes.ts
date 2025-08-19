// TypeScript port of DevtoolsTypes.js

import type {SerializedValue} from '../utils/Serialization';
import type Store from '../utils/Store';
import type {Snapshot} from 'recoil-next';
import {RecoilDevToolsActions} from '../constants/Constants';

export type RecoilSnapshot = Snapshot;

export type SnapshotType = {
  [key: string]: SerializedValue;
};

export type TransactionNodeType = {
  name: string;
  isSubscriber: boolean;
};

export type TransactionType = {
  ts: Date;
  id: number;
  modifiedValues: readonly TransactionNodeType[];
};

export type DependenciesSetType = Set<string>;
export type DependenciesSnapshotType = {[key: string]: DependenciesSetType};
export type NodesSnapshotType = {[key: string]: NodeState};

export type BackgroundPage = {
  store: Store;
};

export type DevToolsOptions = Readonly<{
  name?: string;
  persistenceLimit?: number;
  maxDepth?: number;
  maxItems?: number;
  serializeFn?: (value: any, key: string) => any;
  initialSnapshot?: RecoilSnapshot | null;
  devMode: boolean;
}>;

export type DevToolsConnnectProps = Readonly<
  DevToolsOptions & {
    goToSnapshot: (snapshot: any) => void;
  }
>;

export type RecoilDevToolsActionsType =
  (typeof RecoilDevToolsActions)[keyof typeof RecoilDevToolsActions];

export type PostMessageData = Readonly<{
  source?: string;
  action?: RecoilDevToolsActionsType;
  props?: DevToolsOptions;
  txID?: number;
}>;

export type ValuesMessageType = {
  [key: string]: {
    content: SerializedValue;
    nodeType: NodeTypeValues;
    isSubscriber?: boolean;
    deps: string[];
  };
};

export type BackgroundPostMessage = Readonly<{
  action?: RecoilDevToolsActionsType;
  message?: BackgroundPostMessageContent;
  txID: number;
  chunk?: string;
  isFinalChunk?: boolean;
  data?: {
    initialValues: ValuesMessageType;
    persistenceLimit?: number;
    devMode?: boolean;
  } | null;
}>;

export type BackgroundPostMessageContent = Readonly<{
  modifiedValues?: ValuesMessageType;
}>;

export type Sender = {
  tab: {
    id: number;
  };
  id: number;
};

export type NodeTypeValues = 'selector' | 'atom' | undefined;

// Stable data related to a node
export type Node = {
  type: NodeTypeValues;
};

// Data related to a node that may change per transaction
export type NodeState = {
  updateCount: number;
};
