/**
 * TypeScript port of ItemValue.tsx
 * Recoil DevTools browser extension.
 */

import React from 'react';
import type {SerializedValue} from '../../../utils/Serialization';
import {SerializedValueType} from '../../../utils/Serialization';
import Item from './Item';

const styles = {
  blockValue: {
    marginTop: 0,
  },
  value: {
    fontWeight: 'bold',
  },
};

type ValueSpanProps = {
  children: React.ReactNode;
};

const ValueSpan = ({children}: ValueSpanProps): React.ReactNode => {
  return <span style={styles.value}>{children}</span>;
};

const ItemRenderers: {[key: string]: (props: any) => React.ReactNode} = {
  [SerializedValueType.null]: function SerializedValueTypeNull({}) {
    return <ValueSpan>null</ValueSpan>;
  },
  [SerializedValueType.undefined]: function SerializedValueTypeUndefined({}) {
    return <ValueSpan>undefined</ValueSpan>;
  },
  [SerializedValueType.array]: ({
    value,
    startCollapsed,
  }: {
    value: readonly SerializedValue[];
    startCollapsed: boolean | null | undefined;
  }) =>
    value.map((it, i) => (
      <Item name={i} content={it} key={i} startCollapsed={startCollapsed} />
    )),

  [SerializedValueType.object]: ({
    value,
    startCollapsed,
  }: {
    value: readonly (readonly SerializedValue[])[];
    startCollapsed: boolean | null | undefined;
  }) => {
    return ItemRenderers[SerializedValueType.map]({value, startCollapsed});
  },
  [SerializedValueType.set]: ({
    value,
    startCollapsed,
  }: {
    value: readonly SerializedValue[];
    startCollapsed: boolean | null | undefined;
  }) => {
    return ItemRenderers[SerializedValueType.array]({value, startCollapsed});
  },
  [SerializedValueType.map]: ({
    value,
    startCollapsed,
  }: {
    value: readonly (readonly SerializedValue[])[];
    startCollapsed: boolean | null | undefined;
  }) => {
    return value.map(([name, content], i) => (
      <Item
        name={name?.v?.toString() ?? i}
        content={content}
        key={i}
        startCollapsed={startCollapsed}
      />
    ));
  },
  [SerializedValueType.date]: function SerializedValueTypeDate({
    value,
  }: {
    value: Date;
  }) {
    return <ValueSpan>{new Date(value).toISOString()}</ValueSpan>;
  },
  [SerializedValueType.function]: function SerializedValueTypeFunction({
    value,
  }: {
    value: string;
  }) {
    return <ValueSpan>{value}</ValueSpan>;
  },
  [SerializedValueType.symbol]: function SerializedValueTypeSymbol({
    value,
  }: {
    value: string;
  }) {
    return <ValueSpan>Symbol({value})</ValueSpan>;
  },
  [SerializedValueType.error]: ({value}: {value: string}): React.ReactNode =>
    ItemRenderers[SerializedValueType.primitive]({value}),
  [SerializedValueType.promise]: function SerializedValueTypePromise({
    value: _value,
  }: {
    value: string;
  }) {
    return <ValueSpan>Promise{'<Pending>'}</ValueSpan>;
  },
  [SerializedValueType.primitive]: function SerializedValueTypePrimitive({
    value,
  }: {
    value: string | number;
  }) {
    if (typeof value === 'string') {
      return <ValueSpan>&#34;{value}&#34;</ValueSpan>;
    } else if (typeof value?.toString === 'function') {
      return <ValueSpan>{value.toString()}</ValueSpan>;
    }
    return <ValueSpan>{value}</ValueSpan>;
  },
};

type Props = {
  content: SerializedValue | null | undefined;
  inline?: boolean;
  startCollapsed?: boolean | null | undefined;
};

function ItemValue({
  content,
  inline = false,
  startCollapsed,
}: Props): React.ReactNode {
  const markup =
    content == null
      ? 'undefined'
      : ItemRenderers[content.t as keyof typeof ItemRenderers]({
          value: content.v,
          startCollapsed,
        } as any);

  return inline ? markup : <div style={styles.blockValue}>{markup}</div>;
}

export default ItemValue;
