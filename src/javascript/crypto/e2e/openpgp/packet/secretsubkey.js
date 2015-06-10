/**
 * @license
 * Copyright 2012 Google Inc. All rights reserved.
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
 * @fileoverview Represents a secret subkey packet.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.packet.SecretSubkey');

goog.require('e2e.openpgp.packet.PublicSubkey');
goog.require('e2e.openpgp.packet.SecretKey');
goog.require('e2e.openpgp.packet.factory');



/**
 * A Secret Subkey Packet (Tag 7) RFC 4880 Section 5.5.1.4.
 * @param {number} version The version of the key.
 * @param {number} timestamp The creation time of the key.
 * @param {!e2e.openpgp.EncryptedCipher} cipher The encrypted cipher.
 * @param {!e2e.openpgp.KeyFingerprint=} opt_fingerprint The fingerprint of the
 *     key.
 * @extends {e2e.openpgp.packet.SecretKey}
 * @constructor
 */
e2e.openpgp.packet.SecretSubkey = function(
    version, timestamp, cipher, opt_fingerprint) {
  goog.base(this, version, timestamp, cipher, opt_fingerprint);
};
goog.inherits(e2e.openpgp.packet.SecretSubkey,
              e2e.openpgp.packet.SecretKey);


/** @inheritDoc */
e2e.openpgp.packet.SecretSubkey.prototype.tag = 7;


/**
 * @override
 */
e2e.openpgp.packet.SecretSubkey.prototype.isSubkey = true;


/** @override */
e2e.openpgp.packet.SecretSubkey.prototype.getPublicKeyPacket = function() {
  return new e2e.openpgp.packet.PublicSubkey(
      this.version, this.timestamp, this.cipher, this.fingerprint);
};


/**
 * Extracts a Secret Subkey Packet from the body, and returns a
 * SecretSubkey.
 * @param {!e2e.ByteArray} body The body from where to extract the data.
 * @return {!e2e.openpgp.packet.SecretSubkey} The generated subkey.
 */
e2e.openpgp.packet.SecretSubkey.parse = function(body) {
  var seckey = e2e.openpgp.packet.SecretKey.parse(body);
  var subkey = new e2e.openpgp.packet.SecretSubkey(seckey.version,
      seckey.timestamp,
      seckey.cipher,
      seckey.fingerprint);
  return subkey;
};

e2e.openpgp.packet.factory.add(e2e.openpgp.packet.SecretSubkey);
