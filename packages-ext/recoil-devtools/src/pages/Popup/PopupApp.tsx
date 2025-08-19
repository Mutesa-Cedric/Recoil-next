// TypeScript port of PopupApp.js

import React, {useEffect, useRef, useState} from 'react';
import type Store from '../../utils/Store';
import {RecoilDevToolsActions} from '../../constants/Constants';
import ConnectionContext from './ConnectionContext';
import PopupComponent from './PopupComponent';

type AppProps = {
  store: Store;
};

function PopupApp({store}: AppProps): React.ReactElement {
  const tabId = chrome.devtools?.inspectedWindow?.tabId ?? null;
  const [selectedConnection, setSelectedConnection] = useState<number | null>(
    tabId,
  );
  const [maxTransactionId, setMaxTransactionId] = useState(
    store.getConnection(selectedConnection)?.transactions.getLast(),
  );

  const port = useRef<chrome.runtime.Port | null>(null);

  // Subscribing to store events
  useEffect(() => {
    if (port.current !== null) {
      port.current.disconnect();
    }
    port.current = chrome.runtime.connect();

    port.current.postMessage({
      action: RecoilDevToolsActions.SUBSCRIBE_POPUP,
    });
    port.current?.onMessage.addListener((msg: any) => {
      if (
        msg.action === RecoilDevToolsActions.CONNECT &&
        tabId != null &&
        msg.connectionId === tabId
      ) {
        setSelectedConnection(tabId);
      } else if (msg.connectionId === selectedConnection) {
        if (msg.action === RecoilDevToolsActions.UPDATE_STORE) {
          setMaxTransactionId(msg.msgId);
        } else if (msg.action === RecoilDevToolsActions.DISCONNECT) {
          setSelectedConnection(null);
        }
      }
    });
  }, [selectedConnection, tabId]);

  return (
    <ConnectionContext.Provider value={store.getConnection(selectedConnection)}>
      <PopupComponent maxTransactionId={maxTransactionId ?? 0} />
    </ConnectionContext.Provider>
  );
}

export default PopupApp;
