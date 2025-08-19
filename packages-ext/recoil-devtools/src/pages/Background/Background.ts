// TypeScript port of Background.js

import type {BackgroundPostMessage} from '../../types/DevtoolsTypes';
import {RecoilDevToolsActions} from '../../constants/Constants';
import {debug, warn} from '../../utils/Logger';
import Store from '../../utils/Store';

const store = ((window as any).store = new Store());

const getConnectionId = ({sender}: chrome.runtime.Port): number => {
  // If this is a devtool connection, there's no tab.id
  // But that ID is not required so we return 0
  return sender?.tab?.id ?? 0;
};
const getConnectionName = ({name}: chrome.runtime.Port): string => {
  const id = name ?? 'Recoil Connection';
  return id;
};

function onConnect(port: chrome.runtime.Port): void {
  const connectionId = getConnectionId(port);
  const displayName = getConnectionName(port);
  let isPopupConnection = false;
  const chunksBuffer = new Map<number, string>();

  const msgHandler = (msg: BackgroundPostMessage) => {
    // ignore invalid message formats
    if (msg?.action == null) {
      return;
    }
    if (msg.action === RecoilDevToolsActions.UPDATE) {
      store.processMessage(msg, connectionId);
    } else if (msg.action === RecoilDevToolsActions.INIT) {
      store.connect(
        connectionId,
        displayName || null,
        msg.data?.devMode ?? false,
        port,
        msg.data?.persistenceLimit,
        msg.data?.initialValues,
      );
      debug('CONNECT', connectionId);
      // This is only needed if we want to display a popup banner
      // in addition to the devpanel.
      // chrome.pageAction.show(connectionId);
    } else if (msg.action === RecoilDevToolsActions.SUBSCRIBE_POPUP) {
      isPopupConnection = true;
      store.subscribe(port);
    } else if (msg.action === RecoilDevToolsActions.UPLOAD_CHUNK) {
      const chunkSoFar = (chunksBuffer.get(msg.txID) ?? '') + (msg.chunk ?? '');
      chunksBuffer.set(msg.txID, chunkSoFar);
      if (Boolean(msg.isFinalChunk)) {
        try {
          const data = JSON.parse(chunkSoFar);
          msgHandler(data);
        } catch (e) {
          warn('Recoil DevTools: Message failed due to "`${e.message}`"');
        } finally {
          chunksBuffer.delete(msg.txID);
        }
      }
    }
  };

  port.onMessage.addListener(msgHandler);

  port.onDisconnect.addListener(() => {
    debug('DISCONNECT', connectionId);
    if (isPopupConnection) {
      store.unsubscribe(port);
    } else {
      store.disconnect(connectionId);
    }
  });
}

// Only add listener if chrome is available (not in test environment)
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onConnect.addListener(onConnect);
}

export {onConnect};
