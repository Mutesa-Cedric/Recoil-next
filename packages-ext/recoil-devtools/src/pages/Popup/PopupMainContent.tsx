/**
 * TypeScript port of PopupMainContent.tsx
 * Recoil DevTools browser extension.
 */

import React, {useContext} from 'react';
import type {MainTabsType} from '../../constants/Constants';
import {MainTabsTitle} from '../../constants/Constants';
import ConnectionContext from './ConnectionContext';
import DependencyGraph from './PopupDependencyGraph';
import Diff from './PopupDiff';
import Snapshot from './PopupSnapshot';

const styles = {
  main: {
    flexGrow: 1,
    textAlign: 'left' as const,
    overflowY: 'hidden' as const,
    height: '100%',
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'stretch',
    backgroundColor: 'white',
    padding: '16px 0',
    boxSizing: 'border-box' as const,
  },

  header: {
    backgroundColor: '#bbb',
    color: 'white',
    flexGrow: 0,
    flexShrink: 0,
    padding: '10px 16px',
  },

  content: {
    padding: '16px 0',
    flexGrow: 1,
    overflowY: 'scroll' as const,
  },
  head: {
    display: 'flex',
    fontWeight: 'bold',
    paddingLeft: 16,
  },
  title: {
    fontWeight: 'bold',
    fontSize: '24px',
    marginRight: 16,
  },
};

type Props = {
  readonly selectedMainTab: MainTabsType;
};

function MainContent({selectedMainTab}: Props): React.ReactNode {
  const connection = useContext(ConnectionContext);
  if (connection == null) {
    return null;
  }
  return (
    <main style={styles.main}>
      <div style={styles.head}>{MainTabsTitle[selectedMainTab]}</div>
      <div style={styles.content}>
        {selectedMainTab === 'Diff' && <Diff />}
        {selectedMainTab === 'State' && <Snapshot />}
        {selectedMainTab === 'Graph' && <DependencyGraph />}
      </div>
    </main>
  );
}

export default MainContent;
