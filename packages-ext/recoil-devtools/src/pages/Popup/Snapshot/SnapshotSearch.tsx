/**
 * TypeScript port of SnapshotSearch.tsx
 * Recoil DevTools browser extension.
 */

import React, {useCallback, useContext, useRef} from 'react';
import debounce from '../../../utils/debounce';
import SearchContext from './SearchContext';

export default function SnapshotSearch(): React.ReactElement {
  const {searchVal, setSearchVal} = useContext(SearchContext);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    debounce((_e: React.KeyboardEvent<HTMLInputElement>) => {
      setSearchVal(inputRef.current?.value ?? '');
    }, 300),
    [setSearchVal],
  );

  return (
    <div>
      Search: <input ref={inputRef} onKeyDown={handleKeyDown} />
      <br />
      Currently filtering for: {searchVal}
    </div>
  );
}
