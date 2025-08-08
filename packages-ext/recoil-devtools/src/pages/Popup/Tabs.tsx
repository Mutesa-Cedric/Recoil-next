/**
 * TypeScript port of Tabs.tsx
 * Recoil DevTools browser extension.
 */

import React from 'react';

const styles = {
  tabs: {
    display: 'flex',
  },
  tab: {
    backgroundColor: '#fff',
    padding: '0px 15px',
    display: 'flex',
    height: 36,
    cursor: 'pointer',
    fontSize: '16px',
    alignItems: 'center',
    boxSizing: 'border-box' as const,
    outline: 'none',
    borderRight: '1px solid #ccc',
  },
  tabSelected: {
    backgroundColor: '#1877F2',
    color: 'white',
    fontWeight: 'bold',
  },
};

/**
 * @explorer-desc
 * Selecting options via Tabs
 */
function Tabs<TType extends string>({
  tabs,
  selected,
  onSelect,
}: {
  readonly tabs: readonly TType[];
  readonly selected: TType;
  readonly onSelect: (tab: TType) => void;
}): React.ReactNode {
  return (
    <div style={styles.tabs}>
      {tabs.map((tab, i) => {
        return (
          <span
            key={tab}
            style={{
              ...styles.tab,
              ...(tab === selected ? styles.tabSelected : {}),
            }}
            tabIndex={i}
            role="option"
            aria-selected={tab === selected}
            onClick={() => onSelect(tab)}>
            <span>{tab}</span>
          </span>
        );
      })}
    </div>
  );
}

export default Tabs;
