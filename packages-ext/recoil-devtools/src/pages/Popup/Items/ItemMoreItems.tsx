/**
 * TypeScript port of ItemMoreItems.tsx
 * Recoil DevTools browser extension.
 */

import React from 'react';
import type {SerializedValue} from '../../../utils/Serialization';
import { SerializedValueType } from '../../../utils/Serialization';

const styles = {
  description: {
    color: '#666',
    marginTop: 10,
    marginBottom: 10,
  },
};

type KeyProps = {
  content: SerializedValue | null | undefined,
};

const Renderers = {
  [SerializedValueType.map]: (value: number): string =>
    `... ${value} more entries`,
  [SerializedValueType.set]: (value: number): string =>
    `... ${value} more entries`,
  [SerializedValueType.object]: (value: number): string =>
    `... ${value} more keys`,
  [SerializedValueType.array]: (value: number): string =>
    `... ${value} more items`,
};

function ItemMoreItems({content}: KeyProps): React.ReactNode {
  if (
    content == null ||
    !Object.prototype.hasOwnProperty.call(Renderers, content?.t) ||
    content.e == null ||
    content.e === 0
  ) {
    return null;
  }

  // Renderers.hasOwnProperty makes sure this works
  const description = Renderers[content.t as unknown as keyof typeof Renderers](content.e);

  return <div style={styles.description}>{description}</div>;
}

export default ItemMoreItems;
