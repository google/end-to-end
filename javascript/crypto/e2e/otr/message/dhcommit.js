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
 * @fileoverview Defines the DH COMMIT type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.DhCommit');

goog.require('e2e');
goog.require('e2e.cipher.Aes');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.DiffieHellman');
goog.require('e2e.ciphermode.Ctr');
goog.require('e2e.hash.Sha256');
goog.require('e2e.otr');
goog.require('e2e.otr.Data');
goog.require('e2e.otr.Mpi');
goog.require('e2e.otr.constants');
goog.require('e2e.otr.error.NotImplementedError');
goog.require('e2e.otr.error.ParseError');
goog.require('e2e.otr.message.Encoded');
goog.require('e2e.random');


goog.scope(function() {

var constants = e2e.otr.constants;


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
  this.gx_ = this.dh_.generate();
  var gxmpi = new e2e.otr.Mpi(new Uint8Array(this.gx_)).serialize();

  // TODO(user): Remove when e2e supports TypedArrays
  gxmpi = Array.apply([], gxmpi);

  var aes128 = new e2e.cipher.Aes(e2e.cipher.Algorithm.AES128, {key: this.r_});

  var encryptedGxmpi = new e2e.ciphermode.Ctr(aes128)
      .encrypt(gxmpi, goog.array.repeat(0, aes128.blockSize));
  this.encryptedGxmpi_ = e2e.async.Result.getValue(encryptedGxmpi);
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
  this.session_.authData.dh = this.dh_;
  this.session_.authData.gx = this.gx_;
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
  throw new e2e.otr.error.NotImplementedError('This is not yet implemented.');
};
});
