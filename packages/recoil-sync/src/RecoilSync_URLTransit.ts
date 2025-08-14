/**
 * TypeScript port of RecoilSync_URLTransit.js
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { DefaultValue } from 'recoil-next';
import * as transit from 'transit-js';
import err from '../../shared/src/util/Recoil_err';
import expectationViolation from '../../shared/src/util/Recoil_expectationViolation';
import usePrevious from '../../shared/src/util/Recoil_usePrevious';
import type { RecoilURLSyncOptions } from './RecoilSync_URL';
import { RecoilURLSync } from './RecoilSync_URL';

declare const __DEV__: boolean;

export type TransitHandler<T, S> = {
  tag: string;
  class: new (...args: any[]) => T;
  write: (obj: T) => S;
  read: (rep: S) => T;
};

export type RecoilURLSyncTransitOptions = Omit<
  RecoilURLSyncOptions,
  'serialize' | 'deserialize'
> & {
  handlers?: ReadonlyArray<TransitHandler<any, any>>;
};

const BUILTIN_HANDLERS: ReadonlyArray<TransitHandler<any, any>> = [
  {
    tag: 'Date',
    class: Date,
    write: (x: Date) => x.toISOString(),
    read: (str: string) => new Date(str),
  },
  {
    tag: 'Set',
    class: Set,
    write: (x: Set<any>) => Array.from(x),
    read: (arr: any[]) => new Set(arr),
  },
  {
    tag: 'Map',
    class: Map,
    write: (x: Map<any, any>) => Array.from(x.entries()),
    read: (arr: any[]) => new Map(arr),
  },
  {
    tag: '__DV',
    class: DefaultValue,
    write: () => 0, // number encodes the smallest in URL
    read: () => new DefaultValue(),
  },
];

export function RecoilURLSyncTransit({
  handlers: handlersProp,
  ...options
}: RecoilURLSyncTransitOptions): React.ReactNode {
  if (options.location.part === 'href') {
    throw err('"href" location is not supported for Transit encoding');
  }

  const previousHandlers = usePrevious(handlersProp);
  useEffect(() => {
    // Skip __DEV__ check for now to avoid vitest issues
    if (true) {
      if (previousHandlers != null && previousHandlers !== handlersProp) {
        const message = `<RecoilURLSyncTransit> 'handlers' prop was detected to be unstable.
          It is important that this is a stable or memoized array instance.
          Otherwise you may miss URL changes as the listener is re-subscribed.
        `;

        expectationViolation(message);
      }
    }
  }, [previousHandlers, handlersProp]);

  const handlers = useMemo(
    () => [...BUILTIN_HANDLERS, ...(handlersProp ?? [])],
    [handlersProp],
  );

  const writer = useMemo(
    () => {
      const writeHandlers = handlers.map(handler => [
        handler.class,
        transit.makeWriteHandler({
          tag: () => handler.tag,
          rep: handler.write,
          stringRep: function (val: any, h: transit.WriteHandler): string | null {
            throw new Error('Function not implemented.');
          }
        }),
      ]).flat();

      return transit.writer('json', {
        handlers: transit.map(writeHandlers),
      });
    },
    [handlers],
  );
  const serialize = useCallback((x: unknown) => writer.write(x), [writer]);

  const reader = useMemo(
    () =>
      transit.reader('json', {
        handlers: handlers.reduce<Record<string, (rep: any) => any>>(
          (c, { tag, read }) => {
            c[tag] = read;
            return c;
          },
          {},
        ),
        mapBuilder: {
          init: () => ({}),
          add: (ret: any, key: string, val: any) => {
            ret[key] = val;
            return ret;
          },
          finalize: (ret: any) => ret,
        },
      }),
    [handlers],
  );
  const deserialize = useCallback((x: string) => reader.read(x), [reader]);

  return React.createElement(RecoilURLSync, {
    ...options,
    serialize,
    deserialize,
    children: options.children,
  });
} 