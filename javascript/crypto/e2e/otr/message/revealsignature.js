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
 * @fileoverview Defines the REVEAL SIGNATURE type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.RevealSignature');

goog.require('e2e');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.ciphermode.Ctr');
goog.require('e2e.hash.Sha256');
goog.require('e2e.otr.Data');
goog.require('e2e.otr.Sig');
goog.require('e2e.otr.constants');
goog.require('e2e.otr.error.NotImplementedError');
goog.require('e2e.otr.message.Message');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.factory');
goog.require('goog.crypt.Hmac');


goog.scope(function() {

var constants = e2e.otr.constants;


/**
 * An OTRv3 REVEAL SIGNATURE.
 * @constructor
 * @extends {e2e.otr.message.Message}
 * @param {!e2e.otr.Session} session The enclosing session.
 */
e2e.otr.message.RevealSignature = function(session) {
  goog.base(this, session);
};
goog.inherits(e2e.otr.message.RevealSignature, e2e.otr.message.Message);


/**
 * Specifies the type of the message.
 * @type {!e2e.otr.Byte}
 */
e2e.otr.message.RevealSignature.MESSAGE_TYPE =
    constants.MessageType.REVEAL_SIGNATURE;


/**
 * Serialize the REVEAL SIGNATURE into a Uint8Array.
 * @return {!Uint8Array} The serialized REVEAL SIGNATURE.
 */
e2e.otr.message.RevealSignature.prototype.serializeMessageContent = function() {
  this.session_.s = this.session_.authData.dh.generate(this.session_.gy);
  var keys = this.session_.deriveKeyValues();
  var mb = new goog.crypt.Hmac(new e2e.hash.sha256(), keys.m1)
      .getHmac(Array.apply([], e2e.otr.serializeBytes([
    this.session_.authData.gx,
    this.session_.authData.gy,
    this.session_.getPublicKey(),
    this.session_.getKeyId()
  ])));

  var xb = Array.apply([], e2e.otr.serializeBytes([
    this.session_.getPublicKey(),
    this.session_.getKeyId(),
    new e2e.otr.Sig(this.session_.getPrivateKey(), mb)
  ]));

  var aes128ctr = new e2e.ciphermode.Ctr(new e2e.cipher.Aes(
      e2e.cipher.Algorithm.AES128, {key: keys.c}));

  var sig = new e2e.otr.Data(new Uint8Array(e2e.async.Result.getValue(aes128ctr
      .encrypt(xb, goog.array.repeat(0, aes128ctr.cipher.blockSize)))));

  var mac = new goog.crypt.Hmac(new e2e.hash.Sha256(), keys.m2)
      .getHmac(Array.apply([], sig.serialize()));

  return e2e.otr.serializeBytes([
    new e2e.otr.Data(new Uint8Array(this.session_.authData.r)), sig, mac]);
};


/**
 * Processes a REVEAL SIGNATURE message.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {!Uint8Array} data The data to be processed.
 */
e2e.otr.message.RevealSignature.process = function(session, data) {
  throw new e2e.otr.error.NotImplementedError('This is not yet implemented.');
};
});
