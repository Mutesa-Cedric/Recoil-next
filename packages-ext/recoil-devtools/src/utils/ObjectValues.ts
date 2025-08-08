// TypeScript port of ObjectValues.js

/**
 * The return type of Object.values() in TypeScript is Array<any>. This is because
 * TypeScript doesn't require objects to be exact, so it cannot guarantee that
 * an object matching `{foo: string}` isn't actually `{foo: 'bar', baz: 123}` at
 * runtime.
 *
 * But... for code using object-as-map, e.g. `{[fooID: string]: Foo}`, this is
 * just too common. So wrap TypeScript and provide better typing.
 */
export default function objectValues<TValue>(
  obj: Record<string | number | symbol, TValue>
): Array<TValue> {
  return Object.values(obj) as Array<TValue>;
}
