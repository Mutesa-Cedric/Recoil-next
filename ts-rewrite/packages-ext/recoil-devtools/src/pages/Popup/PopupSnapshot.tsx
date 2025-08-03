/**
 * TypeScript port of PopupSnapshot.tsx
 * Recoil DevTools browser extension.
 */

import React, { useState } from 'react';
import AtomList from './Snapshot/AtomList';
import SelectorList from './Snapshot/SelectorList';
import SnapshotSearch from './Snapshot/SnapshotSearch';
import SearchContext from './Snapshot/SearchContext';

const styles = {
  container: {
    paddingLeft: 8,
  },
  item: {
    marginBottom: 16,
  },
};

function SnapshotRenderer(): React.ReactNode {
  const [searchVal, setSearchVal] = useState('');

  return (
    <SearchContext.Provider value={{searchVal, setSearchVal}}>
      <div style={styles.container}>
        <SnapshotSearch />
        <AtomList />
        <SelectorList />
      </div>
    </SearchContext.Provider>
  );
}

export default SnapshotRenderer;
