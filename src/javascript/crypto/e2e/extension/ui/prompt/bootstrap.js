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
 * @fileoverview Starts the prompt page.
 */

goog.require('e2e.ext.ui.Prompt');
goog.require('e2e.ext.utils');
goog.require('goog.events');
goog.require('goog.events.EventType');

goog.provide('e2e.ext.ui.prompt.bootstrap');


/**
 * Specifies whether the prompt page has been bootstrapped.
 * @type {boolean}
 */
e2e.ext.ui.prompt.bootstrap = false;

// Create the prompt page.
if (e2e.ext.utils.isChromeExtensionWindow() ||
    e2e.ext.utils.isChromeAppWindow()) {
  goog.events.listen(window, goog.events.EventType.LOAD, function() {
    var isPopout = (location.search === '?popout');
    /** @type {e2e.ext.ui.Prompt} */
    window.promptPage = new e2e.ext.ui.Prompt(isPopout);
    if (isPopout) {
      // Popouts are initialized by an event from the extension popup.
      window.promptPage.startMessageListener();
    } else {
      window.promptPage.decorate(document.body);
    }
    e2e.ext.ui.prompt.bootstrap = true;
  });
}
