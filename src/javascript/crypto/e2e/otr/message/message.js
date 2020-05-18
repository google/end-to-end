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
 * @fileoverview Defines the Message interface.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.Message');



goog.scope(function() {



/**
 * An OTRv3 message.
 * @constructor
 * @param {!e2e.otr.Session} session The enclosing session.
 */
e2e.otr.message.Message = function(session) {
  //TODO(rcc): Remove when closure compiler issue #104 (@abstract) is resolved.
  assert(this.constructor != e2e.otr.message.Message);
  assert(goog.isFunction(this.constructor.process));

  this.session_ = session;
};


/**
 * Method called by session to prepare for sending.
 * @return {string} The message being sent.
 */
e2e.otr.message.Message.prototype.prepareSend = function() {
  return this.toString();
};


/**
 * Serializes a message to string.
 * @return {string} The serialized message.
 */
e2e.otr.message.Message.prototype.toString = goog.abstractMethod;


});  // goog.scope
