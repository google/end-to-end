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
 * @fileoverview All error types that the ECC module can throw.
 */

goog.provide('e2e.error.Error');
goog.provide('e2e.error.InvalidArgumentsError');
goog.provide('e2e.error.UnsupportedError');

goog.require('goog.debug.Error');



/**
 * The base class for crypto errors.
 * @param {*=} opt_msg The custom error message.
 * @constructor
 * @extends {goog.debug.Error}
 */
e2e.error.Error = function(opt_msg) {
  goog.base(this, opt_msg);
};
goog.inherits(e2e.error.Error, goog.debug.Error);



/**
 * Exception used when a function receives an invalid argument.
 * @param {string} message The message with the error details.
 * @constructor
 * @extends {e2e.error.Error}
*/
e2e.error.InvalidArgumentsError = function(message) {
  goog.base(this, message);
};
goog.inherits(e2e.error.InvalidArgumentsError,
              e2e.error.Error);



/**
 * Exception used when the client requests an unimplemented feature.
 * @param {string} message The message with the error details.
 * @constructor
 * @extends {e2e.error.Error}
*/
e2e.error.UnsupportedError = function(message) {
  goog.base(this, message);
};
goog.inherits(e2e.error.UnsupportedError,
              e2e.error.Error);
