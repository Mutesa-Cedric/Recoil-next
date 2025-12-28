/**
 * TypeScript port of Recoil_lazyProxy.js
 */

'use strict';

export default function lazyProxy<
  Base extends {[key: string]: any},
  Factories extends {[key: string]: () => any},
>(
  base: Base,
  factories: Factories,
): Base & {[K in keyof Factories]: ReturnType<Factories[K]>} {
  const proxy = new Proxy(base, {
    get: (target, prop) => {
      if (typeof prop === 'string' && !(prop in target) && prop in factories) {
        (target as any)[prop] = factories[prop]();
      }

      return (target as any)[prop];
    },

    ownKeys: target => {
      for (const lazyProp in factories) {
        if (!(lazyProp in target)) {
          (target as any)[lazyProp] = factories[lazyProp]();
        }
      }
      return Object.keys(target);
    },
  });

  return proxy as Base & {[K in keyof Factories]: ReturnType<Factories[K]>};
}
