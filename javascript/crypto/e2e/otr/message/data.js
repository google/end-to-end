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
 * @fileoverview Defines the DATA message type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.Data');

goog.require('e2e');
goog.require('e2e.otr');
goog.require('e2e.otr.Data');
goog.require('e2e.otr.constants');
goog.require('e2e.otr.error.NotImplementedError');
goog.require('e2e.otr.message.Encoded');
goog.require('e2e.otr.util.Iterator');


goog.scope(function() {

var constants = e2e.otr.constants;
var MSGSTATE = constants.MSGSTATE;


/**
 * An OTRv3 DATA message.
 * @constructor
 * @extends {e2e.otr.message.Encoded}
 * @param {!e2e.otr.Session} session The enclosing session.
 */
e2e.otr.message.Data = function(session) {
  goog.base(this, session);
};
goog.inherits(e2e.otr.message.Data, e2e.otr.message.Encoded);


/**
 * Specifies the type of the message.
 * @type {!e2e.otr.Byte}
 */
e2e.otr.message.Data.MESSAGE_TYPE = constants.MessageType.DATA;


/** @inheritDoc */
e2e.otr.message.Data.prototype.prepareSend = function() {
  throw new e2e.otr.error.NotImplementedError('Not yet implemented.');
};


/**
 * Serialize the DATA message into a Uint8Array.
 * @return {!Uint8Array} The serialized DATA message.
 */
e2e.otr.message.Data.prototype.serializeMessageContent = function() {
  throw new e2e.otr.error.NotImplementedError('Not yet implemented.');
};


/**
 * Processes a DATA message message.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {!Uint8Array} data The data to be processed.
 */
e2e.otr.message.Data.process = function(session, data) {
  throw new e2e.otr.error.NotImplementedError('Not yet implemented.');
};
});
