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
 * @fileoverview Defines the Message interface.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.Message');

goog.require('e2e');
goog.require('e2e.otr');
goog.require('e2e.otr.constants');
goog.require('e2e.otr.error.NotImplementedError');
goog.require('goog.asserts');
goog.require('goog.string');


goog.scope(function() {

var constants = e2e.otr.constants;


/**
 * An OTRv3 message.
 * @constructor
 * @param {!e2e.otr.Session} session The enclosing session.
 */
e2e.otr.message.Message = function(session) {
  //TODO(user): Remove when closure compiler issue #104 (@abstract) is resolved.
  assert(this.constructor != e2e.otr.message.Message);
  assert(goog.isFunction(this.constructor.process));

  e2e.otr.implements(e2e.otr.message.Message, e2e.otr.Serializable);
};


/**
 * Serializes a message to string.
 * @return {string} The serialized message.
 */
e2e.otr.message.Message.prototype.toString = goog.abstractMethod;


/**
 * Processes a serialized message.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {string} data The data to be processed.
 */
e2e.otr.message.Message.process = function(session, data) {
  if (goog.string.startsWith(data, constants.MESSAGE_PREFIX.ENCODED)) {
    e2e.otr.message.Encoded.process(session, data);

  } else if (goog.string.startsWith(data, constants.MESSAGE_PREFIX.ERROR)) {
    throw new e2e.otr.error.NotImplementedError('Not yet implemented.');

  } else if (e2e.otr.message.Query.parseEmbedded(data)) {
    e2e.otr.message.Query.process(session, data);

  } else {
    // TODO(user): Support for non-OTR messages, tagged plaintext messages.
    throw new e2e.otr.error.NotImplementedError('Not yet implemented.');
  }
};
});
