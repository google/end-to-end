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
 * @fileoverview Defines the DH KEY type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.DhKey');

goog.require('e2e');
goog.require('e2e.cipher.DiffieHellman');
goog.require('e2e.otr.Mpi');
goog.require('e2e.otr.constants');
goog.require('e2e.otr.error.NotImplementedError');
goog.require('e2e.otr.message.Message');
goog.require('e2e.random');


goog.scope(function() {

var constants = e2e.otr.constants;


/**
 * An OTRv3 DH KEY.
 * @constructor
 * @extends {e2e.otr.message.Message}
 * @param {!e2e.otr.Session} session The enclosing session.
 */
e2e.otr.message.DhKey = function(session) {
  goog.base(this, session);
  this.dh = new e2e.cipher.DiffieHellman(constants.DH_MODULUS,
      [constants.DH_GENERATOR]);
};
goog.inherits(e2e.otr.message.DhKey, e2e.otr.message.Message);


/**
 * Specifies the type of the message.
 * @type {!e2e.otr.Byte}
 */
e2e.otr.message.DhKey.MESSAGE_TYPE = constants.MessageType.DH_KEY;


/**
 * Serialize the DH KEY into a Uint8Array.
 * @return {!Uint8Array} The serialized DH KEY.
 */
e2e.otr.message.DhKey.prototype.serializeMessageContent = function() {
  return new e2e.otr.Mpi(new Uint8Array(this.dh.generate())).serialize();
};


/**
 * Processes a DH KEY message.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {!Uint8Array} data The data to be processed.
 */
e2e.otr.message.DhKey.process = function(session, data) {
  throw new e2e.otr.error.NotImplementedError('This is not yet implemented.');
};
});
