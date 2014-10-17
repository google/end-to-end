/**
 * @license
 * Copyright 2012 Google Inc. All rights reserved.
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
 * @fileoverview Encodes.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.pkcs.Error');

goog.require('goog.debug.Error');



/**
 * Represents errors triggered by PKCS.
 * @param {string} msg The message generated form pkcs.
 * @extends {goog.debug.Error}
 * @constructor
 */
e2e.pkcs.Error = function(msg) {
  goog.base(this, msg);
};
goog.inherits(e2e.pkcs.Error, goog.debug.Error);
