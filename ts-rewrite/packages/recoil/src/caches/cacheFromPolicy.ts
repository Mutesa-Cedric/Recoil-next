/**
 * Selects an appropriate cache implementation based on a CachePolicy.
 */

import { CacheImplementation } from './CacheImplementationType';
import { CachePolicy, EqualityPolicy, EvictionPolicy } from './CachePolicy';
import LRUCache from './LRUCache';
import MapCache from './MapCache';
import err from 'recoil-shared/util/Recoil_err';
import nullthrows from 'recoil-shared/util/Recoil_nullthrows';
import stableStringify from 'recoil-shared/util/Recoil_stableStringify';

const defaultPolicy = {
    equality: 'reference' as const,
    eviction: 'none' as const,
    maxSize: Infinity,
};

function getValueMapper(equality: EqualityPolicy): (v: unknown) => unknown {
    switch (equality) {
        case 'reference':
            return v => v;
        case 'value':
            return v => stableStringify(v);
    }
    throw err(`Unrecognized equality policy ${equality}`);
}

function getCache<K, V>(
    eviction: EvictionPolicy | 'none',
    maxSize: number | undefined,
    mapKey: (v: unknown) => unknown,
): CacheImplementation<K, V> {
    switch (eviction) {
        case 'keep-all':
            return new MapCache<K, V>({ mapKey });
        case 'lru':
            return new LRUCache<K, V>({ mapKey, maxSize: nullthrows(maxSize) });
        case 'most-recent':
            return new LRUCache<K, V>({ mapKey, maxSize: 1 });
        case 'none':
            return new MapCache<K, V>({ mapKey });
    }
    throw err(`Unrecognized eviction policy ${eviction}`);
}

export default function cacheFromPolicy<K, V>(policy: CachePolicy = defaultPolicy): CacheImplementation<K, V> {
    const { equality = defaultPolicy.equality, eviction = defaultPolicy.eviction, maxSize = defaultPolicy.maxSize } =
        policy as any;
    const mapKey = getValueMapper(equality as EqualityPolicy);
    return getCache(eviction as any, maxSize, mapKey);
} 