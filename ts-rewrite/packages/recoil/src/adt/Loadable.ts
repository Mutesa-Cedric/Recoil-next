/**
 * TypeScript port of Recoil Loadable abstraction.
 */

import err from 'recoil-shared/util/Recoil_err';
import isPromise from 'recoil-shared/util/Recoil_isPromise';
import nullthrows from 'recoil-shared/util/Recoil_nullthrows';

// Base class defines the required API but leaves implementation to subclasses.
abstract class BaseLoadable<T> {
    abstract readonly state: 'hasValue' | 'hasError' | 'loading';
    abstract readonly contents: unknown;

    abstract getValue(): T;
    abstract toPromise(): Promise<T>;

    valueMaybe(): T | undefined {
        return undefined;
    }
    valueOrThrow(): T {
        throw err(`Loadable expected value, but in \"${(this as any).state}\" state`);
    }

    promiseMaybe(): Promise<T> | undefined {
        return undefined;
    }
    promiseOrThrow(): Promise<T> {
        throw err(`Loadable expected promise, but in \"${(this as any).state}\" state`);
    }

    errorMaybe(): unknown | undefined {
        return undefined;
    }
    errorOrThrow(): unknown {
        throw err(`Loadable expected error, but in \"${(this as any).state}\" state`);
    }

    is(other: Loadable<unknown>): boolean {
        return other.state === this.state && other.contents === this.contents;
    }

    map<S>(fn: (value: T) => S | Loadable<S> | Promise<S>): Loadable<any> {
        throw err('BaseLoadable');
    }
}

class ValueLoadable<T> extends BaseLoadable<T> {
    readonly state = 'hasValue' as const;
    readonly contents: T;
    constructor(value: T) {
        super();
        this.contents = value;
    }

    getValue(): T {
        return this.contents;
    }
    toPromise(): Promise<T> {
        return Promise.resolve(this.contents);
    }
    valueMaybe(): T {
        return this.contents;
    }
    valueOrThrow(): T {
        return this.contents;
    }
    map<S>(fn: (v: T) => S | Promise<S> | Loadable<S>): Loadable<S> {
        try {
            const next = fn(this.contents);
            if (isPromise(next)) {
                return loadableWithPromise(next);
            }
            if (isLoadable(next)) {
                return next as Loadable<S>;
            }
            return loadableWithValue(next as S);
        } catch (e) {
            if (isPromise(e)) {
                // retry once promise resolves
                // @ts-ignore assume promise resolves to retry mapping
                return loadableWithPromise(e.then(() => this.map(fn).contents));
            }
            return loadableWithError(e) as unknown as Loadable<S>;
        }
    }
}

class ErrorLoadable<T> extends BaseLoadable<T> {
    readonly state = 'hasError' as const;
    readonly contents: unknown;
    constructor(error: unknown) {
        super();
        this.contents = error;
    }

    getValue(): T {
        throw this.contents;
    }
    toPromise(): Promise<T> {
        return Promise.reject(this.contents);
    }
    errorMaybe(): unknown {
        return this.contents;
    }
    errorOrThrow(): unknown {
        return this.contents;
    }
    map<S>(): ErrorLoadable<S> {
        return this as unknown as ErrorLoadable<S>; // safe – contents unchanged & always error
    }
}

class LoadingLoadable<T> extends BaseLoadable<T> {
    readonly state = 'loading' as const;
    readonly contents: Promise<T>;
    constructor(promise: Promise<T>) {
        super();
        this.contents = promise;
    }

    getValue(): T {
        throw this.contents;
    }
    toPromise(): Promise<T> {
        return this.contents;
    }
    promiseMaybe(): Promise<T> {
        return this.contents;
    }
    promiseOrThrow(): Promise<T> {
        return this.contents;
    }
    map<S>(fn: (v: T) => S | Promise<S> | Loadable<S>): Loadable<S> {
        const nextPromise: Promise<S> = this.contents
            .then(value => {
                const next = fn(value);
                if (isLoadable(next)) {
                    switch (next.state) {
                        case 'hasValue':
                            return next.contents as S;
                        case 'hasError':
                            throw next.contents;
                        case 'loading':
                            return next.contents;
                    }
                }
                return next;
            })
            .catch(e => {
                if (isPromise(e)) {
                    return e.then(() => this.map(fn).contents as unknown as S);
                }
                throw e;
            });

        return loadableWithPromise(nextPromise);
    }
}

export type Loadable<T> = Readonly<ValueLoadable<T>> | Readonly<ErrorLoadable<T>> | Readonly<LoadingLoadable<T>>;

function loadableWithValue<T>(value: T): Readonly<ValueLoadable<T>> {
    return Object.freeze(new ValueLoadable(value));
}
function loadableWithError<T>(error: unknown): Readonly<ErrorLoadable<T>> {
    return Object.freeze(new ErrorLoadable<T>(error));
}
function loadableWithPromise<T>(promise: Promise<T>): Readonly<LoadingLoadable<T>> {
    return Object.freeze(new LoadingLoadable(promise));
}
function loadableLoading<T>(): Readonly<LoadingLoadable<T>> {
    return Object.freeze(new LoadingLoadable<T>(new Promise(() => { })));
}

// Utilities to work with collections of loadables / promises / raw values
function isLoadable(x: unknown): x is Loadable<unknown> {
    return x instanceof BaseLoadable;
}

type UnwrapLoadables<T> = {
    [K in keyof T]: T[K] extends Loadable<infer R>
    ? R
    : T[K] extends Promise<infer R>
    ? R
    : T[K];
};

function loadableAllArray(inputs: Loadable<unknown>[]): Loadable<unknown[]> {
    if (inputs.every(i => i.state === 'hasValue')) {
        return loadableWithValue(inputs.map(i => (i as ValueLoadable<unknown>).contents));
    }
    if (inputs.some(i => i.state === 'hasError')) {
        const errorLoadable = inputs.find(i => i.state === 'hasError') as ErrorLoadable<unknown> | undefined;
        return loadableWithError(errorLoadable?.contents);
    }
    return loadableWithPromise(Promise.all(inputs.map(i => (i as LoadingLoadable<unknown>).contents)));
}

function loadableAll<T extends readonly (Loadable<any> | Promise<any> | any)[]>(
    inputs: T,
): Loadable<UnwrapLoadables<T>>;
function loadableAll<T extends { [K in keyof T]: Loadable<any> | Promise<any> | any }>(
    inputs: T,
): Loadable<UnwrapLoadables<T>>;
function loadableAll(inputs: any): Loadable<any> {
    const arr = Array.isArray(inputs) ? inputs : Object.values(inputs);
    const normalized = arr.map(x => (isLoadable(x) ? x : isPromise(x) ? loadableWithPromise(x) : loadableWithValue(x)));
    const output = loadableAllArray(normalized);
    if (Array.isArray(inputs)) {
        return output;
    }
    return output.map((results: any[]) => {
        const keys = Object.keys(inputs);
        return keys.reduce((acc, key, idx) => {
            acc[key] = results[idx];
            return acc;
        }, {} as any);
    });
}

export const RecoilLoadable = {
    of<T>(value: T | Promise<T> | Loadable<T>): Loadable<T> {
        if (isPromise(value)) return loadableWithPromise(value);
        if (isLoadable(value)) return value;
        return loadableWithValue(value);
    },
    error: loadableWithError,
    loading: loadableLoading,
    all: loadableAll as any,
    isLoadable,
};

export {
    loadableWithValue,
    loadableWithError,
    loadableWithPromise,
    loadableLoading,
    loadableAll,
    isLoadable,
}; 