/**
 * TypeScript port of PopupSidebarTransaction.tsx
 * Recoil DevTools browser extension.
 */

import type {TransactionType} from '../../types/DevtoolsTypes';

import ConnectionContext from './ConnectionContext';
import NodeName from './Items/NodeName';
import React, {useCallback, useContext} from 'react';

const styles = {
  transaction: {
    cursor: 'pointer',
    padding: '10px 16px',
    borderBottom: '1px solid #E0E0E0',
    ':hover': {
      backgroundColor: '#eee',
    },
  },

  transactionSelected: {
    backgroundColor: '#E9F3FF',
  },

  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: '#666',
  },

  body: {
    textAlign: 'left' as const,
    overflowX: 'scroll' as const,
  },

  subscriber: {
    color: '#666',
    marginRight: 8,
  },
  atom: {
    color: '#6A51B2',
    marginRight: 8,
  },
  gotoButton: {
    border: '1px solid #666',
    borderRadius: 3,
    padding: 2,
    marginLeft: 16,
  },
};

type Props = {
  readonly transaction: TransactionType;
  readonly previous: TransactionType | null | undefined;
  readonly isSelected: boolean;
  readonly setSelected: (id: number) => void;
};

const Transaction = ({
  transaction,
  previous,
  isSelected,
  setSelected,
}: Props): React.ReactNode => {
  const connection = useContext(ConnectionContext);

  // When creating a new TX that is selected
  // scroll to make it visible
  const DOMNode = useCallback(
    (node: HTMLElement | null) => {
      if (isSelected && node !== null) {
        node.scrollIntoView();
      }
    },
    [isSelected],
  );

  const modifiedNodes: React.ReactNode[] = [];
  const subscriberNodes: React.ReactNode[] = [];
  for (let modifiedValue of transaction.modifiedValues) {
    const nextList = modifiedValue.isSubscriber
      ? subscriberNodes
      : modifiedNodes;
    nextList.push(
      <span
        key={modifiedValue.name}
        style={modifiedValue.isSubscriber ? styles.subscriber : styles.atom}>
        <NodeName
          name={modifiedValue.name}
          node={connection?.getNode(modifiedValue.name)}
        />
      </span>,
    );
  }

  const gotoCallback = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    connection?.goToSnapshot(transaction.id);
    setSelected(transaction.id);
  };

  return (
    <div
      ref={DOMNode}
      style={{
        ...styles.transaction,
        ...(isSelected ? styles.transactionSelected : {}),
      }}
      onClick={() => setSelected(transaction.id)}>
      <div style={styles.itemHeader}>
        {transaction.id >= 0 ? <span>Tx {transaction.id}</span> : <span />}
        <div>
          <span>
            {previous?.ts != null
              ? `${(transaction.ts.getTime() - previous.ts.getTime()) / 1000}s`
              : transaction.ts.toTimeString().split(' ')[0]}
          </span>
          {connection?.devMode && transaction.id > 0 && (
            <span style={styles.gotoButton} onClick={gotoCallback}>
              Jump
            </span>
          )}
        </div>
      </div>
      <div style={styles.body}>
        {modifiedNodes}
        <div>{subscriberNodes}</div>
      </div>
    </div>
  );
};

export default Transaction;
