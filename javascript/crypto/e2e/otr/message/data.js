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
goog.require('e2e.hash.Sha1');
goog.require('e2e.otr');
goog.require('e2e.otr.Data');
goog.require('e2e.otr.Mpi');
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
 * Generates the keys used for AES and SHA1-HMAC of data messages.
 * @param {!e2e.cipher.DiffieHellman} localDh The DH of the local key component.
 * @param {!e2e.ByteArray} remoteKey The remote key component.
 * @return {!{sendingAes: !e2e.ByteArray, receivingAes: !e2e.ByteArray,
 *     sendingMac: !e2e.ByteArray, receivingMac: !e2e.ByteArray}}
 */
e2e.otr.message.Data.prototype.computeKeys = function(localDh, remoteKey) {
  var highEnd = e2e.otr.compareByteArray(localDh.generate(), remoteKey) > 0;
  var sendbyte = highEnd ? 0x01 : 0x02;
  var recvbyte = highEnd ? 0x02 : 0x01;
  var secret = localDh.generate(remoteKey);
  var secbytes = new e2e.otr.Mpi(new Uint8Array(secret)).serialize();

  /**
   * h1 function as defined in OTR spec.
   * @param {number} b The input byte.
   * @return {!e2e.ByteArray} The 160-bit output of the SHA-1 hash of the
   *     (5+len) bytes consisting of the byte b, followed by secbytes.
   */
  var h1 = function(b) {
    return new e2e.hash.Sha1().hash([b].concat(secbytes));
  };

  var sendingAes = h1(sendbyte).slice(0, 16);
  var receivingAes = h1(recvbyte).slice(0, 16);

  return {
    sendingAes: sendingAes,
    sendingMac: new e2e.hash.Sha1().hash(sendingAes),
    receivingAes: receivingAes,
    receivingMac: new e2e.hash.Sha1().hash(receivingAes)
  };
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
