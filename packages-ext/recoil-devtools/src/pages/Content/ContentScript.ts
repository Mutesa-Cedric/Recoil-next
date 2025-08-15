/**
 * TypeScript port of ContentScript.ts
 * Recoil DevTools browser extension.
 */

import type {DevToolsOptions, PostMessageData} from '../../types/DevtoolsTypes';

import {
  ExtensionSource,
  ExtensionSourceContentScript,
  MessageChunkSize,
  RecoilDevToolsActions,
} from '../../constants/Constants';
import {warn} from '../../utils/Logger';
import nullthrows from 'nullthrows';

// Add types for window extensions
declare global {
  interface Window {
    devToolsExtensionID?: string;
  }
}

// Init message listeners
function initContentScriptListeners() {
  let connected = false;
  let bg: chrome.runtime.Port | null = null;
  window.addEventListener('message', (message: MessageEvent) => {
    const data = message.data as PostMessageData;
    if (data.source !== ExtensionSource) {
      return;
    }
    if (data.action === RecoilDevToolsActions.INIT) {
      connect(data.props);
    } else {
      send(data);
    }
  });

  function connect(props: DevToolsOptions | null | undefined) {
    // Connect to the background script
    connected = true;

    bg = chrome.runtime.connect(window.devToolsExtensionID || '', {
      name: props?.name ?? '',
    });

    send({
      action: RecoilDevToolsActions.INIT,
      props: props ? {...props} : undefined,
    });

    bg?.onDisconnect.addListener(() => {
      connected = false;
      bg = null;
    });

    bg?.onMessage.addListener(msg => {
      window.postMessage({
        source: ExtensionSourceContentScript,
        ...msg,
      });
    });
  }

  function send(data: PostMessageData) {
    if (bg !== null && connected) {
      try {
        bg.postMessage(data);
      } catch (err) {
        if (err instanceof Error && err.message === 'Message length exceeded maximum allowed length.') {
          sendInChunks(data);
        } else {
          warn(`Transaction ignored in Recoil DevTools: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  function sendInChunks(data: PostMessageData) {
    if (bg == null || !connected) {
      return;
    }

    const encoded = JSON.stringify(data);
    const len = encoded.length;
    for (let i = 0; i < len; i = i + MessageChunkSize) {
      const chunk = encoded.slice(i, i + MessageChunkSize);
      try {
        bg?.postMessage({
          action: RecoilDevToolsActions.UPLOAD_CHUNK,
          txID: data.txID ?? -1,
          chunk,
          isFinalChunk: i + MessageChunkSize >= len,
        });
      } catch (err) {
        warn(`Transaction ignored in Recoil DevTools: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}

// - Load page script so it can access the window object
function initPageScript() {
  // Only initialize if chrome extension API is available (not in test environment)
  if (typeof chrome !== 'undefined' && chrome.extension) {
    const pageScript = document.createElement('script');
    pageScript.type = 'text/javascript';

    pageScript.src = chrome.extension.getURL('pageScript.bundle.js');
    // remove the pageScript node after it has run
    pageScript.onload = function () {
      const element = this as HTMLScriptElement;
      element.parentNode?.removeChild(element);
    };
    nullthrows(document.head ?? document.documentElement).appendChild(pageScript);
  }
}

initContentScriptListeners();
initPageScript();

export {initContentScriptListeners};
