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
 * @fileoverview Generates messages from message content.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.handler');

goog.require('e2e.error.UnsupportedError');


/**
 * Object that keeps track of parsers available.
 * @private
 * @type {!Object.<number, function(!e2e.otr.Session, !Uint8Array)>}
 */
e2e.otr.message.handler.handlers_ = {};


/**
 * Registers a message parsing function for a given message type.
 * @param {!function(new:e2e.otr.message.Encoded)} message The message
 *     constructor.
 * @suppress {missingProperties}
 */
e2e.otr.message.handler.add = function(message) {
  e2e.otr.message.handler.handlers_[e2e.otr.byteToNum(message.MESSAGE_TYPE)] =
      message.process;
};


/**
 * Processes a message of a given type.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {!e2e.otr.Byte} type The message type.
 * @param {!Uint8Array} data The data to be processed.
 */
e2e.otr.message.handler.process = function(session, type, data) {
  if (e2e.otr.message.handler.handlers_.hasOwnProperty(type)) {
    e2e.otr.message.handler.handlers_[e2e.otr.byteToNum(type)](session, data);
  }
  throw new e2e.error.UnsupportedError('Message type not supported.');
};
