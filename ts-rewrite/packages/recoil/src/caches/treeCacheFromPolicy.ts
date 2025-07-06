/**
 * Picks a tree cache implementation based on cache policy.
 */

import { CachePolicy, EqualityPolicy, EvictionPolicy } from './CachePolicy';
import type { TreeCacheImplementation } from './TreeCacheImplementationType';
import TreeCache from './TreeCache';
import treeCacheLRU from './treeCacheLRU';
import err from 'recoil-shared/util/Recoil_err';
import nullthrows from 'recoil-shared/util/Recoil_nullthrows';
import stableStringify from 'recoil-shared/util/Recoil_stableStringify';

const defaultPolicy = { equality: 'reference' as const, eviction: 'keep-all' as const, maxSize: Infinity };

function valueMapper(equality: EqualityPolicy): (v: unknown) => unknown {
    return equality === 'value' ? v => stableStringify(v) : v => v;
}

export default function treeCacheFromPolicy<T>(policy: CachePolicy = defaultPolicy, name?: string): TreeCacheImplementation<T> {
    const { equality = defaultPolicy.equality, eviction = defaultPolicy.eviction, maxSize = defaultPolicy.maxSize } =
        policy as any;
    const mapNodeValue = valueMapper(equality as EqualityPolicy);
    switch (eviction as EvictionPolicy) {
        case 'keep-all':
            return new TreeCache<T>({ name, mapNodeValue });
        case 'lru':
            return treeCacheLRU<T>({ name, mapNodeValue, maxSize: nullthrows(maxSize) });
        case 'most-recent':
            return treeCacheLRU<T>({ name, mapNodeValue, maxSize: 1 });
    }
    throw err(`Unrecognized eviction policy ${eviction}`);
} 