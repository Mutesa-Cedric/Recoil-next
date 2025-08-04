// TypeScript port of EvictableList.js

// TODO: make custom implementation using map for O(1) evictions
class EvictableList<TType> {
  list: Map<number, TType>;
  capacity: number;
  index: number;
  onEvict: ((item: TType) => void) | null;

  constructor(maxCapacity: number = 50, onEvict?: (item: TType) => void) {
    this.list = new Map();
    this.index = 0;
    this.capacity = maxCapacity;
    this.onEvict = onEvict ?? null;
  }

  add(elm: TType) {
    this.list.set(this.index, elm);
    this.index++;
    if (this.index > this.capacity) {
      this.evict();
    }
  }

  evict() {
    const keyToEvict = this.list.keys().next().value;
    if (keyToEvict != null) {
      const onEvict = this.onEvict;
      if (onEvict) {
        const value = this.list.get(keyToEvict);
        if (value !== undefined) {
          onEvict(value);
        }
      }
      this.list.delete(keyToEvict);
    }
  }

  getNextIndex(): number {
    return this.index;
  }

  getLast(): number {
    return this.index - 1;
  }

  getLastValue(): TType | null | undefined {
    return this.index > 0 ? this.get(this.index - 1) : undefined;
  }

  getSize(): number {
    return this.list.size;
  }

  getIterator(): Iterable<TType> {
    return this.list.values();
  }

  getArray(): Array<TType> {
    return Array.from(this.getIterator());
  }

  get(id: number | null | undefined): TType | null | undefined {
    if (id === null || id === undefined) {
      return null;
    }
    return this.list.get(id);
  }

  findFirst(fn: (item: TType) => boolean): TType | null | undefined {
    let l = this.index - this.list.size;
    let r = Math.max(this.index - 1, 0);
    let found: TType | null | undefined = undefined;

    while (l <= r) {
      const mid = Math.floor((l + r) / 2);
      const item = this.get(mid);
      if (item != null && fn(item)) {
        found = this.get(mid);
        r = mid - 1;
      } else {
        l = mid + 1;
      }
    }

    return found;
  }

  findLast(fn: (item: TType) => boolean): TType | null | undefined {
    let l = this.index - this.list.size;
    let r = Math.max(this.index - 1, 0);
    let found: TType | null | undefined = undefined;

    while (l <= r) {
      const mid = Math.floor((l + r) / 2);
      const item = this.get(mid);
      if (item != null && fn(item)) {
        found = this.get(mid);
        l = mid + 1;
      } else {
        r = mid - 1;
      }
    }

    return found;
  }
}

export default EvictableList;
