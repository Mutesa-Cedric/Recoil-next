// TypeScript port of TXHashtable.js

import EvictableList from './EvictableList';

function nullthrows<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error('Value is null or undefined');
  }
  return value;
}

class TXHashTable<TBaseItem> {
  map: Map<
    string,
    EvictableList<{
      transactionId: number;
      timestamp: number;
      value: TBaseItem;
    }>
  >;
  persistenceLimit: number;

  // TODO: add persistenceLimit and evictions
  constructor(persistenceLimit: number = 50) {
    this.map = new Map();
    this.persistenceLimit = persistenceLimit;
  }

  reset(): void {
    this.map = new Map();
  }

  set(atomName: string, value: TBaseItem | null | undefined, transactionId: number): void {
    if (value == null) {
      return;
    }
    if (!this.map.has(atomName)) {
      this.map.set(
        atomName,
        new EvictableList<{
          transactionId: number;
          timestamp: number;
          value: TBaseItem;
        }>(this.persistenceLimit),
      );
    }
    nullthrows(this.map.get(atomName)).add({
      transactionId,
      timestamp: Date.now(),
      value,
    });
  }

  get(atomName: string, transactionId?: number | null): TBaseItem | undefined {
    const data = this.map.get(atomName);
    if (data == null || data.getSize() === 0) {
      return undefined; // or null?
    }
    const foundItem =
      transactionId == null
        ? data.getLastValue()
        : data.findLast(
            item => item != null && item.transactionId <= (transactionId || 0),
          );

    if (foundItem == null) {
      return undefined;
    }

    return foundItem.value;
  }

  // TODO: memoize
  getSnapshot(transactionId?: number): {[key: string]: TBaseItem} {
    const data: {[key: string]: any} = {};
    for (const atomName of this.map.keys()) {
      const value = this.get(atomName, transactionId);
      if (value !== undefined) {
        data[atomName] = value;
      }
    }
    return data;
  }
}

export default TXHashTable;
