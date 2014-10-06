// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * @fileoverview Bootstraps the looking glass.
 */

goog.require('e2e.ext.ui.Glass');
goog.require('goog.crypt.base64');

goog.provide('e2e.ext.ui.glass.bootstrap');


/**
 * The list of origins that can use the looking glass.
 * @type {!Array.<string>}
 * @const
 */
var LOOKING_GLASS_WHITELIST = [
  'https://mail.google.com'
];

// Create the looking glass.
window.addEventListener('message', function(evt) {
  if (LOOKING_GLASS_WHITELIST.indexOf(evt.origin) == -1) {
    return;
  }

  var pgpMessage = evt.data ? evt.data : '';
  /** @type {e2e.ext.ui.Glass} */
  window.lookingGlass = new e2e.ext.ui.Glass(
      goog.crypt.base64.decodeString(pgpMessage, true));
  window.lookingGlass.decorate(document.documentElement);
});


/**
 * Specifies whether the looking glass has been bootstrapped.
 * @type {boolean}
 */
e2e.ext.ui.glass.bootstrap = true;
