/**
 * TypeScript port of PopupComponent.tsx
 * Recoil DevTools browser extension.
 */

import React, { useContext, useEffect, useState } from 'react';
import type {MainTabsType} from '../../constants/Constants';
import ConnectionContext from './ConnectionContext';
import Header from './PopupHeader';
import Main from './PopupMainContent';
import Sidebar from './PopupSidebar';
import { useSelectedTransaction } from './useSelectionHooks';

const styles = {
  app: {
    textAlign: 'center' as const,
    display: 'flex',
    height: '100vh',
    flexDirection: 'column' as const,
    padding: '0',
    boxSizing: 'border-box' as const,
  },
  notFound: {
    marginTop: 16,
  },
  body: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'hidden',
  },
};

type Props = {
  readonly maxTransactionId: number,
};

const PopupComponent = ({maxTransactionId}: Props): React.ReactNode => {
  const connection = useContext(ConnectionContext);

  const [selectedTX, setSelectedTX] = useSelectedTransaction();
  useEffect(() => {
    // when a new transaction is detected and the previous one was selected
    // move to the new transaction
    if (maxTransactionId - 1 === selectedTX) {
      setSelectedTX(maxTransactionId);
    }
  }, [maxTransactionId, selectedTX, setSelectedTX]);

  // when switching connections, move to the last transaction
  useEffect(() => {
    if (connection != null) {
      setSelectedTX(connection.transactions.getLast());
    }
  }, [connection, setSelectedTX]);

  const [selectedMainTab, setSelectedMainTab] = useState<MainTabsType>('Diff');

  if (connection == null) {
    return (
      <div style={styles.app}>
        <div style={styles.notFound}>No Recoil connection found.</div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <Header
        selectedMainTab={selectedMainTab}
        setSelectedMainTab={setSelectedMainTab}
      />
      <div style={styles.body}>
        <Sidebar />
        <Main selectedMainTab={selectedMainTab} />
      </div>
    </div>
  );
};
export default PopupComponent;
