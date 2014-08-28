// Copyright 2014 Google Inc. All Rights Reserved.
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
 * @fileoverview OTR key manager.
 *
 * @author rcc@google.com (Ryan Chan)
 */


goog.provide('e2e.otr.KeyManager');

goog.require('e2e.otr.error.NotImplementedError');


/**
 * Manages keys for OTR.
 * @constructor
 */
e2e.otr.KeyManager = function() {
   // Start key ids at first valid serial, 1.
  this.nextKeyId_ = new Uint8Array([0, 0, 0, 1]);
};


/**
 * The keyid of the last received remote key.
 * @type {!e2e.otr.Int}
 */
e2e.otr.KeyManager.prototype.lastRemoteKey_;

/**
 * Gets the key for a given keyid.
 * @param {!Uint8Array=} opt_keyid The keyid associated with the key.
 * @return {!{keyid: !Uint8Array, key: !e2e.cipher.DiffieHellman}}
 */
e2e.otr.KeyManager.prototype.getKey = function(opt_keyid) {
  throw new e2e.otr.error.NotImplementedError('Not yet implemented.');
};


/**
 * Stores a DH key.
 * @param {!e2e.cipher.DiffieHellman} key The key to store.
 */
e2e.otr.KeyManager.prototype.storeKey = function(key) {
  throw new e2e.otr.error.NotImplementedError('Not yet implemented.');
};


/**
 * Stores remote party's keyid/key.
 * @param {!Uint8Array} keyid The keyid provided by the remote party.
 * @param {!e2e.ByteArray} pubkey The key associated with the key id.
 */
e2e.otr.KeyManager.prototype.storeRemoteKey = function(keyid, pubkey) {
  throw new e2e.otr.error.NotImplementedError('Not yet implemented.');
};


/**
 * Gets remote key for a given keyid.
 * @param {!Uint8Array=} opt_keyid The keyid associated with the key.
 * @return {!e2e.ByteArray} The key associated with the key id.
 */
e2e.otr.KeyManager.prototype.getRemoteKey = function(opt_keyid) {
  throw new e2e.otr.error.NotImplementedError('Not yet implemented.');
};
