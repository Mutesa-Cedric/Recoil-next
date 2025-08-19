/**
 * TypeScript port of ItemDescription.tsx
 * Recoil DevTools browser extension.
 */

import React from 'react';
import type {SerializedValue} from '../../../utils/Serialization';
import {SerializedValueType} from '../../../utils/Serialization';

const styles = {
  description: {
    color: 'red',
  },
  previous: {
    backgroundColor: 'red',
    color: 'white',
    marginRight: 10,
    padding: '2px 4px',
    borderRadius: 3,
    textDecoration: 'line-through',
  },
};

type KeyProps = {
  content: SerializedValue | null | undefined;
  previous?: SerializedValue | null | undefined;
};

function totalLength(content: SerializedValue): number {
  return (content.v?.length ?? 0) + (content.e ?? 0);
}

const ItemDescriptionRenderers = {
  [SerializedValueType.error]: (): string => `Error`,
  [SerializedValueType.map]: (value: SerializedValue): string =>
    `Map ${totalLength(value)} entries`,
  [SerializedValueType.set]: (value: SerializedValue): string =>
    `Set ${totalLength(value)} entries`,
  [SerializedValueType.object]: (value: SerializedValue): string =>
    `{} ${totalLength(value)} keys`,
  [SerializedValueType.array]: (value: SerializedValue): string =>
    `[] ${totalLength(value)} items`,
  [SerializedValueType.function]: (): string => `Function`,
  [SerializedValueType.symbol]: (): string => `Symbol`,
};

function ItemDescription({content}: KeyProps): React.ReactNode {
  if (content == null || !hasItemDescription(content)) {
    return null;
  }

  // hasItemDescription makes sure this works
  const description =
    ItemDescriptionRenderers[
      content.t as unknown as keyof typeof ItemDescriptionRenderers
    ](content);

  return <span style={styles.description}>{description}</span>;
}

const hasItemDescription = function (
  content: SerializedValue | null | undefined,
): boolean {
  return (
    content?.t != null &&
    Object.prototype.hasOwnProperty.call(ItemDescriptionRenderers, content.t)
  );
};

export default ItemDescription;
export {hasItemDescription};
