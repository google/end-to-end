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
 * @fileoverview Defines the DH COMMIT type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.DhCommit');

goog.require('e2e.cipher.DiffieHellman');
goog.require('e2e.hash.Sha256');
goog.require('e2e.otr');
goog.require('e2e.otr.Data');
goog.require('e2e.otr.Mpi');
goog.require('e2e.otr.constants');
goog.require('e2e.otr.constants.MessageType');
goog.require('e2e.otr.error.ParseError');
goog.require('e2e.otr.message.DhKey');
goog.require('e2e.otr.message.Encoded');
goog.require('e2e.otr.message.handler');
goog.require('e2e.otr.util.Iterator');
goog.require('e2e.otr.util.aes128ctr');
goog.require('e2e.random');


goog.scope(function() {

var constants = e2e.otr.constants;
var AUTHSTATE = constants.AUTHSTATE;



/**
 * An OTRv3 DH COMMIT.
 * @constructor
 * @extends {e2e.otr.message.Encoded}
 * @param {!e2e.otr.Session} session The enclosing session.
 */
e2e.otr.message.DhCommit = function(session) {
  goog.base(this, session);
  this.r_ = e2e.random.getRandomBytes(128 / 8);
  this.dh_ = new e2e.cipher.DiffieHellman(constants.DH_MODULUS,
      [constants.DH_GENERATOR]);
  var gxmpi = new e2e.otr.Mpi(new Uint8Array(this.dh_.generate())).serialize();

  // TODO(rcc): Remove when e2e supports TypedArrays
  gxmpi = Array.apply([], gxmpi);

  this.encryptedGxmpi_ =
      Array.apply([], e2e.otr.util.aes128ctr.encrypt(this.r_, gxmpi));
  this.gxmpiHash_ = new e2e.hash.Sha256().hash(gxmpi);
};
goog.inherits(e2e.otr.message.DhCommit, e2e.otr.message.Encoded);


/**
 * Specifies the type of the message.
 * @type {!e2e.otr.Byte}
 */
e2e.otr.message.DhCommit.MESSAGE_TYPE = constants.MessageType.DH_COMMIT;


/** @inheritDoc */
e2e.otr.message.DhCommit.prototype.prepareSend = function() {
  this.session_.authData.r = this.r_;
  this.session_.keymanager.storeKey(this.dh_);
  this.session_.authData.dhcommit = this;
  return goog.base(this, 'prepareSend');
};


/**
 * Serialize the DH COMMIT into a Uint8Array.
 * @return {!Uint8Array} The serialized DH COMMIT.
 */
e2e.otr.message.DhCommit.prototype.serializeMessageContent = function() {
  return e2e.otr.serializeBytes([
    new e2e.otr.Data(new Uint8Array(this.encryptedGxmpi_)),
    new e2e.otr.Data(new Uint8Array(this.gxmpiHash_))
  ]);
};


/**
 * Processes a DH COMMIT message.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {!Uint8Array} data The data to be processed.
 */
e2e.otr.message.DhCommit.process = function(session, data) {
  var iter = new e2e.otr.util.Iterator(data);
  var aesgx = e2e.otr.Data.parse(iter.nextEncoded()).deconstruct();
  var hgx = e2e.otr.Data.parse(iter.nextEncoded()).deconstruct();

  if (iter.hasNext()) {
    throw new e2e.otr.error.ParseError('Malformed DH COMMIT.');
  }

  switch (session.getAuthState()) {
    case AUTHSTATE.AWAITING_DHKEY:
      // TODO(rcc): Remove annotation when closure-compiler #260 is fixed.
      var storedhgx = /** @type {!Uint8Array} */ (e2e.otr.assertState(
          session.authData.hgx, 'h(gx) not defined.'));
      if (e2e.otr.compareByteArray(storedhgx, hgx) > 0) {
        // TODO(rcc): Remove annotation when closure-compiler #260 is fixed.
        session.send(
            /** @type {!e2e.otr.message.DhCommit} */ (e2e.otr.assertState(
            session.authData.dhcommit, 'dhcommit not defined.')));
        return;
      }
      // fall through -- spec: pretend we're in AUTHSTATE_NONE.

    case AUTHSTATE.NONE:
    case AUTHSTATE.AWAITING_SIG:
    case AUTHSTATE.V1_SETUP:
      session.send(new e2e.otr.message.DhKey(session));
      session.setAuthState(AUTHSTATE.AWAITING_REVEALSIG);
      break;

    case AUTHSTATE.AWAITING_REVEALSIG:
      // TODO(rcc): Remove annotation when closure-compiler #260 is fixed.
      session.send(/** @type {!e2e.otr.message.DhKey} */ (e2e.otr.assertState(
          session.authData.dhkey, 'dhkey not defined.')));
      break;

    default:
      e2e.otr.assertState(false, 'Invalid auth state.');
  }

  session.authData.aesgx = aesgx;
  session.authData.hgx = hgx;
};

e2e.otr.message.handler.add(e2e.otr.message.DhCommit);
});  // goog.scope
