/**
 * TypeScript port of Recoil_readOnlySelector.js
 */

'use strict';

import { RecoilValue, RecoilValueReadOnly } from '../core/RecoilValue';

function readOnlySelector<T>(atom: RecoilValue<T>): RecoilValueReadOnly<T> {
    return atom as RecoilValueReadOnly<T>;
}

export { readOnlySelector };
export default readOnlySelector; 