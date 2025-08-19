/**
 * TypeScript port of ContentScript.test.ts
 * Recoil DevTools browser extension.
 */

import {beforeAll, describe, expect, it, vi} from 'vitest';

// Mock spies
const handlers: any[] = [];
const bg = {
  onDisconnect: {
    addListener: vi.fn(),
  },
  onMessage: {
    addListener: vi.fn(),
  },
  postMessage: vi.fn((msg: any) => {
    if (msg.message?.mustThrow) {
      throw new Error('Message length exceeded maximum allowed length.');
    }
  }),
};

// a minimal chrome namespace mock for type safety
(globalThis as any).chrome = {
  runtime: {
    connect: () => bg,
  },
};

// Type-safe window.addEventListener mock
globalThis.window.addEventListener = ((
  evt: string,
  handler: EventListenerOrEventListenerObject,
) => {
  handlers.push(handler);
}) as typeof window.addEventListener;

// Mock constants
vi.mock('../../../constants/Constants', () => ({
  ExtensionSource: 'source',
  ExtensionSourceContentScript: 'script',
  RecoilDevToolsActions: {
    INIT: 'recoil_devtools_init',
    UPDATE: 'recoil_devtools_update',
    UPLOAD_CHUNK: 'recoil_devtools_chunk',
  },
  MessageChunkSize: 50,
}));

// Import constants and ContentScript without top-level await
let ExtensionSource: string;
let RecoilDevToolsActions: any;

beforeAll(async () => {
  const constants = await import('../../../constants/Constants');
  ExtensionSource = constants.ExtensionSource;
  RecoilDevToolsActions = constants.RecoilDevToolsActions;

  // Side-effect: initializes handlers variable
  await import('../ContentScript');
});

describe('initializing Content Script listeners', () => {
  it('sets events handler', () => {
    expect(handlers.length).toEqual(1);
  });

  it('ignore message with wrong source', () => {
    const EvtHandler = handlers[0];
    EvtHandler({
      data: {
        action: RecoilDevToolsActions.INIT,
        source: 'other',
      },
    });
    expect(bg.postMessage).not.toHaveBeenCalled();
  });

  it('ignore message with missing action', () => {
    const EvtHandler = handlers[0];
    EvtHandler({
      data: {
        source: ExtensionSource,
      },
    });
    expect(bg.postMessage).not.toHaveBeenCalled();
  });

  it('inits connection', () => {
    const EvtHandler = handlers[0];
    EvtHandler({
      data: {
        action: RecoilDevToolsActions.INIT,
        source: ExtensionSource,
      },
    });
    expect(bg.postMessage).toHaveBeenCalledWith({
      action: RecoilDevToolsActions.INIT,
      props: undefined,
    });
  });

  it('Sends updates', () => {
    const EvtHandler = handlers[0];
    EvtHandler({
      data: {
        action: RecoilDevToolsActions.UPDATE,
        source: ExtensionSource,
        message: {modifiedValues: {a: {t: '0', v: 2}}},
      },
    });
    expect(bg.postMessage).toHaveBeenLastCalledWith({
      action: RecoilDevToolsActions.UPDATE,
      source: ExtensionSource,
      message: {
        modifiedValues: {
          a: {t: '0', v: 2},
        },
      },
    });
  });

  it('Sends updates in chunks after size error', () => {
    vi.clearAllMocks();

    const EvtHandler = handlers[0];
    EvtHandler({
      data: {
        action: RecoilDevToolsActions.UPDATE,
        source: ExtensionSource,
        message: {mustThrow: true, modifiedValues: {a: {t: '0', v: 2}}},
      },
    });
    expect(bg.postMessage).toHaveBeenCalledTimes(4);

    expect(bg.postMessage).toHaveBeenNthCalledWith(2, {
      action: RecoilDevToolsActions.UPLOAD_CHUNK,
      chunk: '{"action":"recoil_devtools_update","source":"sourc',
      isFinalChunk: false,
      txID: -1,
    });

    expect(bg.postMessage).toHaveBeenNthCalledWith(3, {
      action: RecoilDevToolsActions.UPLOAD_CHUNK,
      chunk: 'e","message":{"mustThrow":true,"modifiedValues":{"',
      isFinalChunk: false,
      txID: -1,
    });

    expect(bg.postMessage).toHaveBeenNthCalledWith(4, {
      action: RecoilDevToolsActions.UPLOAD_CHUNK,
      chunk: 'a":{"t":"0","v":2}}}}',
      isFinalChunk: true,
      txID: -1,
    });
  });
});
