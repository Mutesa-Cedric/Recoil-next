/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @oncall recoil
 */

'use strict';

import { RecoilValueReadOnly } from '../core/RecoilValue';
import { selectorFamily } from './selectorFamily';
import err from '../../../shared/src/util/Recoil_err';

const throwingSelector = selectorFamily<any, any>({
    key: '__error',
    get: (message: string) => () => {
        throw err(message);
    },
    cachePolicyForParams_UNSTABLE: {
        equality: 'reference',
    },
});

function errorSelector<T>(message: string): RecoilValueReadOnly<T> {
    return throwingSelector(message);
}

export { errorSelector };
export default errorSelector; 