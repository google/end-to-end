/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
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
 * @fileoverview Bootstraps the helper in a content script.
 */

goog.require('e2e.ext.Helper');
goog.require('e2e.ext.WebsiteApi');
goog.require('e2e.ext.utils');

goog.provide('e2e.ext.helper.bootstrap');


/**
 * Specifies whether the helper has been bootstrapped.
 * @type {boolean}
 */
e2e.ext.helper.bootstrap = false;


// Create the helper and start it.
if (e2e.ext.utils.isContentScript() && !goog.isDef(window.helper)) {
  /** @type {!e2e.ext.Helper} */
  window.helper = new e2e.ext.Helper(new e2e.ext.WebsiteApi());
  if (e2e.ext.utils.runsInChromeApp()) {
    window.helper.enableWebsiteRequests();
  }
  e2e.ext.helper.bootstrap = true;
}
