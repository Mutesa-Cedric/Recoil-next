/**
 * TypeScript port of ItemDependencies.tsx
 * Recoil DevTools browser extension.
 */

import React, {useContext} from 'react';
import {SerializedValueType} from '../../../utils/Serialization';
import ConnectionContext from '../ConnectionContext';
import {useSelectedTransaction} from '../useSelectionHooks';
import CollapsibleItem from './CollapsibleItem';
import Item from './Item';
import nullthrows from 'nullthrows';

const styles = {
  label: {
    color: '#666',
  },
  container: {
    padding: 6,
    background: 'white',
    marginTop: 6,
    marginBottom: 10,
  },
};

type Props = {
  name: string;
};

function ItemDependencies({name}: Props): React.ReactNode {
  const connection = nullthrows(useContext(ConnectionContext));
  const [txID] = useSelectedTransaction();

  const deps = connection.dependencies.get(name, txID);
  if (deps == null || deps.size === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      <CollapsibleItem
        inContainer={true}
        label={
          <span style={styles.label}>
            {deps.size} {deps.size === 1 ? 'dependency' : 'dependencies'}
          </span>
        }>
        <div>
          {Array.from(deps).map((dep: unknown) => (
            <Item
              key={dep as string}
              name={dep as string}
              startCollapsed={true}
              content={
                connection?.tree?.get(dep as string, txID) ?? {
                  t: SerializedValueType.undefined,
                }
              }
              isRoot={false}
            />
          ))}
        </div>
      </CollapsibleItem>
    </div>
  );
}

export default ItemDependencies;
