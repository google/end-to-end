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
 * @fileoverview Starts the website container page.
 */

goog.require('e2e.ext.ui.WebsiteContainer');
goog.require('e2e.ext.utils');
goog.require('goog.events');
goog.require('goog.events.EventType');

goog.provide('e2e.ext.ui.webview.bootstrap');


/**
 * Specifies whether the prompt page has been bootstrapped.
 * @type {boolean}
 */
e2e.ext.ui.webview.bootstrap = false;

// Create the prompt page.
if (e2e.ext.utils.isChromeAppWindow()) {
  goog.events.listen(window, goog.events.EventType.LOAD, function() {
    /** @type {e2e.ext.ui.WebsiteContainer} */
    window.websiteContainer = new e2e.ext.ui.WebsiteContainer(
        'https://mail.google.com/');
    window.websiteContainer.decorate(document.body);
    e2e.ext.ui.webview.bootstrap = true;
  });
}
