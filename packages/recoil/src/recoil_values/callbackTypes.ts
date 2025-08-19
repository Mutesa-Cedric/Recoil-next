/**
 * TypeScript port of Recoil_callbackTypes.js
 */

'use strict';

import {DefaultValue} from '../core/Node';
import {RecoilState, RecoilValue} from '../core/RecoilValue';

export type ValueOrUpdater<T> =
  | T
  | DefaultValue
  | ((prevValue: T) => T | DefaultValue);
export type GetRecoilValue = <T>(recoilValue: RecoilValue<T>) => T;
export type SetRecoilState = <T>(
  recoilState: RecoilState<T>,
  valueOrUpdater: ValueOrUpdater<T>,
) => void;
export type ResetRecoilState = <T>(recoilState: RecoilState<T>) => void;
