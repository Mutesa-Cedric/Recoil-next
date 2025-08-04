/**
 * TypeScript port of isImmutable.ts
 */

import immutable from 'immutable';

// The version of immutable in www is out of date and doesn't implement
// isImmutable; this can be removed when it is upgraded to v4. For forwards-
// compatibility, use the implementation from the library if it exists:
const isImmutable: (o: object) => boolean =
  (immutable as any).isImmutable ||
  function isImmutable(o: any): boolean {
    return !!(
      o['@@__IMMUTABLE_ITERABLE__@@'] ||
      o['@@__IMMUTABLE_KEYED__@@'] ||
      o['@@__IMMUTABLE_INDEXED__@@'] ||
      o['@@__IMMUTABLE_ORDERED__@@'] ||
      o['@@__IMMUTABLE_RECORD__@@']
    );
  };

export default isImmutable;
