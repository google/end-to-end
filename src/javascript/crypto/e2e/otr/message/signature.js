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
 * @fileoverview Defines the SIGNATURE type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.Signature');

goog.require('e2e.hash.Sha256');
goog.require('e2e.otr');
goog.require('e2e.otr.Data');
goog.require('e2e.otr.Sig');
goog.require('e2e.otr.constants');
goog.require('e2e.otr.constants.MessageType');
goog.require('e2e.otr.message.Message');
goog.require('e2e.otr.message.handler');
goog.require('e2e.otr.util.Iterator');
goog.require('e2e.otr.util.aes128ctr');
goog.require('goog.crypt.Hmac');


goog.scope(function() {

var constants = e2e.otr.constants;
var AUTHSTATE = constants.AUTHSTATE;



/**
 * An OTRv3 SIGNATURE.
 * @constructor
 * @extends {e2e.otr.message.Message}
 * @param {!e2e.otr.Session} session The enclosing session.
 */
e2e.otr.message.Signature = function(session) {
  goog.base(this, session);
};
goog.inherits(e2e.otr.message.Signature, e2e.otr.message.Message);


/**
 * Specifies the type of the message.
 * @type {!e2e.otr.Byte}
 */
e2e.otr.message.Signature.MESSAGE_TYPE = constants.MessageType.SIGNATURE;


/**
 * Serialize the SIGNATURE into a Uint8Array.
 * @return {!Uint8Array} The serialized SIGNATURE.
 */
e2e.otr.message.Signature.prototype.serializeMessageContent = function() {
  var keys = this.session_.deriveKeyValues();
  var keyA = this.session_.keymanager.getKey();
  var ma = new goog.crypt.Hmac(new e2e.hash.Sha256(), keys.m1prime)
      .getHmac(Array.apply([], e2e.otr.serializeBytes([
        keyA.key.generate(),
        this.session_.keymanager.getRemoteKey(new Uint8Array(4)).key,
        this.session_.getPublicKey(),
        keyA.keyid
      ])));

  var xa = Array.apply([], e2e.otr.serializeBytes([
    this.session_.getPublicKey(),
    keyA.keyid,
    new (this.session_.getSigner())(ma)
  ]));

  var sig = new e2e.otr.Data(
      e2e.otr.util.aes128ctr.encrypt(keys.cprime, xa));

  var mac = new goog.crypt.Hmac(new e2e.hash.Sha256(), keys.m2prime)
      .getHmac(Array.apply([], sig.serialize()));

  mac = mac.slice(0, 160 / 8);

  return e2e.otr.serializeBytes([sig, mac]);
};


/**
 * Processes a SIGNATURE message.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {!Uint8Array} data The data to be processed.
 */
e2e.otr.message.Signature.process = function(session, data) {
  switch (session.getAuthState()) {
    case AUTHSTATE.AWAITING_SIG:
      var iter = new e2e.otr.util.Iterator(data);
      var aesxa = e2e.otr.Data.parse(iter.nextEncoded()).deconstruct();
      var mac = iter.next(20);

      var keys = session.deriveKeyValues();

      var calculatedMac = new goog.crypt.Hmac(new e2e.hash.Sha256(),
          keys.m2prime).getHmac(Array.apply([], aesxa));

      calculatedMac = calculatedMac.slice(0, 160 / 8);

      if (e2e.otr.compareByteArray(mac, calculatedMac)) {
        // TODO(rcc): Log the error and/or warn the user.
        return;
      }

      var xa = e2e.otr.util.aes128ctr.decrypt(keys.cprime, aesxa);

      iter = new e2e.otr.util.Iterator(xa);

      // TODO(rcc): Make Type.parse accept Iterator to pull appropriate data.
      var pubAType = iter.next(2);
      var pubA = {
        p: Array.apply([], iter.nextEncoded()),
        q: Array.apply([], iter.nextEncoded()),
        g: Array.apply([], iter.nextEncoded()),
        y: Array.apply([], iter.nextEncoded())
      };
      var keyidA = iter.next(4);
      var sigma = e2e.otr.Sig.parse(iter.next(40));

      var ma = new goog.crypt.Hmac(new e2e.hash.Sha256(), keys.m1prime)
          .getHmac(Array.apply([], e2e.otr.serializeBytes([
            session.keymanager.getRemoteKey(new Uint8Array(4)).key,
            session.keymanager.getKey().key.generate(),
            pubA,
            keyidA
          ])));

      if (!e2e.otr.Sig.verify(pubA, ma, sigma)) {
        // TODO(rcc): Log the error and/or warn the user.
        return;
      }

      session.setAuthState(AUTHSTATE.NONE);
      session.setMsgState(constants.MSGSTATE.ENCRYPTED);

      // TODO(rcc): Send any stored messages.

      break;

    case AUTHSTATE.NONE:
    case AUTHSTATE.AWAITING_DHKEY:
    case AUTHSTATE.AWAITING_REVEALSIG:
      return;

    default:
      e2e.otr.assertState(false, 'Invalid auth state.');
  }
};

e2e.otr.message.handler.add(e2e.otr.message.Signature);
});  // goog.scope
