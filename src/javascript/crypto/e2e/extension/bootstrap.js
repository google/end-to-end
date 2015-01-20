/**
 * @license
 * Copyright 2013 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Starts the extension.
 */

goog.require('e2e.ext.AppLauncher');
goog.require('e2e.ext.ExtensionLauncher');
goog.require('e2e.ext.util.ChromeStorageLocal');
goog.require('e2e.ext.utils');
goog.require('goog.storage.mechanism.HTML5LocalStorage');

goog.provide('e2e.ext.bootstrap');


/**
 * @param {e2e.ext.Launcher} launcher
 * @private
 */
e2e.ext.bootstrapLauncher_ = function(launcher) {
  goog.exportSymbol('launcher', launcher);
  launcher.start();
  e2e.ext.bootstrap = true;
};


/**
 * Whether the extension was bootstrapped.
 * @type {boolean}
 */
e2e.ext.bootstrap = false;



// Create the launcher and start it.
if (e2e.ext.utils.isChromeAppWindow()) {
  // Use chrome.local.storage for an app.
  new e2e.ext.util.ChromeStorageLocal(
      /** @type {function(!e2e.ext.util.ChromeStorageLocal)} */ (function(
      storage) {
        e2e.ext.bootstrapLauncher_(new e2e.ext.AppLauncher(storage));
      }));
} else if (e2e.ext.utils.isChromeExtensionWindow()) {
  // For extension, use ContextImpl with default localStorage backend.
  // We don't use chrome.storage.local, because it's accessible from content
  // scripts, that may share processes with arbitrary web origins.
  e2e.ext.bootstrapLauncher_(new e2e.ext.ExtensionLauncher(
      new goog.storage.mechanism.HTML5LocalStorage()));
}
