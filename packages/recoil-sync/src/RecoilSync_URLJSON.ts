/**
 * TypeScript port of RecoilSync_URLJSON.js
 */

import type {RecoilURLSyncOptions} from './RecoilSync_URL';
import React, {useCallback} from 'react';
import {RecoilURLSync} from './RecoilSync_URL';
import err from '../../shared/src/util/Recoil_err';
import nullthrows from '../../shared/src/util/Recoil_nullthrows';

export type RecoilURLSyncJSONOptions = Omit<
  RecoilURLSyncOptions,
  'serialize' | 'deserialize'
>;

export function RecoilURLSyncJSON(
  options: RecoilURLSyncJSONOptions,
): React.ReactNode {
  if (options.location.part === 'href') {
    throw err('"href" location is not supported for JSON encoding');
  }

  const serialize = useCallback(
    (x: unknown) =>
      x === undefined
        ? ''
        : nullthrows(JSON.stringify(x), 'Unable to serialize state with JSON'),
    [],
  );

  const deserialize = useCallback((x: string) => JSON.parse(x), []);

  return React.createElement(RecoilURLSync, {
    ...options,
    serialize,
    deserialize,
    children: options.children,
  });
}
