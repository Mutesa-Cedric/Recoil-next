/**
 * TypeScript port of Background.test.ts
 * Recoil DevTools browser extension.
 */

import { vi, describe, it, expect } from 'vitest';
import { onConnect } from '../Background';
import { RecoilDevToolsActions } from '../../../constants/Constants';


describe('Background Proccess', () => {
  it('onConnect listern added', () => {
    expect(globalThis.chrome.runtime.onConnect.addListener).toHaveBeenCalled();
  });

  const store = (global.window as any).store;
  it('Store is found', () => {
    expect(store).toBeDefined();
  });

  let evtHandler: any = null;
  const port = {
    onMessage: {
      addListener: vi.fn((fn: any) => (evtHandler = fn)),
    },
    onDisconnect: {
      addListener: vi.fn(),
    },
  } as any;

  onConnect(port);
  it('evtHandler is set and connection is', () => {
    expect(evtHandler).toBeDefined();
  });

  it('connection is created', () => {
    evtHandler({
      action: RecoilDevToolsActions.INIT,
      data: {
        initialValues: {
          a: { t: '0', v: 2 },
        },
      },
    });
    expect(store.connections.size).toBe(1);
    expect(store.connections.get(0).transactions.getSize()).toBe(1);
  });

  it('transaction is stored', () => {
    evtHandler({
      action: RecoilDevToolsActions.UPDATE,
      message: {
        modifiedValues: {
          b: { t: '0', v: 2 },
        },
      },
    });
    expect(store.connections.get(0).transactions.getSize()).toBe(2);
    expect(store.connections.get(0).transactions.get(1).modifiedValues).toEqual(
      [{ isSubscriber: false, name: 'b' }],
    );
  });

  it('transaction in chunks is stored', () => {
    evtHandler({
      action: RecoilDevToolsActions.UPLOAD_CHUNK,
      chunk: '{"action":"recoil_devtools_update","source":"sourc',
      isFinalChunk: false,
      txID: 2,
    });

    evtHandler({
      action: RecoilDevToolsActions.UPLOAD_CHUNK,
      chunk: 'e","message":{"mustThrow":true,"modifiedValues":{"',
      isFinalChunk: false,
      txID: 2,
    });

    evtHandler({
      action: RecoilDevToolsActions.UPLOAD_CHUNK,
      chunk: 'c":{"t":"0","v":2}}}}',
      isFinalChunk: true,
      txID: 2,
    });

    expect(store.connections.get(0).transactions.getSize()).toBe(3);
    expect(store.connections.get(0).transactions.get(2).modifiedValues).toEqual(
      [{ isSubscriber: false, name: 'c' }],
    );
  });

  it('mixed chunks are dealt with properly', () => {
    // mixed txID 3
    evtHandler({
      action: RecoilDevToolsActions.UPLOAD_CHUNK,
      chunk: '{"action":"recoil_devtools_update","source":"sourc',
      isFinalChunk: false,
      txID: 3,
    });

    // mixed txID 4
    evtHandler({
      action: RecoilDevToolsActions.UPLOAD_CHUNK,
      chunk: '{"action":"recoil_devtools_update","source":"sourc',
      isFinalChunk: false,
      txID: 4,
    });

    evtHandler({
      action: RecoilDevToolsActions.UPLOAD_CHUNK,
      chunk: 'e","message":{"mustThrow":true,"modifiedValues":{"',
      isFinalChunk: false,
      txID: 3,
    });

    evtHandler({
      action: RecoilDevToolsActions.UPLOAD_CHUNK,
      chunk: 'e","message":{"mustThrow":true,"modifiedValues":{"',
      isFinalChunk: false,
      txID: 4,
    });

    evtHandler({
      action: RecoilDevToolsActions.UPLOAD_CHUNK,
      chunk: 'd":{"t":"0","v":2}}}}',
      isFinalChunk: true,
      txID: 3,
    });

    evtHandler({
      action: RecoilDevToolsActions.UPLOAD_CHUNK,
      chunk: 'e":{"t":"0","v":2}}}}',
      isFinalChunk: true,
      txID: 4,
    });

    expect(store.connections.get(0).transactions.getSize()).toBe(5);
    expect(store.connections.get(0).transactions.get(3).modifiedValues).toEqual(
      [{ isSubscriber: false, name: 'd' }],
    );
    expect(store.connections.get(0).transactions.get(4).modifiedValues).toEqual(
      [{ isSubscriber: false, name: 'e' }],
    );
  });
});
