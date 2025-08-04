/**
 * TypeScript port of PopupSidebar.tsx
 * Recoil DevTools browser extension.
 */

import React, { useContext, useMemo } from 'react';
import type {TransactionType} from '../../types/DevtoolsTypes';
import ConnectionContext from './ConnectionContext';
import Transaction from './PopupSidebarTransaction';
import {useSelectedTransaction, useFilter} from './useSelectionHooks';
const styles = {
  sidebar: {
    backgroundColor: 'white',
    overflowY: 'scroll' as const,
    height: '100%',
    maxHeight: '100%',
    textAlign: 'center' as const,
    width: '30%',
    borderRight: '1px solid #ccc',
    flexShrink: 0,
  },
};

/**
 * @explorer-desc
 * DevTools Popup Sidebar
 */
function Sidebar(): React.ReactElement {
  const connection = useContext(ConnectionContext);
  const [selected, setSelected] = useSelectedTransaction();
  const [filter] = useFilter();
  const allTransactions: Array<TransactionType> | null | undefined =
    connection?.transactions?.getArray();
  const transactions = useMemo(() => {
    if (allTransactions == null) {
      return [];
    }
    return filter !== ''
      ? allTransactions.filter(tx =>
          tx.modifiedValues.some(
            node =>
              node.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1,
          ),
        )
      : allTransactions;
  }, [filter, allTransactions]);

  return (
    <aside style={styles.sidebar}>
      {transactions.map((tx: any, _index: number) => (
        <Transaction
          transaction={tx}
          key={tx.id}
          isSelected={tx.id === selected}
          previous={connection?.transactions?.get(tx.id - 1)}
          setSelected={setSelected}
        />
      ))}
    </aside>
  );
}

export default Sidebar;
