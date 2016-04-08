/**
 * @license
 * Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Public-Key Encrypted Session Key packet.
 */

goog.provide('e2e.openpgp.packet.PKEncryptedSessionKey');

goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.factory');
goog.require('e2e.openpgp');
goog.require('e2e.openpgp.KeyProviderCipher');
goog.require('e2e.openpgp.Mpi');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.constants.Type');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.packet.EncryptedSessionKey');
goog.require('e2e.openpgp.packet.factory');
goog.require('e2e.openpgp.scheme.Ecdh');
goog.require('e2e.scheme.Eme');
goog.require('e2e.scheme.Rsaes');
goog.require('goog.array');



/**
 * Representation of a Public-Key Encrypted Session-Key Packet (Tag 1).
 * As defined in RFC 4880 Section 5.1.
 * @param {number} version The Encrypted Session Key Packet version.
 * @param {!e2e.openpgp.KeyId} keyId The keyId of the public key.
 * @param {e2e.cipher.Algorithm} algorithm The public key algorithm.
 * @param {e2e.cipher.ciphertext.CipherText} encryptedKey The encrypted
 *     key material with values as MPIs.
 * @constructor
 * @extends {e2e.openpgp.packet.EncryptedSessionKey}
 */
e2e.openpgp.packet.PKEncryptedSessionKey = function(
    version, keyId, algorithm, encryptedKey) {
  goog.base(this, version, algorithm, encryptedKey);
  this.keyId = keyId;
};
goog.inherits(e2e.openpgp.packet.PKEncryptedSessionKey,
    e2e.openpgp.packet.EncryptedSessionKey);


/** @override */
e2e.openpgp.packet.PKEncryptedSessionKey.prototype.createCipher =
    function(key) {
  return e2e.cipher.factory.require(this.algorithm, key);
};


/** @override */
e2e.openpgp.packet.PKEncryptedSessionKey.prototype.decryptSessionKeyWithCipher =
    function(cipher) {
  return e2e.async.Result.toResult(cipher)
      .addCallback(this.validateCipher, this)
      .addCallback(function(cipher) {
        return e2e.openpgp.packet.PKEncryptedSessionKey.getEncryptionScheme_(
            cipher).decrypt(this.encryptedKey);
      }, this)
      .addCallback(this.extractKey_, this);
};


/**
 * Verifies the checksum and extracts the key of a session key. Throws if
 * the checksum is invalid.
 * @param {!e2e.ByteArray} decoded The decoded key (without padding).
 * @return {boolean} Whether the key was extracted correctly.
 * @private
 */
e2e.openpgp.packet.PKEncryptedSessionKey.prototype.extractKey_ =
    function(decoded) {
  // Format specified in RFC 4880 section 5.1 and RFC 6637 section 8.
  this.symmetricAlgorithm = /** @type {e2e.cipher.Algorithm} */ (
      e2e.openpgp.constants.getAlgorithm(
          e2e.openpgp.constants.Type.SYMMETRIC_KEY,
          decoded.shift()));
  // Last two bytes are the checksum.
  var checksum = decoded.splice(-2, 2);
  if (!goog.array.equals(checksum,
      e2e.openpgp.calculateNumericChecksum(decoded))) {
    throw new e2e.openpgp.error.ParseError(
        'Bad checksum for decrypted session key.');
  }
  this.sessionKey = {'key': decoded};
  return true;
};


/** @override */
e2e.openpgp.packet.PKEncryptedSessionKey.prototype.tag = 1;


/** @override */
e2e.openpgp.packet.PKEncryptedSessionKey.prototype.
    serializePacketBody = function() {
  var body = goog.array.concat(
      this.version,
      this.keyId,
      e2e.openpgp.constants.getId(this.algorithm));
  switch (this.algorithm) {
    case e2e.cipher.Algorithm.RSA:
    case e2e.cipher.Algorithm.RSA_ENCRYPT:
      goog.array.extend(body, this.encryptedKey['c']);
      break;
    case e2e.cipher.Algorithm.ELGAMAL:
      goog.array.extend(body,
          this.encryptedKey['u'],
          this.encryptedKey['v']);
      break;
    case e2e.cipher.Algorithm.ECDH:
      goog.array.extend(body,
          this.encryptedKey['v'],
          this.encryptedKey['u'].length,
          this.encryptedKey['u']);  // Encrypted symmetric key.
      break;
    default:
      throw new e2e.openpgp.error.ParseError('Unknown algorithm.');
  }
  return body;
};


/**
 * Constructs an PKEncryptedSessionKey packet from an unencrypted session key.
 * @param {e2e.openpgp.packet.Key} publicKey Encrypt session key for this
 *   public key.
 * @param {!e2e.ByteArray} sessionKey Unencrypted session key.
 * @return {e2e.async.Result.<e2e.openpgp.packet.PKEncryptedSessionKey>}
 */
