/**
 * TypeScript port of DiffItem.tsx
 * Recoil DevTools browser extension.
 */

import ItemDependencies from './ItemDependencies';

const {formatForDiff} = require('../../../utils/Serialization');
import ConnectionContext from '../ConnectionContext';
const {useSelectedTransaction} = require('../useSelectionHooks');
import CollapsibleItem from './CollapsibleItem';
const ItemDescription = require('./ItemDescription');
const ItemLabel = require('./ItemLabel');
const ItemMoreItems = require('./ItemMoreItems');
const JsonDiff = require('jsondiffpatch-for-react').default;
const nullthrows = require('nullthrows');
import * as React from 'react';
const {useMemo, useContext} = React;

const styles = {
  valuesHolder: {
    display: 'flex',
    justifyContent: 'stretch',
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
};

type Props = {
  name: string;
  startCollapsed?: boolean;
  isRoot?: boolean;
};

function DiffItem({
  name,
  startCollapsed = false,
  isRoot = false,
}: Props): React.ReactNode {
  const connection = nullthrows(useContext(ConnectionContext));
  const [txID] = useSelectedTransaction();

  const {tree} = connection;
  const {value, previous} = useMemo(
    () => ({
      value: tree.get(name, txID),
      previous: tree.get(name, txID - 1),
    }),
    [tree, txID, name],
  );

  return (
    <CollapsibleItem
      key={name}
      isRoot={isRoot}
      label={
        <>
          <ItemLabel
            name={name}
            node={connection.getNode(name)}
            isRoot={isRoot}
          />
          <ItemDescription content={value} previous={previous} />
        </>
      }
      startCollapsed={startCollapsed}>
      <div style={styles.valuesHolder}>
        <JsonDiff left={formatForDiff(previous)} right={formatForDiff(value)} />
      </div>
      <ItemMoreItems content={value} />
      <ItemDependencies name={name} />
    </CollapsibleItem>
  );
}

export default DiffItem;
