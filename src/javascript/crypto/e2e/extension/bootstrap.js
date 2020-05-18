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
 * @fileoverview Starts the extension/app.
 */
goog.provide('e2e.ext.bootstrap');

goog.require('e2e.ext.AppLauncher');
goog.require('e2e.ext.ExtensionLauncher');
goog.require('e2e.ext.constants.StorageKey');
goog.require('e2e.ext.util.ChromeStorageLocal');
goog.require('e2e.ext.utils');
goog.require('e2e.openpgp.ContextImpl');
goog.require('goog.storage.mechanism.HTML5LocalStorage');
goog.require('goog.storage.mechanism.PrefixedMechanism');


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


/**
 * Creates the launcher, detecting the runtime environment and starts it.
 * @private
 */
e2e.ext.bootstrap_ = function() {
  if (e2e.ext.utils.isChromeAppWindow()) {
    // For the app, use chrome.local.storage backend.
    new e2e.ext.util.ChromeStorageLocal(
        /** @type {function(!e2e.ext.util.ChromeStorageLocal)} */ (function(
        storage) {
          var contextImpl = new e2e.openpgp.ContextImpl(storage);
          var prefStorage = new goog.storage.mechanism.PrefixedMechanism(
              storage,
              e2e.ext.constants.StorageKey.PREFERENCES);
          var launcher = new e2e.ext.AppLauncher(contextImpl, prefStorage);
          e2e.ext.bootstrapLauncher_(launcher);
        }));
  } else if (e2e.ext.utils.isChromeExtensionWindow()) {
    // For the extension, use ContextImpl with default localStorage backend.
    // We don't use chrome.storage.local, because it's accessible from content
    // scripts, that may share processes with arbitrary web origins.
    var storage = new goog.storage.mechanism.HTML5LocalStorage();
    var contextImpl = new e2e.openpgp.ContextImpl(storage);
    var prefStorage = new goog.storage.mechanism.PrefixedMechanism(storage,
        e2e.ext.constants.StorageKey.PREFERENCES);
    e2e.ext.bootstrapLauncher_(new e2e.ext.ExtensionLauncher(contextImpl,
        prefStorage));
  }
};

e2e.ext.bootstrap_();
