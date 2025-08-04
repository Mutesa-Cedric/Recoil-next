// TypeScript port of Store.js

import type {
  BackgroundPostMessage,
  RecoilDevToolsActionsType,
  ValuesMessageType,
} from '../types/DevtoolsTypes';
import {RecoilDevToolsActions} from '../constants/Constants';
import Connection from './Connection';

class Store {
  connections: Map<number, Connection>;
  connectionIndex: number;
  subscriptions: Set<chrome.runtime.Port>;
  lastConnection: string | null = null;

  constructor() {
    this.connections = new Map();
    this.connectionIndex = 0;
    this.subscriptions = new Set();
  }

  connect(
    connectionId: number,
    displayName: string | null,
    devMode: boolean | null,
    port: chrome.runtime.Port,
    persistenceLimit?: number,
    initialValues?: ValuesMessageType,
  ) {
    this.connections.set(
      connectionId,
      new Connection(
        connectionId,
        port,
        persistenceLimit,
        initialValues,
        displayName,
        devMode,
      ),
    );
    this.connectionIndex++;
    this.trigger(RecoilDevToolsActions.CONNECT, {connectionId});
  }

  disconnect(connectionId: number): void {
    this.connections.delete(connectionId);
    this.trigger(RecoilDevToolsActions.DISCONNECT, {connectionId});
  }

  hasConnection(id: number): boolean {
    return this.connections.has(id);
  }

  getConnection(id: number | null): Connection | null {
    if (id == null) {
      return null;
    }
    return this.connections.get(id) || null;
  }

  getConnectionsArray(): Array<Connection> {
    return Array.from(this.connections.values());
  }

  getNewConnectionIndex(): number {
    return this.connectionIndex;
  }

  getLastConnectionId(): number | null {
    return Array.from(this.connections)[this.connections.size - 1]?.[0] ?? null;
  }

  subscribe(popup: chrome.runtime.Port) {
    if (!this.subscriptions.has(popup)) {
      this.subscriptions.add(popup);
    }
  }

  unsubscribe(popup: chrome.runtime.Port) {
    this.subscriptions.delete(popup);
  }

  processMessage(msg: BackgroundPostMessage, connectionId: number) {
    const connection = this.connections.get(connectionId);

    if (connection == null) {
      return;
    }

    const msgId = connection.processMessage(msg);

    this.trigger(RecoilDevToolsActions.UPDATE_STORE, {connectionId, msgId});
  }

  trigger(
    evt: RecoilDevToolsActionsType,
    data: {connectionId: number; msgId?: number},
  ): void {
    for (const popup of this.subscriptions) {
      popup.postMessage({
        action: evt,
        connectionId: data.connectionId,
        msgId: data.msgId,
      });
    }
  }
}

export default Store;
