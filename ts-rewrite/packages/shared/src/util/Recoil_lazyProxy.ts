/**
 * TypeScript port of Recoil_lazyProxy.js
 */

'use strict';

export default function lazyProxy<Base extends { [key: string]: any }, Factories extends { [key: string]: () => any }>(
    base: Base,
    factories: Factories,
): Base & { [K in keyof Factories]: ReturnType<Factories[K]> } {
    const proxy = new Proxy(base, {
        get: (target, prop) => {
            if (typeof prop === 'string' && !(prop in target) && prop in factories) {
                target[prop] = factories[prop]();
            }

            return target[prop as any];
        },

        ownKeys: target => {
            for (const lazyProp in factories) {
                if (!(lazyProp in target)) {
                    target[lazyProp] = factories[lazyProp]();
                }
            }
            return Object.keys(target);
        },
    });

    return proxy as Base & { [K in keyof Factories]: ReturnType<Factories[K]> };
} 