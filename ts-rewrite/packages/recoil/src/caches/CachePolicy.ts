/** Cache policy definitions equivalent to Flow version */

export type EqualityPolicy = 'reference' | 'value';
export type EvictionPolicy = 'lru' | 'keep-all' | 'most-recent';

export type CachePolicy =
    | { eviction: 'lru'; maxSize: number; equality?: EqualityPolicy }
    | { eviction: 'keep-all'; equality?: EqualityPolicy }
    | { eviction: 'most-recent'; equality?: EqualityPolicy }
    | { equality: EqualityPolicy };

export type CachePolicyWithoutEviction = { equality: EqualityPolicy }; 