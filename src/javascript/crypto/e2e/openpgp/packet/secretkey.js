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
 * @fileoverview Represents a secret key packet.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.packet.SecretKey');

goog.require('e2e.cipher.factory');
goog.require('e2e.debug.Console');
goog.require('e2e.openpgp.EncryptedCipher');
goog.require('e2e.openpgp.S2k');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.constants.Type');
goog.require('e2e.openpgp.error.SerializationError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.packet.Key');
goog.require('e2e.openpgp.packet.PublicKey');
goog.require('e2e.openpgp.packet.SecretKeyInterface');
goog.require('e2e.openpgp.packet.factory');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * A Secret Key Packet (Tag 5) RFC 4880 Section 5.5.1.3.
 * @param {number} version The version of the key.
 * @param {number} timestamp The creation time of the key.
 * @param {!e2e.cipher.Cipher} cipher The cipher with the keys.
 * @param {!e2e.openpgp.KeyFingerprint=} opt_fingerprint The fingerprint of the
 *     key.
 * @param {!e2e.openpgp.KeyId=} opt_keyId The key ID of the key. Should be
 *     passed in for v3 keys, but not for v4 keys.
 * @extends {e2e.openpgp.packet.Key}
 * @implements {e2e.openpgp.packet.SecretKeyInterface}
 * @constructor
 */
e2e.openpgp.packet.SecretKey = function(
    version, timestamp, cipher, opt_fingerprint, opt_keyId) {
  goog.asserts.assert(cipher instanceof e2e.openpgp.EncryptedCipher,
      'The cipher for a secret key packet should be encrypted.');
  goog.base(this, version, timestamp, cipher, opt_fingerprint, opt_keyId);
};
goog.inherits(e2e.openpgp.packet.SecretKey,
              e2e.openpgp.packet.Key);


/** @inheritDoc */
e2e.openpgp.packet.SecretKey.prototype.tag = 5;


/**
 * The secret key packets use encrypted ciphers rather than ciphers.
 * @type {!e2e.openpgp.EncryptedCipher}
 * @override
 */
e2e.openpgp.packet.SecretKey.prototype.cipher;


/** @inheritDoc */
e2e.openpgp.packet.SecretKey.prototype.serializePacketBody = function() {
  var pubKey = new e2e.openpgp.packet.PublicKey(
      this.version, this.timestamp, this.cipher, this.fingerprint, this.keyId);
  var serializedPubKey = pubKey.serializePacketBody();
  var kd = this.cipher.getKeyDerivationType();
  if (kd == e2e.openpgp.EncryptedCipher.KeyDerivationType.PLAINTEXT) {
    return goog.array.flatten(
        serializedPubKey,
        kd,
        this.cipher.encryptedKeyData);
  } else if (
      kd == e2e.openpgp.EncryptedCipher.KeyDerivationType.S2K_CHECKSUM ||
      kd == e2e.openpgp.EncryptedCipher.KeyDerivationType.S2K_SHA1) {
    var s2k = this.cipher.getKeyDerivationS2k(),
        iv = this.cipher.getKeyDerivationIv(),
        kda = this.cipher.getKeyDerivationAlgorithm();
    if (!goog.isDef(s2k) || !goog.isDef(iv) || !goog.isDef(kda)) {
      throw new e2e.openpgp.error.SerializationError(
          'Missing key metadata.');
    }
    return goog.array.flatten(
        serializedPubKey, kd, e2e.openpgp.constants.getId(kda),
        s2k.serialize(), iv, this.cipher.encryptedKeyData);
  }
  throw new e2e.openpgp.error.UnsupportedError(
      'Key derivation type not supported.');
};


/** @override */
e2e.openpgp.packet.SecretKey.prototype.getPublicKeyPacket = function() {
  return new e2e.openpgp.packet.PublicKey(
      this.version, this.timestamp, this.cipher, this.fingerprint, this.keyId);
};


/**
 * Extracts a Secret Key Packet from the body, and returns a SecretKey.
 * @param {!e2e.ByteArray} body The body from where to extract the data.
 * @return {!e2e.openpgp.packet.SecretKey} The generated packet.
 */
e2e.openpgp.packet.SecretKey.parse = function(body) {
  var pubkey = e2e.openpgp.packet.PublicKey.parse(body);
  var pubCipher = /** @type {e2e.cipher.AsymmetricCipher} */ (
      pubkey.cipher);
  var kd = body.shift();
  var symAlgo, algId = -1, s2k, iv, encrypted = true;
  switch (kd) {
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.S2K_CHECKSUM:
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.S2K_SHA1:
      kd = /** @type {e2e.openpgp.EncryptedCipher.KeyDerivationType} */ (
          kd);
      algId = body.shift();
      s2k = e2e.openpgp.S2k.parse(body);
      e2e.openpgp.packet.SecretKey.console_.info(
          '  key-derivation', kd);
      e2e.openpgp.packet.SecretKey.console_.info(
          '  Sym alg', algId);
      e2e.openpgp.packet.SecretKey.console_.info(
          '    S2K-type', s2k.type);
      break;
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.PLAINTEXT:
      kd = /** @type {e2e.openpgp.EncryptedCipher.KeyDerivationType} */ (
          kd);
      e2e.openpgp.packet.SecretKey.console_.info(
          '  key-derivation', kd);
      encrypted = false;
      break;
    default:
      algId = kd;
      kd = e2e.openpgp.EncryptedCipher.KeyDerivationType.MD5;
      e2e.openpgp.packet.SecretKey.console_.info(
          '  key-derivation', kd);
      e2e.openpgp.packet.SecretKey.console_.info(
          '  Sym alg', algId);
      break;
  }
  if (encrypted) {
    symAlgo = e2e.openpgp.constants.getAlgorithm(
        e2e.openpgp.constants.Type.SYMMETRIC_KEY, algId);
    symAlgo = /** @type {e2e.cipher.Algorithm} */ (symAlgo);
    var symCipher = /** @type {e2e.cipher.SymmetricCipher} */ (
        e2e.cipher.factory.require(symAlgo));
    iv = body.splice(0, symCipher.blockSize);
  }
  var encryptedKeyData = body.splice(0, body.length);
  var encCipher = new e2e.openpgp.EncryptedCipher(
      encryptedKeyData, kd, pubCipher, symAlgo, iv, s2k);
  return new e2e.openpgp.packet.SecretKey(pubkey.version,
      pubkey.timestamp,
      encCipher,
      pubkey.fingerprint,
      pubkey.keyId);
};


/**
 * @type {!e2e.debug.Console}
 * @private
 */
e2e.openpgp.packet.SecretKey.console_ =
    e2e.debug.Console.getConsole('e2e.openpgp.packet.SecretKey');

e2e.openpgp.packet.factory.add(
    e2e.openpgp.packet.SecretKey);
