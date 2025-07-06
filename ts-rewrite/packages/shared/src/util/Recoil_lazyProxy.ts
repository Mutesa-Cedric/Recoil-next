/**
 * Return a proxy that lazily defines properties using provided factories.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyProxy<Base extends Record<string, any>, Factories extends Record<string, () => any>>(
    base: Base,
    factories: Factories,
): Base & { [K in keyof Factories]: ReturnType<Factories[K]> } {
    const proxy: any = new Proxy(base, {
        get(target, prop: string) {
            if (!(prop in target) && prop in factories) {
                // Compute and cache
                (target as any)[prop] = factories[prop as keyof Factories]();
            }
            return (target as any)[prop];
        },
        ownKeys(target) {
            // Materialize lazy properties before reporting keys
            for (const lazyProp in factories) {
                // Access to trigger getter side-effect
                // @ts-ignore
                proxy[lazyProp];
            }
            return Reflect.ownKeys(target);
        },
    });

    return proxy as Base & { [K in keyof Factories]: ReturnType<Factories[K]> };
}

export default lazyProxy; 