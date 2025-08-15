/**
 * TypeScript port of Recoil_treeCacheFromPolicy.js
 */

'use strict';

import {
    CachePolicy,
    EqualityPolicy,
    EvictionPolicy,
} from './CachePolicy';
import { TreeCacheImplementation } from './TreeCacheImplementationType';

import nullthrows from '../../../shared/src/util/Recoil_nullthrows';
import stableStringify from '../../../shared/src/util/Recoil_stableStringify';
import TreeCache from './TreeCache';
import treeCacheLRU from './treeCacheLRU';

const defaultPolicy: {
    equality: 'reference';
    eviction: 'keep-all';
    maxSize: number;
} = {
    equality: 'reference',
    eviction: 'keep-all',
    maxSize: Infinity,
};

export default function treeCacheFromPolicy<T>(
    policy: CachePolicy = defaultPolicy as any,
    name?: string,
): TreeCacheImplementation<T> {
    const {
        equality = defaultPolicy.equality,
    } = policy;
    const eviction = 'eviction' in policy ? policy.eviction : 'keep-all';
    const maxSize = 'maxSize' in policy && policy.eviction === 'lru' ? policy.maxSize : defaultPolicy.maxSize;

    const valueMapper = getValueMapper(equality);
    return getTreeCache(eviction, maxSize, valueMapper, name);
}

function getValueMapper(equality: EqualityPolicy): (key: unknown) => unknown {
    switch (equality) {
        case 'reference':
            return val => val;
        case 'value':
            return val => stableStringify(val);
    }
}

function getTreeCache<T>(
    eviction: EvictionPolicy,
    maxSize: number | undefined,
    mapNodeValue: (value: unknown) => unknown,
    name?: string,
): TreeCacheImplementation<T> {
    switch (eviction) {
        case 'keep-all':
            return new TreeCache<T>({ name, mapNodeValue });
        case 'lru':
            return treeCacheLRU<T>({
                name,
                maxSize: nullthrows(maxSize),
                mapNodeValue,
            });
        case 'most-recent':
            return treeCacheLRU<T>({ name, maxSize: 1, mapNodeValue });
    }

} 