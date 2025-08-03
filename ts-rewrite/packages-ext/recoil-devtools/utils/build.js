/**
 * TypeScript port of build.js
 * Recoil DevTools browser extension.
 */

const config = require('../webpack.config');
const webpack = require('webpack');

delete config.chromeExtensionBoilerplate;

webpack(config, function (err) {
  if (err) throw err;
});
