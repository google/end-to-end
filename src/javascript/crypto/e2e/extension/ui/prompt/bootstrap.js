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
goog.require('e2e.ext.utils.TabsHelperProxy');
goog.require('e2e.ext.utils.WebviewHelperProxy');
goog.require('goog.asserts');
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

    /** @type {!e2e.ext.utils.HelperProxy} */
    var helperProxy;
    var promptCompleteHandler = goog.nullFunction;

    if (e2e.ext.utils.isChromeExtensionWindow()) {
      var tabId = parseInt(location.hash.substring(1), 10);
      if (!isPopout || isNaN(tabId) || tabId <= 0) {
        tabId = undefined;
      }
      helperProxy = new e2e.ext.utils.TabsHelperProxy(false, tabId);
      promptCompleteHandler = function() {
        window.close();
      };
      // Add workaround for #242.
      if (!isPopout) {
        setTimeout(function() {
          // Add a dummy element to resize the window, if Chrome did not resize
          // it properly within a second.
          if (window.outerWidth < 200) {
            var dummy = document.createElement('div');
            dummy.id = 'popupResizeWorkaround';
            document.body.appendChild(dummy);
          }
        }, 1000);
      }
    } else if (e2e.ext.utils.isChromeAppWindow()) {
      var webviewId = location.hash.substring(1);
      helperProxy = new e2e.ext.utils.WebviewHelperProxy(false,
          /** @type {!Webview} */ (goog.asserts.assertObject(
              top.document.getElementById(webviewId))));
      promptCompleteHandler = function() {
        location.reload();
      };
    }

    /** @type {e2e.ext.ui.Prompt} */
    window.promptPage = new e2e.ext.ui.Prompt(helperProxy, isPopout);
    window.promptPage.addOnDisposeCallback(promptCompleteHandler);

    if (isPopout) {
      // Popouts are initialized by an event from the extension popup.
      window.promptPage.startMessageListener();
    } else {
      window.promptPage.decorate(document.body);
    }

    e2e.ext.ui.prompt.bootstrap = true;
  });
}
