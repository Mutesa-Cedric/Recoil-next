/**
 * TypeScript port of Recoil_isNode.js
 */

'use strict';

export default function isNode(object: unknown): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const doc =
    object != null ? ((object as any).ownerDocument ?? document) : document;
  const defaultView = doc.defaultView ?? window;
  return !!(
    object != null &&
    (typeof defaultView.Node === 'function'
      ? object instanceof defaultView.Node
      : typeof object === 'object' &&
        typeof (object as any).nodeType === 'number' &&
        typeof (object as any).nodeName === 'string')
  );
}
