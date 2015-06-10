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
 * @fileoverview OTR key manager.
 *
 * @author rcc@google.com (Ryan Chan)
 */


goog.provide('e2e.otr.KeyManager');

goog.require('e2e');
goog.require('e2e.otr');



/**
 * Manages keys for OTR.
 * @constructor
 */
e2e.otr.KeyManager = function() {
  // Start key ids at first valid serial, 1.
  /**
   * @private
   * @type {!Object.<number, !e2e.cipher.DiffieHellman>}
   */
  this.localKeys_ = {};
  /**
   * @private
   * @type {!Object.<number, !e2e.ByteArray>}
   */
  this.remoteKeys_ = {};
  this.lastLocal_ = new Uint8Array(4);
  this.lastRemote_ = new Uint8Array(4);
};


/**
 * The keyid of the last received remote key.
 * @type {!e2e.otr.Int}
 */
e2e.otr.KeyManager.prototype.lastRemoteKey_;


/**
 * Gets the key for a given keyid or the most recent key.
 * @param {!e2e.otr.Int=} opt_keyid The keyid associated with the key.
 * @return {!{keyid: !e2e.otr.Int, key: !e2e.cipher.DiffieHellman}} The key and
 *     keyid.
 */
e2e.otr.KeyManager.prototype.getKey = function(opt_keyid) {
  var id = opt_keyid || this.lastLocal_;
  var key = this.localKeys_[e2e.otr.intToNum(id)];
  e2e.otr.assertState(key, 'No key was found for the given keyid.');
  return { keyid: new Uint8Array(id), key: key };
};


/**
 * Stores a DH key.
 * @param {!e2e.cipher.DiffieHellman} key The key to store.
 */
e2e.otr.KeyManager.prototype.storeKey = function(key) {
  var id = e2e.otr.intToNum(e2e.incrementByteArray(this.lastLocal_));
  this.localKeys_[id] = key;
};


/**
 * Stores remote party's keyid/key.
 * @param {!e2e.otr.Int} keyid The keyid provided by the remote party.
 * @param {!e2e.ByteArray} pubkey The key associated with the key id.
 */
e2e.otr.KeyManager.prototype.storeRemoteKey = function(keyid, pubkey) {
  this.remoteKeys_[e2e.otr.intToNum(keyid)] = pubkey;
  this.lastRemote_ = keyid;
};


/**
 * Gets remote key for a given keyid or the most recent key.
 * @param {!e2e.otr.Int=} opt_keyid The keyid associated with the key.
 * @return {!{keyid: !e2e.otr.Int, key: !e2e.ByteArray}} The key and keyid.
 */
e2e.otr.KeyManager.prototype.getRemoteKey = function(opt_keyid) {
  var id = opt_keyid || this.lastRemote_;
  var key = this.remoteKeys_[e2e.otr.intToNum(id)];
  e2e.otr.assertState(key, 'No key was found for the given keyid.');
  return { keyid: new Uint8Array(id), key: key };
};
