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
 * @fileoverview All error types that the e2e module can throw.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.error.Error');
goog.provide('e2e.otr.error.IllegalStateError');
goog.provide('e2e.otr.error.InvalidArgumentsError');
goog.provide('e2e.otr.error.NotImplementedError');
goog.provide('e2e.otr.error.ParseError');

goog.require('goog.debug.Error');



/**
 * The base class for End to End otr errors.
 * @param {*=} opt_msg The custom error message.
 * @constructor
 * @extends {goog.debug.Error}
 */
e2e.otr.error.Error = function(opt_msg) {
  goog.base(this, opt_msg);
};
goog.inherits(e2e.otr.error.Error, goog.debug.Error);



/**
 * Exception used when a function receives an invalid argument.
 * @param {string} message The message with the error details.
 * @constructor
 * @extends {e2e.otr.error.Error}
 */
e2e.otr.error.InvalidArgumentsError = function(message) {
  goog.base(this, message);
};
goog.inherits(e2e.otr.error.InvalidArgumentsError, e2e.otr.error.Error);



/**
 * Class to represent errors where a class is missing required members.
 * @param {string} message The message with the error details.
 * @constructor
 * @extends {e2e.otr.error.Error}
 */
e2e.otr.error.NotImplementedError = function(message) {
  goog.base(this, message);
};
goog.inherits(e2e.otr.error.NotImplementedError, e2e.otr.error.Error);



/**
 * Class to represent all parsing errors.
 * @param {string} message The message with the error details.
 * @constructor
 * @extends {e2e.otr.error.Error}
 */
e2e.otr.error.ParseError = function(message) {
  goog.base(this, message);
};
goog.inherits(e2e.otr.error.ParseError, e2e.otr.error.Error);



/**
 * Class to represent errors where the state machine is in an invalid state.
 * @param {string} message The message with the error details.
 * @constructor
 * @extends {e2e.otr.error.Error}
 */
e2e.otr.error.IllegalStateError = function(message) {
  goog.base(this, message);
};
goog.inherits(e2e.otr.error.IllegalStateError, e2e.otr.error.Error);
