/**
 * TypeScript port of ItemLabel.tsx
 * Recoil DevTools browser extension.
 */

import * as React from 'react';
import type {Node} from '../../../types/DevtoolsTypes';
import { getStyle } from '../../../utils/getStyle';
import NodeName from './NodeName';
const styles = {
  label: {
    marginRight: 5,
    color: '#6A51B2',
    fontSize: 12,
  },
  isRoot: {
    fontSize: 12,
  },
};

type KeyProps = {
  name: string | number,
  node: Node | null | undefined,
  isRoot?: boolean,
};

function ItemLabel({name, node, isRoot = false}: KeyProps): React.ReactElement {
  return (
    <span style={getStyle(styles, {label: true, isRoot})}>
      <NodeName name={name} node={node} />:
    </span>
  );
}

export default ItemLabel;
