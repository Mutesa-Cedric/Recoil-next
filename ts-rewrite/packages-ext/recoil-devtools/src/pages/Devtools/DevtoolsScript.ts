/**
 * TypeScript port of DevtoolsScript.js
 * Recoil DevTools browser extension.
 */
'use strict';

// Global declaration for __DEV__
declare const __DEV__: boolean;

chrome.devtools.panels.create(
  __DEV__ ? 'Recoil (DEV)' : 'Recoil',
  '',
  'devpanel.html',
  () => {},
);
