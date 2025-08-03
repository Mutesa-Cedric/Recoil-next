/**
 * TypeScript port of Item.tsx
 * Recoil DevTools browser extension.
 */
import type {Node} from '../../../types/DevtoolsTypes';
import type {SerializedValue} from '../../../utils/Serialization';

import ItemDependencies from './ItemDependencies';
import ItemValue from './ItemValue';

import ConnectionContext from '../ConnectionContext';
import React, { useContext } from 'react';
import { useSelectedTransaction } from '../useSelectionHooks';
import CollapsibleItem from './CollapsibleItem';
import ItemDescription, { hasItemDescription } from './ItemDescription';
import ItemLabel from './ItemLabel';
import ItemMoreItems from './ItemMoreItems';
import nullthrows from 'nullthrows';

type KeyProps = {
  name: string | number,
  content: SerializedValue,
  startCollapsed?: boolean | null | undefined,
  node?: Node | null | undefined,
  isRoot?: boolean,
};

function Item({
  name,
  content,
  startCollapsed,
  node,
  isRoot = false,
}: KeyProps): React.ReactNode {
  const connection = nullthrows(useContext(ConnectionContext));
  const [txID] = useSelectedTransaction();

  const deps = isRoot
    ? connection.dependencies.get(name.toString(), txID)
    : null;
  const hasDescription = hasItemDescription(content);

  return (
    <CollapsibleItem
      key={name}
      isRoot={isRoot}
      collapsible={hasDescription || (deps != null && deps.size > 0)}
      startCollapsed={startCollapsed}
      label={
        <span>
          <>
            <ItemLabel name={name} node={node} isRoot={isRoot} />
            {hasDescription ? (
              <ItemDescription content={content} />
            ) : (
              <ItemValue
                content={content}
                inline={true}
                startCollapsed={startCollapsed}
              />
            )}
          </>
        </span>
      }>
      <div>
        {hasDescription && (
          <ItemValue content={content} startCollapsed={startCollapsed} />
        )}
        <ItemMoreItems content={content} />
        {isRoot && <ItemDependencies name={name.toString()} />}
      </div>
    </CollapsibleItem>
  );
}

export default Item;
