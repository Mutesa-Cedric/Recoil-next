/**
 * TypeScript port of PopupHeader.tsx
 * Recoil DevTools browser extension.
 */

import type {MainTabsType} from '../../constants/Constants';

import {MainTabs} from '../../constants/Constants';
import Tabs from './Tabs';
import {useFilter} from './useSelectionHooks';
import React from 'react';

const styles = {
  header: {
    display: 'flex',
    borderBottom: '1px solid #ccc',
    minHeight: 36,
    background: '#E9F3FF',
  },
  filterInput: {
    width: '100%',
    height: '100%',
    outline: 'none',
    boxSizing: 'border-box' as const,
    background: 'transparent',
    border: 0,
    paddingLeft: 16,
  },
  sidebar: {
    width: '30%',
    flexShrink: 0,
    flexGrow: 0,
    borderRight: '1px solid #ccc',
  },
  main: {
    flexGrow: 1,
    textAlign: 'left' as const,
    display: 'flex',
  },
};

type Props = {
  readonly selectedMainTab: MainTabsType;
  readonly setSelectedMainTab: (tab: MainTabsType) => void;
};

/**
 * @explorer-desc
 * DevTools Popup Header
 */
function PopupHeader({
  selectedMainTab,
  setSelectedMainTab,
}: Props): React.ReactElement {
  const [filter, setFilter] = useFilter();
  return (
    <header style={styles.header}>
      <div style={styles.sidebar}>
        <input
          style={styles.filterInput}
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      <div style={styles.main}>
        <Tabs
          tabs={MainTabs}
          selected={selectedMainTab}
          onSelect={setSelectedMainTab}
        />
      </div>
    </header>
  );
}

export default PopupHeader;
