/**
 * TypeScript port of PopupDiff.tsx
 * Recoil DevTools browser extension.
 */

import React, {useContext} from 'react';
import ConnectionContext from './ConnectionContext';
import DiffItem from './Items/DiffItem';
import {useSelectedTransaction} from './useSelectionHooks';

function PopupDiff(): React.ReactNode {
  const connection = useContext(ConnectionContext);

  const [txID] = useSelectedTransaction();

  if (connection == null) {
    return null;
  }

  const transaction = connection.transactions.get(txID);

  return (
    <>
      {transaction?.modifiedValues?.map(({name}) => (
        <DiffItem name={name} key={name} isRoot={true} />
      ))}
    </>
  );
}

export default PopupDiff;
