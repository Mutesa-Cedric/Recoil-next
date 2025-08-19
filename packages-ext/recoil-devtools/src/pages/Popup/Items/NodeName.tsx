/**
 * TypeScript port of NodeName.tsx
 * Recoil DevTools browser extension.
 */

import React from 'react';
import type {Node} from '../../../types/DevtoolsTypes';

const styles = {
  label: {
    display: 'inline-block',
    alignItems: 'center',
  },
  selector: {
    marginRight: 5,
    fontSize: 8,
    background: 'red',
    color: 'white',
    fontWeight: 'bold',
    borderRadius: 24,
    padding: '1px 2px',
    verticalAlign: 'middle',
  },
};

type KeyProps = {
  name: string | number;
  node: Node | null | undefined;
};

export default function NodeName({name, node}: KeyProps): React.ReactElement {
  return (
    <span style={styles.label}>
      {node?.type === 'selector' && (
        <span style={styles.selector} title="This is a Recoil selector">
          S
        </span>
      )}
      {name}
    </span>
  );
}
