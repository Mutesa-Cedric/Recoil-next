/**
 * TypeScript port of Recoil_cacheFromPolicy.js
 */

'use strict';

import { CacheImplementation } from './CacheImplementationType';
import {
    CachePolicy,
    EqualityPolicy,
    EvictionPolicy,
} from './CachePolicy';
import { LRUCache } from './LRUCache';
import { MapCache } from './MapCache';
import err from '../../../shared/src/util/Recoil_err';
import nullthrows from '../../../shared/src/util/Recoil_nullthrows';
import stableStringify from '../../../shared/src/util/Recoil_stableStringify';

const defaultPolicy: {
    equality: 'reference';
    eviction: 'keep-all';
    maxSize: number;
} = {
    equality: 'reference',
    eviction: 'keep-all',
    maxSize: Infinity,
};

export default function cacheFromPolicy<K, V>(
    policy: CachePolicy = defaultPolicy as any,
): CacheImplementation<K, V> {
    const {
        equality = defaultPolicy.equality,
    } = policy;
    const eviction = 'eviction' in policy ? policy.eviction : 'keep-all';
    const maxSize = 'maxSize' in policy && policy.eviction === 'lru' ? policy.maxSize : defaultPolicy.maxSize;

    const valueMapper = getValueMapper(equality);
    const cache = getCache<K, V>(eviction, maxSize, valueMapper);

    return cache;
}

function getValueMapper(equality: EqualityPolicy): (key: unknown) => unknown {
    switch (equality) {
        case 'reference':
            return val => val;
        case 'value':
            return val => stableStringify(val);
    }

    throw err(`Unrecognized equality policy ${equality}`);
}

function getCache<K, V>(
    eviction: EvictionPolicy,
    maxSize: number | undefined,
    mapKey: (key: unknown) => unknown,
): CacheImplementation<K, V> {
    switch (eviction) {
        case 'keep-all':
            return new MapCache<K, V>({ mapKey: mapKey as any });
        case 'lru':
            return new LRUCache<K, V>({ mapKey: mapKey as any, maxSize: nullthrows(maxSize) });
        case 'most-recent':
            return new LRUCache<K, V>({ mapKey: mapKey as any, maxSize: 1 });
    }

    throw err(`Unrecognized eviction policy ${eviction}`);
} 