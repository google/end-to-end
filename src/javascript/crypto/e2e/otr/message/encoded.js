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
 * @fileoverview Defines the Encoded Message interface.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.Encoded');

goog.require('e2e.otr');
goog.require('e2e.otr.Serializable');
goog.require('e2e.otr.constants');
goog.require('e2e.otr.constants.MessageType');
goog.require('e2e.otr.error.ParseError');
goog.require('e2e.otr.message.Message');
goog.require('e2e.otr.util.Iterator');
goog.require('goog.crypt.base64');


goog.scope(function() {

var constants = e2e.otr.constants;

var MESSAGE_TYPE_VALUES = Object.keys(e2e.otr.constants.MessageType).map(
    function(key) {
      return e2e.otr.byteToNum(e2e.otr.constants.MessageType[key]);
    });



/**
 * An OTRv3 encoded message.
 * @constructor
 * @implements {e2e.otr.Serializable}
 * @extends {e2e.otr.message.Message}
 * @param {!e2e.otr.Session} session The enclosing session.
 */
e2e.otr.message.Encoded = function(session) {
  goog.base(this, session);

  //TODO(rcc): Remove when closure compiler issue #104 (@abstract) is resolved.
  assert(this.constructor != e2e.otr.message.Encoded);

  assert(goog.isDefAndNotNull(this.constructor.MESSAGE_TYPE));
  assert(MESSAGE_TYPE_VALUES.indexOf(
      e2e.otr.byteToNum(this.constructor.MESSAGE_TYPE)) != -1);

  e2e.otr.implements(e2e.otr.message.Encoded, e2e.otr.Serializable);
};
goog.inherits(e2e.otr.message.Encoded, e2e.otr.message.Message);


/**
 * Specifies the type of the message.
 * @type {!e2e.otr.Byte}
 */
e2e.otr.message.Encoded.MESSAGE_TYPE;


/** @inheritDoc */
e2e.otr.message.Encoded.prototype.prepareSend = function() {
  assert(e2e.otr.intToNum(this.session_.instanceTag) >= 0x100);

  var receiverAsNum = e2e.otr.intToNum(this.session_.remoteInstanceTag);
  assert(!receiverAsNum || receiverAsNum >= 0x100);

  return goog.base(this, 'prepareSend');
};


/**
 * Serializes data to be contained in the message.
 * @return {!Uint8Array}
 */
e2e.otr.message.Encoded.prototype.serializeMessageContent =
    goog.abstractMethod;


/**
 * Adds a message header to the data.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {!e2e.otr.Short} mt The message type.
 * @param {!Uint8Array|!e2e.ByteArray} data The message content.
 * @param {boolean=} opt_receiving True if this is for an incoming message.
 * @return {!Uint8Array} The headers + message.
 */
e2e.otr.message.Encoded.addHeader = function(session, mt, data, opt_receiving) {
  return e2e.otr.serializeBytes([
    [0x00, 0x03], // protocol version TODO(rcc): allow other versions.
    mt,
    opt_receiving ? session.remoteInstanceTag : session.instanceTag,
    opt_receiving ? session.instanceTag : session.remoteInstanceTag,
    data
  ]);
};


/**
 * Adds headers to the outgoing message.
 * @param {!Uint8Array|!e2e.ByteArray} data The message content.
 * @param {boolean=} opt_receiving True if this is for an incoming message.
 * @return {!Uint8Array} The headers + message.
 */
e2e.otr.message.Encoded.prototype.addHeader = function(data, opt_receiving) {
  return e2e.otr.message.Encoded.addHeader(this.session_,
      this.constructor.MESSAGE_TYPE, data, opt_receiving);
};


/** @inheritDoc */
e2e.otr.message.Encoded.prototype.serialize = function() {
  return this.addHeader(this.serializeMessageContent());
};


/** @inheritDoc */
e2e.otr.message.Encoded.prototype.toString = function() {
  return constants.MESSAGE_PREFIX.ENCODED +
      goog.crypt.base64.encodeByteArray(this.serialize()) +
      constants.MESSAGE_SUFFIX_ENCODED;
};


/**
 * Parses a serialized message.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {string} data The data to be parsed.
 * @return {*} [type, data]  TODO(adhintz) specify type returned.
 */
e2e.otr.message.Encoded.parse = function(session, data) {
  // Remove prefix and trailing period.
  data = data.slice(constants.MESSAGE_PREFIX.ENCODED.length,
      -constants.MESSAGE_SUFFIX_ENCODED.length);

  var iter = new e2e.otr.util.Iterator(
      new Uint8Array(goog.crypt.base64.decodeStringToByteArray(data)));

  // TODO(rcc): allow other versions.
  if (e2e.otr.shortToNum(iter.next(2)) != 3) {
    throw new e2e.otr.error.ParseError('Invalid message version.');
  }

  var type = iter.next();

  session.remoteInstanceTag = iter.next(4);
  // TODO(adhintz) Investigate if we need this check.
  // Sender seems to be 0 in pidgin-otr, or are we incorrectly parsing?
  /*
  if (e2e.otr.compareByteArray(sender_tag, new Uint8Array([0, 0, 1, 0])) < 0) {
    return null; // ignore invalid sender tag.
  }
  */

  var recipient_tag = iter.next(4);
  var recipient_tag_value = e2e.otr.intToNum(recipient_tag)[0];
  if (recipient_tag_value && (recipient_tag_value < 0x100 ||
      e2e.otr.compareByteArray(recipient_tag, session.instanceTag))) {
    return null; // ignore invalid recipient tag.
  }

  return [type, iter.rest()];
};
});  // goog.scope
