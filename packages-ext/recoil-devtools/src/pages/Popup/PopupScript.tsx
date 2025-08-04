/**
 * TypeScript port of PopupScript.tsx
 * Recoil DevTools browser extension.
 */

import React from 'react';
import { render } from 'react-dom';
import { RecoilRoot } from 'recoil';
import type {BackgroundPage} from '../../types/DevtoolsTypes';
import PopupApp from './PopupApp';

chrome.runtime.getBackgroundPage((backgroundPage?: Window) => {
  const {store} = backgroundPage as unknown as BackgroundPage;
  render(
    <RecoilRoot>
      <PopupApp store={store} />
    </RecoilRoot>,
    window.document.querySelector('#app-container'),
  );
});
