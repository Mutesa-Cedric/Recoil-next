/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Wraps another recoil value and prevents writing to it.
 *
 * @oncall recoil
 */

'use strict';

import { RecoilValue, RecoilValueReadOnly } from '../core/RecoilValue';

function readOnlySelector<T>(atom: RecoilValue<T>): RecoilValueReadOnly<T> {
    return atom as RecoilValueReadOnly<T>;
}

export default readOnlySelector; 