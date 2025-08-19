/**
 * TypeScript port of Recoil_constSelector.js
 */

'use strict';

import {RecoilValueReadOnly} from '../core/RecoilValue';
import selectorFamily, {Parameter} from './selectorFamily';

const constantSelector = selectorFamily<any, any>({
  key: '__constant',
  get: (constant: any) => () => constant,
  cachePolicyForParams_UNSTABLE: {
    equality: 'reference',
  },
});

function constSelector<T extends Parameter>(
  constant: T,
): RecoilValueReadOnly<T> {
  return constantSelector(constant);
}

export {constSelector};
export default constSelector;
