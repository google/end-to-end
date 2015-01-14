/**
 * @license
 * Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Bootstraps the looking glass.
 */

goog.require('e2e.ext.ui.Glass');
goog.require('e2e.ext.utils.action');
goog.require('e2e.ext.utils.text');
goog.require('goog.crypt.base64');

goog.provide('e2e.ext.ui.glass.bootstrap');

e2e.ext.utils.action.getPreferences(function(preferences) {
  if (preferences.isLookingGlassEnabled()) {
    // Create the looking glass.
    window.addEventListener('message', function(evt) {
      if (!e2e.ext.utils.text.isGmailOrigin(evt.origin)) {
        return;
      }

      var pgpMessage = evt.data ? evt.data : '';
      /** @type {e2e.ext.ui.Glass} */
      window.lookingGlass = new e2e.ext.ui.Glass(
          goog.crypt.base64.decodeString(pgpMessage, true));
      window.lookingGlass.decorate(document.documentElement);
    });

    e2e.ext.ui.glass.bootstrap = true;
  }
}, goog.nullFunction);


/**
 * Specifies whether the looking glass has been bootstrapped.
 * @type {boolean}
 */
e2e.ext.ui.glass.bootstrap = false;
