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
goog.require('e2e.otr.message.handler');
goog.require('e2e.otr.util.Iterator');
goog.require('goog.asserts');


goog.scope(function() {

var constants = e2e.otr.constants;

var MESSAGE_TYPE_VALUES = Object.keys(e2e.otr.constants.MessageType).map(
    function(key) {
  return e2e.otr.byteToNum(e2e.otr.constants.MessageType[key]);
});


/**
 * An OTRv3 message.
 * @constructor
 * @implements {e2e.otr.Serializable}
 * @param {e2e.otr.Int} sender The sender instance tag.
 * @param {e2e.otr.Int} receiver The receiver instance tag.
 */
e2e.otr.message.Message = function(sender, receiver) {
  //TODO(user): Remove when closure compiler issue #104 (@abstract) is resolved.
  assert(this.constructor != e2e.otr.message.Message);

  assert(goog.isDefAndNotNull(this.constructor.MESSAGE_TYPE));
  assert(goog.isFunction(this.constructor.process));
  assert(MESSAGE_TYPE_VALUES.indexOf(
      e2e.otr.byteToNum(this.constructor.MESSAGE_TYPE)) != -1);
  assert(e2e.otr.intToNum(sender) >= 0x100);

  var receiverAsNum = e2e.otr.intToNum(receiver);
  assert(!receiverAsNum || receiverAsNum >= 0x100);

  this.sender_ = sender;
  this.receiver_ = receiver;

  e2e.otr.implements(e2e.otr.message.Message, e2e.otr.Serializable);
};


/**
 * Specifies the type of the message.
 * @type {!e2e.otr.Byte}
 */
e2e.otr.message.Message.MESSAGE_TYPE;


/**
 * Serializes data to be contained in the message.
 * @return {!Uint8Array}
 */
e2e.otr.message.Message.prototype.serializeMessageContent = goog.abstractMethod;


/**
 * Wrapper for message serialization with version and message type.
 * @return {!Uint8Array} The serialized message.
 */
e2e.otr.message.Message.prototype.serialize = function() {
  return e2e.otr.serializeBytes([
    [0x00, 0x03], // protocol version TODO(user): allow other versions.
    this.constructor.MESSAGE_TYPE,
    this.sender_,
    this.receiver_,
    this.serializeMessageContent()
  ]);
};


/**
 * Processes a serialized message.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {!Uint8Array} serialized The serialized data.
 */
e2e.otr.message.Message.process = function(session, serialized) {
  var iter = new e2e.otr.util.Iterator(serialized);

  // TODO(user): allow other versions.
  if (e2e.otr.shortToNum(iter.next(2)) != 3) {
    throw new e2e.otr.error.ParseError('Invalid message version.');
  }

  var type = iter.next();

  if (e2e.otr.intToNum(iter.next(4)) < 0x100) {
    return; // ignore invalid sender tag.
  }

  var recipient_tag = e2e.otr.intToNum(iter.next(4))[0];
  if (recipient_tag && recipient_tag < 0x100) {
    return; // ignore invalid recipient tag.
  }

  e2e.otr.message.handler.process(session, type, iter.rest());
};
});
