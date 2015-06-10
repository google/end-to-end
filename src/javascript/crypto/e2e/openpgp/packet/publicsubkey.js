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
 * @fileoverview Represents a public subkey packet.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.packet.PublicSubkey');

goog.require('e2e.openpgp.packet.PublicKey');
goog.require('e2e.openpgp.packet.factory');



/**
 * A Public Subkey Packet (Tag 14) RFC 4880 Section 5.5.1.2.
 * @param {number} version The version of the key.
 * @param {number} timestamp The creation time of the key.
 * @param {!e2e.cipher.Cipher|!e2e.signer.Signer} cipher An
 *     instance of the cipher used.
 * @param {!e2e.openpgp.KeyFingerprint=} opt_fingerprint The fingerprint of the
 *     key.
 * @extends {e2e.openpgp.packet.PublicKey}
 * @constructor
 */
e2e.openpgp.packet.PublicSubkey = function(
    version, timestamp, cipher, opt_fingerprint) {
  goog.base(this, version, timestamp, cipher, opt_fingerprint);
};
goog.inherits(e2e.openpgp.packet.PublicSubkey,
              e2e.openpgp.packet.PublicKey);


/** @inheritDoc */
e2e.openpgp.packet.PublicSubkey.prototype.tag = 14;


/**
 * @override
 */
e2e.openpgp.packet.PublicSubkey.prototype.isSubkey = true;


/**
 * Extracts a Public Subkey Packet from the body, and returns a
 * PublicSubKey.
 * @param {!e2e.ByteArray} body The body from where to extract the data.
 * @return {!e2e.openpgp.packet.PublicSubkey} The generated subkey.
 */
e2e.openpgp.packet.PublicSubkey.parse = function(body) {
  var pubkey = e2e.openpgp.packet.PublicKey.parse(body);
  var subkey = new e2e.openpgp.packet.PublicSubkey(pubkey.version,
      pubkey.timestamp,
      pubkey.cipher,
      pubkey.fingerprint);
  return subkey;
};

e2e.openpgp.packet.factory.add(e2e.openpgp.packet.PublicSubkey);
