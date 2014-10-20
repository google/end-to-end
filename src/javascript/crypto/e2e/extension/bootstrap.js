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

goog.require('e2e.ext.Launcher');

goog.provide('e2e.ext.bootstrap');

// Create the launcher and start it.
if (Boolean(chrome.extension)) {
  /** @type {!e2e.ext.Launcher} */
  var launcher = new e2e.ext.Launcher();
  launcher.start();
  goog.exportSymbol('launcher', launcher);
}


/**
 * Whether the extension was bootstrapped.
 * @type {boolean}
 */
e2e.ext.bootstrap = true;
