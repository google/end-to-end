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
 * @fileoverview Defines the REVEAL SIGNATURE type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.RevealSignature');

goog.require('e2e.hash.Sha256');
goog.require('e2e.otr');
goog.require('e2e.otr.Data');
goog.require('e2e.otr.Mpi');
goog.require('e2e.otr.Sig');
goog.require('e2e.otr.constants');
goog.require('e2e.otr.constants.MessageType');
goog.require('e2e.otr.error.ParseError');
goog.require('e2e.otr.message.Message');
goog.require('e2e.otr.message.Signature');
goog.require('e2e.otr.message.handler');
goog.require('e2e.otr.util.Iterator');
goog.require('e2e.otr.util.aes128ctr');
goog.require('goog.crypt.Hmac');


goog.scope(function() {

var constants = e2e.otr.constants;
var AUTHSTATE = constants.AUTHSTATE;



/**
 * An OTRv3 REVEAL SIGNATURE.
 * @constructor
 * @extends {e2e.otr.message.Encoded}
 * @param {!e2e.otr.Session} session The enclosing session.
 */
e2e.otr.message.RevealSignature = function(session) {
  goog.base(this, session);
};
goog.inherits(e2e.otr.message.RevealSignature, e2e.otr.message.Encoded);


/**
 * Specifies the type of the message.
 * @type {!e2e.otr.Byte}
 */
e2e.otr.message.RevealSignature.MESSAGE_TYPE =
    constants.MessageType.REVEAL_SIGNATURE;


/** @inheritDoc */
e2e.otr.message.RevealSignature.prototype.prepareSend = function() {
  this.session_.authData.revealsignature = this;
  return goog.base(this, 'prepareSend');
};


/**
 * Serialize the REVEAL SIGNATURE into a Uint8Array.
 * @return {!Uint8Array} The serialized REVEAL SIGNATURE.
 */
e2e.otr.message.RevealSignature.prototype.serializeMessageContent = function() {
  var keys = this.session_.deriveKeyValues();
  var keyB = this.session_.keymanager.getKey();
  var mb = new goog.crypt.Hmac(new e2e.hash.Sha256(), keys.m1)
      .getHmac(Array.apply([], e2e.otr.serializeBytes([
        keyB.key.generate(),
        this.session_.keymanager.getRemoteKey(new Uint8Array(4)).key,
        this.session_.getPublicKey(),
        keyB.keyid
      ])));

  var xb = Array.apply([], e2e.otr.serializeBytes([
    this.session_.getPublicKey(),
    keyB.keyid,
    new (this.session_.getSigner())(mb)
  ]));

  var sig = new e2e.otr.Data(e2e.otr.util.aes128ctr.encrypt(keys.c, xb));

  var mac = new goog.crypt.Hmac(new e2e.hash.Sha256(), keys.m2)
      .getHmac(Array.apply([], sig.serialize()));
  mac = mac.slice(0, 160 / 8);

  return e2e.otr.serializeBytes([
    new e2e.otr.Data(new Uint8Array(this.session_.authData.r)), sig, mac]);
};


/**
 * Processes a REVEAL SIGNATURE message.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {!Uint8Array} data The data to be processed.
 */
e2e.otr.message.RevealSignature.process = function(session, data) {
  switch (session.getAuthState()) {
    case AUTHSTATE.AWAITING_REVEALSIG:
      var iter = new e2e.otr.util.Iterator(data);
      var r = e2e.otr.Data.parse(iter.nextEncoded()).deconstruct();
      var aesxb = iter.nextEncoded();
      var mac = iter.next(20);

      if (iter.hasNext() || mac.length != 20) {
        throw new e2e.otr.error.ParseError('Malformed REVEAL SIGNATURE.');
      }

      // TODO(rcc): Remove annotation when closure-compiler #260 is fixed.
      var gxmpi = e2e.otr.util.aes128ctr.decrypt(r, /** @type {!Uint8Array} */ (
          e2e.otr.assertState(session.authData.aesgx, 'AES(gx) not defined')));
      var gxmpiHash = new e2e.hash.Sha256().hash(Array.apply([], gxmpi));

      var gx = Array.apply([], e2e.otr.Mpi.parse(gxmpi).deconstruct());
      var dh = session.keymanager.getKey().key;

      if (
          // h(g^x) mismatch.
          e2e.otr.compareByteArray(/** @type {!Uint8Array} */ (
          e2e.otr.assertState(session.authData.hgx, 'hgx not defined')),
          gxmpiHash) ||

          // Or Invalid g^x.
          !dh.isValidBase(gx)
      ) {
        // TODO(rcc): Log the error and/or warn the user.
        return;
      }

      var s = dh.generate(gx);
      var keys = session.deriveKeyValues(s);

      var calculatedMac = new goog.crypt.Hmac(new e2e.hash.Sha256(), keys.m2)
          .getHmac(Array.apply([], aesxb));

      calculatedMac = calculatedMac.slice(0, 160 / 8);

      if (e2e.otr.compareByteArray(Array.apply([], mac), calculatedMac)) {
        // TODO(rcc): Log the error and/or warn the user.
        return;
      }

      var xb = e2e.otr.util.aes128ctr.decrypt(keys.c,
          e2e.otr.Data.parse(aesxb).deconstruct());

      iter = new e2e.otr.util.Iterator(xb);
      var pubBType = iter.next(2);
      // TODO(rcc): Make Type.parse accept Iterator to pull appropriate data.
      var pubB = new e2e.otr.pubkey.Dsa({
        p: Array.apply([], e2e.otr.Mpi.parse(iter.nextEncoded()).deconstruct()),
        q: Array.apply([], e2e.otr.Mpi.parse(iter.nextEncoded()).deconstruct()),
        g: Array.apply([], e2e.otr.Mpi.parse(iter.nextEncoded()).deconstruct()),
        y: Array.apply([], e2e.otr.Mpi.parse(iter.nextEncoded()).deconstruct())
      });
      var keyidB = iter.next(4);
      var sigmb = e2e.otr.Sig.parse(iter.next(40));

      if (iter.hasNext()) {
        throw new e2e.otr.error.ParseError('Malformed xb in REVEAL SIGNATURE.');
      }

      var mb = new goog.crypt.Hmac(new e2e.hash.Sha256(), keys.m1)
          .getHmac(Array.apply([], e2e.otr.serializeBytes([
            gx,
            session.keymanager.getKey().key.generate(),
            pubB,
            keyidB
          ])));

      if (!e2e.otr.Sig.verify(pubB.deconstruct(), mb, sigmb)) {
        // TODO(rcc): Log the error and/or warn the user.
        return;
      }

      session.keymanager.storeRemoteKey(keyidB, gx);
      session.authData.s = s;
      session.send(new e2e.otr.message.Signature(session));
      session.setAuthState(AUTHSTATE.NONE);
      session.setMsgState(constants.MSGSTATE.ENCRYPTED);

      // TODO(rcc): Send any stored messages.

      break;

    case AUTHSTATE.NONE:
    case AUTHSTATE.AWAITING_DHKEY:
    case AUTHSTATE.AWAITING_SIG:
    case AUTHSTATE.V1_SETUP:
      return;

    default:
      e2e.otr.assertState(false, 'Invalid auth state.');
  }
};

e2e.otr.message.handler.add(e2e.otr.message.RevealSignature);
});  // goog.scope
