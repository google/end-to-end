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
 * @fileoverview Defines the DH KEY type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.DhKey');

goog.require('e2e.cipher.DiffieHellman');
goog.require('e2e.otr');
goog.require('e2e.otr.Mpi');
goog.require('e2e.otr.constants');
goog.require('e2e.otr.constants.MessageType');
goog.require('e2e.otr.message.Encoded');
goog.require('e2e.otr.message.RevealSignature');
goog.require('e2e.otr.message.handler');


goog.scope(function() {

var constants = e2e.otr.constants;
var AUTHSTATE = constants.AUTHSTATE;



/**
 * An OTRv3 DH KEY.
 * @constructor
 * @extends {e2e.otr.message.Encoded}
 * @param {!e2e.otr.Session} session The enclosing session.
 */
e2e.otr.message.DhKey = function(session) {
  goog.base(this, session);
  this.dh_ = new e2e.cipher.DiffieHellman(constants.DH_MODULUS,
      [constants.DH_GENERATOR]);
  this.gy_ = this.dh_.generate();
};
goog.inherits(e2e.otr.message.DhKey, e2e.otr.message.Encoded);


/**
 * Specifies the type of the message.
 * @type {!e2e.otr.Byte}
 */
e2e.otr.message.DhKey.MESSAGE_TYPE = constants.MessageType.DH_KEY;


/** @inheritDoc */
e2e.otr.message.DhKey.prototype.prepareSend = function() {
  this.session_.authData.r = null;
  this.session_.keymanager.storeKey(this.dh_);
  this.session_.authData.dhkey = this;
  return goog.base(this, 'prepareSend');
};


/**
 * Serialize the DH KEY into a Uint8Array.
 * @return {!Uint8Array} The serialized DH KEY.
 */
e2e.otr.message.DhKey.prototype.serializeMessageContent = function() {
  return new e2e.otr.Mpi(new Uint8Array(this.gy_)).serialize();
};


/**
 * Processes a DH KEY message.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {!Uint8Array} data The data to be processed.
 */
e2e.otr.message.DhKey.process = function(session, data) {
  var gy = Array.apply([], e2e.otr.Mpi.parse(data).deconstruct());
  var dh = session.keymanager.getKey().key;
  if (!dh.isValidBase(gy)) {
    // TODO(rcc): Log the error and/or warn the user.
    return;
  }

  switch (session.getAuthState()) {
    case AUTHSTATE.AWAITING_DHKEY:
      session.keymanager.storeRemoteKey(new Uint8Array(4), gy);
      session.authData.s = dh.generate(gy);
      session.send(new e2e.otr.message.RevealSignature(session));
      session.setAuthState(AUTHSTATE.AWAITING_SIG);
      break;

    case AUTHSTATE.AWAITING_SIG:
      if (e2e.otr.compareByteArray(gy,
          session.keymanager.getRemoteKey(new Uint8Array(4)).key) == 0) {
        // TODO(rcc): Remove annotation when closure-compiler #260 is fixed.
        session.send(/** @type {!e2e.otr.message.RevealSignature} */ (
            e2e.otr.assertState(session.authData.revealsignature,
            'revealsignature not defined.')));
      } else return;
      break;

    case AUTHSTATE.NONE:
    case AUTHSTATE.AWAITING_REVEALSIG:
    case AUTHSTATE.V1_SETUP:
      return;

    default:
      e2e.otr.assertState(false, 'Invalid auth state.');
  }
};

e2e.otr.message.handler.add(e2e.otr.message.DhKey);
});  // goog.scope
