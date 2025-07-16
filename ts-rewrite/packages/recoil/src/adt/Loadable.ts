/**
 * TypeScript port of Recoil_Loadable.js
 */

'use strict';

import err from '../../../shared/src/util/Recoil_err';
import isPromise from '../../../shared/src/util/Recoil_isPromise';
import nullthrows from '../../../shared/src/util/Recoil_nullthrows';

export abstract class BaseLoadable<T> {
    getValue(): T {
        throw err('BaseLoadable');
    }
    toPromise(): Promise<T> {
        throw err('BaseLoadable');
    }
    valueMaybe(): T | undefined {
        throw err('BaseLoadable');
    }
    valueOrThrow(): T {
        throw err(`Loadable expected value, but in "${(this as any).state}" state`);
    }
    promiseMaybe(): Promise<T> | undefined {
        throw err('BaseLoadable');
    }
    promiseOrThrow(): Promise<T> {
        throw err(`Loadable expected promise, but in "${(this as any).state}" state`);
    }
    errorMaybe(): unknown | undefined {
        throw err('BaseLoadable');
    }
    errorOrThrow(): unknown {
        throw err(`Loadable expected error, but in "${(this as any).state}" state`);
    }

    is(other: Loadable<any>): boolean {
        return (other as any).state === (this as any).state && (other as any).contents === (this as any).contents;
    }
}

export class ValueLoadable<T> extends BaseLoadable<T> {
    state: 'hasValue' = 'hasValue';
    contents: T;

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
    promiseMaybe(): undefined {
        return undefined;
    }
    errorMaybe(): undefined {
        return undefined;
    }
    map<S>(map: (value: T) => Promise<S> | Loadable<S> | S): Loadable<S> {
        try {
            const next = map(this.contents);
            return isPromise(next)
                ? loadableWithPromise(next)
                : isLoadable(next)
                    ? next
                    : loadableWithValue(next);
        } catch (e) {
            return isPromise(e)
                ? loadableWithPromise((e as Promise<any>).then(() => this.map(map).toPromise()) as Promise<S>)
                : loadableWithError(e);
        }
    }
}

export class ErrorLoadable<T> extends BaseLoadable<T> {
    state: 'hasError' = 'hasError';
    contents: unknown;

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
    valueMaybe(): undefined {
        return undefined;
    }
    promiseMaybe(): undefined {
        return undefined;
    }
    errorMaybe(): unknown {
        return this.contents;
    }
    errorOrThrow(): unknown {
        return this.contents;
    }
    map<S>(_map: (value: T) => Promise<S> | Loadable<S> | S): Loadable<S> {
        return this as unknown as Loadable<S>;
    }
}

export class LoadingLoadable<T> extends BaseLoadable<T> {
    state: 'loading' = 'loading';
    contents: Promise<T>;

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
    valueMaybe(): undefined {
        return undefined;
    }
    promiseMaybe(): Promise<T> {
        return this.contents;
    }
    promiseOrThrow(): Promise<T> {
        return this.contents;
    }
    errorMaybe(): undefined {
        return undefined;
    }
    map<S>(
        map: (value: T) => Promise<S> | Loadable<S> | S,
    ): Loadable<S> {
        return loadableWithPromise(
            this.contents
                .then(value => {
                    const next = map(value);
                    if (isLoadable(next)) {
                        const nextLoadable: Loadable<S> = next;
                        switch (nextLoadable.state) {
                            case 'hasValue':
                                return nextLoadable.contents;
                            case 'hasError':
                                throw nextLoadable.contents;
                            case 'loading':
                                return nextLoadable.contents;
                        }
                    }
                    return next;
                })
                .catch(e => {
                    if (isPromise(e)) {
                        return e.then(() => this.map(map).toPromise());
                    }
                    throw e;
                }),
        ) as Loadable<S>;
    }
}

export type Loadable<T> =
    | Readonly<ValueLoadable<T>>
    | Readonly<ErrorLoadable<T>>
    | Readonly<LoadingLoadable<T>>;

export function loadableWithValue<T>(value: T): Readonly<ValueLoadable<T>> {
    return Object.freeze(new ValueLoadable(value));
}

export function loadableWithError<T>(error: unknown): Readonly<ErrorLoadable<T>> {
    return Object.freeze(new ErrorLoadable<T>(error));
}

export function loadableWithPromise<T>(
    promise: Promise<T>,
): Readonly<LoadingLoadable<T>> {
    return Object.freeze(new LoadingLoadable(promise));
}

export function loadableLoading<T>(): Readonly<LoadingLoadable<T>> {
    return Object.freeze(new LoadingLoadable(new Promise(() => { }) as Promise<T>));
}

type UnwrapLoadables<Loadables> = { [K in keyof Loadables]: Loadables[K] extends Loadable<infer V> ? V : never };

function loadableAllArray<Inputs extends ReadonlyArray<Loadable<any>>>(
    inputs: Inputs,
): Loadable<UnwrapLoadables<Inputs>> {
    return inputs.every(i => i.state === 'hasValue')
        ? loadableWithValue(inputs.map(i => i.contents) as any)
        : inputs.some(i => i.state === 'hasError')
            ? loadableWithError(
                nullthrows(
                    inputs.find(i => i.state === 'hasError'),
                    'Invalid loadable passed to loadableAll',
                ).contents,
            )
            : loadableWithPromise(Promise.all(inputs.map(i => i.contents)) as any);
}

export function loadableAll<
    Inputs extends
    | ReadonlyArray<Loadable<any> | Promise<any> | any>
    | Readonly<{ [key: string]: Loadable<any> | Promise<any> | any }>,
>(
    inputs: Inputs,
): Loadable<any> {
    const unwrapedInputs = Array.isArray(inputs)
        ? inputs
        : Object.getOwnPropertyNames(inputs).map(key => (inputs as any)[key]);
    const normalizedInputs = unwrapedInputs.map(x =>
        isLoadable(x)
            ? x
            : isPromise(x)
                ? loadableWithPromise(x)
                : loadableWithValue(x),
    );
    const output = loadableAllArray(normalizedInputs);
    return Array.isArray(inputs)
        ? output
        : output.map(outputs =>
            Object.getOwnPropertyNames(inputs).reduce(
                (out, key, idx) => ({ ...out, [key]: (outputs as any)[idx] }),
                {},
            ),
        );
}

export function isLoadable(x: unknown): x is Loadable<unknown> {
    return x instanceof BaseLoadable;
}

export const RecoilLoadable = {
    of: <T>(value: Promise<T> | Loadable<T> | T): Loadable<T> =>
        isPromise(value)
            ? loadableWithPromise(value)
            : isLoadable(value)
                ? value
                : loadableWithValue(value),
    error: <T>(error: unknown): Readonly<ErrorLoadable<T>> =>
        loadableWithError(error),
    loading: <T>(): Readonly<LoadingLoadable<T>> => loadableLoading<T>(),
    all: loadableAll,
    isLoadable,
}; 