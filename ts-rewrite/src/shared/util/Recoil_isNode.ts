/**
 * Determines if an object is a DOM Node. Mirrors original Flow implementation.
 */

const isNode = (object: unknown): boolean => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return false;
    }

    // Attempt to resolve the ownerDocument of the passed object; fall back to global document
    const doc: Document = (object as any)?.ownerDocument ?? (object as any) ?? document;
    const defaultView = doc.defaultView ?? window;

    return !!(
        object != null &&
        (typeof (defaultView as any).Node === 'function'
            ? object instanceof (defaultView as any).Node
            : typeof object === 'object' &&
            'nodeType' in (object as any) &&
            typeof (object as any).nodeType === 'number' &&
            'nodeName' in (object as any) &&
            typeof (object as any).nodeName === 'string')
    );
};

export default isNode; 