e2e.openpgp.packet.PKEncryptedSessionKey.construct = function(publicKey,
    sessionKey) {
  return e2e.async.Result.toResult(undefined).addCallback(function() {
    var m = [];
    m.push(e2e.openpgp.constants.getId(e2e.cipher.Algorithm.AES256));
    m = m.concat(sessionKey);
    m = m.concat(e2e.openpgp.calculateNumericChecksum(sessionKey));
    var scheme = e2e.openpgp.packet.PKEncryptedSessionKey.getEncryptionScheme_(
        /** @type {!e2e.cipher.Cipher} */ (publicKey.cipher));
    return /** @type {!e2e.cipher.ciphertext.AsymmetricAsync} */ (
        scheme.encrypt(m));
  }).addCallback(goog.partial(
      e2e.openpgp.packet.PKEncryptedSessionKey.createPacketForKey_,
      publicKey));
};


/**
 * Creates an {@link e2e.scheme.EncryptionScheme} for a given cipher.
 * @param {!e2e.cipher.Cipher} cipher
 * @return {!e2e.scheme.EncryptionScheme|e2e.cipher.Cipher}
 * @private
 */
e2e.openpgp.packet.PKEncryptedSessionKey.getEncryptionScheme_ =
    function(cipher) {
  if (cipher instanceof e2e.openpgp.KeyProviderCipher) {
    return cipher;
  }
  switch (cipher.algorithm) {
    case e2e.cipher.Algorithm.RSA:
    case e2e.cipher.Algorithm.RSA_ENCRYPT:
      return new e2e.scheme.Rsaes(cipher);
      break;
    case e2e.cipher.Algorithm.ECDH:
      return new e2e.openpgp.scheme.Ecdh(cipher);
      break;
    case e2e.cipher.Algorithm.ELGAMAL:
      return new e2e.scheme.Eme(cipher);
      break;
  }
  throw new e2e.openpgp.error.ParseError('Invalid cipher.');
};


/**
 * Obtains a public key encrypted session key packet for the given encrypted
 * key data and public key.
 * @param {e2e.openpgp.packet.Key} publicKey The public key used to
 *     encrypt the session key.
 * @param {!e2e.cipher.ciphertext.Asymmetric} encrypted The encrypted
 *     session key.
 * @return {e2e.openpgp.packet.PKEncryptedSessionKey} The key packet.
 * @private
 */
e2e.openpgp.packet.PKEncryptedSessionKey.createPacketForKey_ =
    function(publicKey, encrypted) {
  var encryptedKey;
  switch (publicKey.cipher.algorithm) {
    case e2e.cipher.Algorithm.RSA:
    case e2e.cipher.Algorithm.RSA_ENCRYPT:
      encryptedKey = {
        'c': e2e.openpgp.Mpi.serialize(encrypted['c'])
      };
      break;
    case e2e.cipher.Algorithm.ELGAMAL:
      encryptedKey = {
        'u': e2e.openpgp.Mpi.serialize(encrypted['u']),
        'v': e2e.openpgp.Mpi.serialize(encrypted['v'])
      };
      break;
    case e2e.cipher.Algorithm.ECDH:
      encryptedKey = {
        'u': encrypted['u'],  // Encrypted symmetric key.
        'v': e2e.openpgp.Mpi.serialize(encrypted['v'])
      };
      break;
    default:
      throw new Error('Unknown algorithm.');
  }
  var keyId;
  if (publicKey.keyId) {
    keyId = publicKey.keyId;
  } else {
    // All 0 means to try all keys (RFC 4880 Section 5.1).
    keyId = goog.array.repeat(0, 8);
  }
  return new e2e.openpgp.packet.PKEncryptedSessionKey(
      3,  // version
      keyId,
      publicKey.cipher.algorithm,
      encryptedKey);  // Encrypted session key in encoded format.
};


/** @override */
e2e.openpgp.packet.PKEncryptedSessionKey.parse = function(body) {
  var version = body.shift();
  if (version != 3) {
    throw new e2e.openpgp.error.ParseError(
        'Unknown PKESK packet version.');
  }
  var keyId = /** @type {!e2e.openpgp.KeyId} */ (body.splice(0, 8));
  var algorithmId = body.shift();
  var algorithm = e2e.openpgp.constants.getAlgorithm(
      e2e.openpgp.constants.Type.PUBLIC_KEY, algorithmId);
  var encryptedKey = /** @type {e2e.cipher.ciphertext.CipherText} */ (
      {});
  switch (algorithm) {
    case e2e.cipher.Algorithm.RSA:
    case e2e.cipher.Algorithm.RSA_ENCRYPT:
      encryptedKey['c'] = e2e.openpgp.Mpi.parse(body);
      break;
    case e2e.cipher.Algorithm.ELGAMAL:
      encryptedKey['u'] = e2e.openpgp.Mpi.parse(body);
      encryptedKey['v'] = e2e.openpgp.Mpi.parse(body);
      break;
    case e2e.cipher.Algorithm.ECDH:
      encryptedKey['v'] = e2e.openpgp.Mpi.parse(body);
      var length = body.shift();
      encryptedKey['u'] = body.splice(0, length);  // Encrypted symmetric key.
      break;
    default:
      throw new e2e.openpgp.error.ParseError('Unknown algorithm.');
  }
  return new e2e.openpgp.packet.PKEncryptedSessionKey(
      version, keyId, algorithm, encryptedKey);
};

e2e.openpgp.packet.factory.add(
    e2e.openpgp.packet.PKEncryptedSessionKey);
