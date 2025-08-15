/**
 * TypeScript port of Recoil_errorSelector.js
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