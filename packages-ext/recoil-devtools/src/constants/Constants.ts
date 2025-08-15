/**
 * TypeScript port of Constants.js
 */

// __DEV__ with fallback for environments where it's not available
const _DEV_MODE: boolean = (globalThis as any).__DEV__ ?? false;

const ExtensionSource: string = _DEV_MODE
  ? 'recoil-dev-tools-DEV-MODE'
  : 'recoil-dev-tools';
const ExtensionSourceContentScript: string = _DEV_MODE
  ? 'recoil-dev-tools-content-script-DEV-MODE'
  : 'recoil-dev-tools-content-script';

const RecoilDevToolsActions = {
  // sent from page
  INIT: 'recoil_devtools_init',
  UPDATE: 'recoil_devtools_update',
  UPLOAD_CHUNK: 'recoil_devtools_chunk',
  // sent from background store to popup
  DISCONNECT: 'recoil_devtools_disconnect',
  CONNECT: 'recoil_devtools_connect',
  UPDATE_STORE: 'recoil_devtools_update_store',
  // sent from popup to background
  SUBSCRIBE_POPUP: 'recoil_devtools_subscribe_popup',
  // sent from background store to page
  GO_TO_SNAPSHOT: 'recoil_devtools_go_to_snapshot',
} as const;

export type MainTabsType = 'Diff' | 'State' | 'Graph';

const MainTabs: MainTabsType[] = ['Diff', 'State', 'Graph'];

const MainTabsTitle: Record<MainTabsType, string> = Object.freeze({
  Diff: 'Modified Values',
  State: 'Known Nodes',
  Graph: 'Registered Dependencies',
});

const MessageChunkSize = 1024 * 1024;

export {
  ExtensionSource,
  ExtensionSourceContentScript,
  RecoilDevToolsActions,
  MainTabs,
  MainTabsTitle,
  MessageChunkSize,
};
