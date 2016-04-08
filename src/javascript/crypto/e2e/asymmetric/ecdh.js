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
 * @fileoverview ECDH for OpenPGP as described in RFC 6637.
 * @author thaidn@google.com (Thai Duong)
 */

goog.provide('e2e.cipher.Ecdh');

goog.require('e2e');
goog.require('e2e.AlgorithmImpl');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.AesKeyWrap');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.AsymmetricCipher');
goog.require('e2e.cipher.factory');
goog.require('e2e.ecc.DomainParam');
goog.require('e2e.ecc.Ecdh');
goog.require('e2e.hash.Algorithm');
/** @suppress {extraRequire} intentionally importing all hash functions */
goog.require('e2e.hash.all');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.constants.Type');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Representation of a ECDH public or private key.
 * @param {e2e.cipher.Algorithm} algorithm The algorithm to retrieve.
 *     It must be e2e.cipher.Algorithm.ECDH.
 * @param {e2e.cipher.key.Key=} opt_key The ECDH key as specified in
 *     section 9 of RFC 6637.
 * @constructor
 * @implements {e2e.cipher.AsymmetricCipher}
 * @extends {e2e.AlgorithmImpl}
 */
e2e.cipher.Ecdh = function(algorithm, opt_key) {
  goog.asserts.assert(algorithm == e2e.cipher.Algorithm.ECDH,
      'Algorithm must be ECDH.');
  goog.base(this, e2e.cipher.Algorithm.ECDH, opt_key);
};
goog.inherits(e2e.cipher.Ecdh, e2e.AlgorithmImpl);


/**
 * Internal ECDH implementation.
 * @type {e2e.ecc.Ecdh}
 * @private
 */
e2e.cipher.Ecdh.prototype.ecdh_;


/**
 * List of allowed hash algorithms as specified in RFC 6637.
 * @type {Array}
 * @const
 * @private
 */
e2e.cipher.Ecdh.ALLOWED_HASH_ALGORITHMS_ = [
  e2e.hash.Algorithm.SHA256,
  e2e.hash.Algorithm.SHA384,
  e2e.hash.Algorithm.SHA512];


/**
 * List of allowed key-wrapping algorithms as specified in RFC 6637.
 * @type {Array}
 * @const
 * @private
 */
e2e.cipher.Ecdh.ALLOWED_KEYWRAPPING_ALGORITHMS_ = [
  e2e.cipher.Algorithm.AES128,
  e2e.cipher.Algorithm.AES192,
  e2e.cipher.Algorithm.AES256];


/**
 * Sets the ECDH public key or private key.
 * @param {e2e.cipher.key.Key} keyArg Algorithm-specific fields for ECDH
 *     keys as specified in section 9 of RFC 6637.
 * @override
 */
e2e.cipher.Ecdh.prototype.setKey = function(keyArg) {
  var key = /** @type {e2e.cipher.key.Ecdh} */ (keyArg);
  goog.asserts.assertArray(key['kdfInfo'], 'KDF params should be defined.');
  goog.asserts.assert(key['kdfInfo'].length == 4, 'KDF: invalid params.');
  // Length. It must be 0x3 because there're 3 more bytes after it.
  goog.asserts.assert(key['kdfInfo'][0] == 0x3, 'KDF: invalid params.');
  // Reserved for future use.
  goog.asserts.assert(key['kdfInfo'][1] == 0x1, 'KDF: invalid params.');
  // Hash algorithm.
  var hashAlgo = e2e.openpgp.constants.getAlgorithm(
      e2e.openpgp.constants.Type.HASH, key['kdfInfo'][2]);
  goog.asserts.assert(goog.array.contains(
      e2e.cipher.Ecdh.ALLOWED_HASH_ALGORITHMS_, hashAlgo),
      'KDF: invalid hash algorithm.');
  // Key wrapping algorithm.
  var keyWrappingAlgo = e2e.openpgp.constants.getAlgorithm(
      e2e.openpgp.constants.Type.SYMMETRIC_KEY, key['kdfInfo'][3]);
  goog.asserts.assert(goog.array.contains(
      e2e.cipher.Ecdh.ALLOWED_KEYWRAPPING_ALGORITHMS_,
      keyWrappingAlgo), 'KDF: invalid key wrapping algorithm.');

  if (!goog.isDefAndNotNull(key['pubKey']) &&
      !goog.isDefAndNotNull(key['privKey'])) {
    goog.asserts.fail('Either public key or private key should be defined.');
  }
  // Pubkey's fingerprint should be in the right size if available.
  // Note: the fingerprint may be absent if this class is used to calculate the
  // fingerprint of a new generated key. See newECDHWithP256.
  if (goog.isDefAndNotNull(key['fingerprint'])) {
    goog.asserts.assert(key['fingerprint'].length == 20,
        'Public key fingerprint should be 20 bytes.');
  }

  goog.asserts.assertArray(key['curve'], 'Curve should be defined.');
  this.ecdh_ = new e2e.ecc.Ecdh(
      e2e.ecc.DomainParam.curveNameFromCurveOid(key['curve']),
      {
        'privKey': key['privKey'],
        'pubKey': key['pubKey']
      });
  // Save other key material.
  goog.base(this, 'setKey', key);
};


/** @inheritDoc */
e2e.cipher.Ecdh.prototype.encrypt = function(plaintext) {
  // Performs the ECDH encryption method as described in section 8 of RFC 6637.
  var message = this.ecdh_.alice();
  // Wraps the session key with the key-wrapping key derived from the shared
  // secret.
  var keyWrapper = this.getKeyWrapper(message['secret']);
  /** @type {!e2e.cipher.ciphertext.Ecdh} */
  var ciphertext = {
    'u': keyWrapper.wrap(plaintext),
    'v': message.pubKey
  };
  return e2e.async.Result.toAsynchronousResult(ciphertext);
};


/**
 * Encrypts with an ephemeral private key. Used for testing only.
 * @param {!e2e.ByteArray} m The message to be encrypted.
 * @param {!e2e.ByteArray} privKey The ephemeral private key.
 * @return {e2e.cipher.ciphertext.AsymmetricAsync}
 * @protected
 */
e2e.cipher.Ecdh.prototype.encryptForTestingOnly = function(m, privKey) {
  var message = this.ecdh_.bob(this.key['pubKey'], privKey);

  var keyWrapper = this.getKeyWrapper(message['secret']);
  var ciphertext = {
    'u': keyWrapper.wrap(m),
    'v': /** @type {!Array.<number>}*/ ([])
  };
  return /** @type {e2e.cipher.ciphertext.AsymmetricAsync} */ (
      e2e.async.Result.toResult(ciphertext));
};


/** @inheritDoc */
e2e.cipher.Ecdh.prototype.decrypt = function(ciphertext) {
  // Performs the ECDH decryption method as described in section 8 of RFC 6637.
  goog.asserts.assertArray(ciphertext['u'], 'Invalid ciphertext.');
  goog.asserts.assertArray(ciphertext['v'], 'Invalid ciphertext.');
  var message = this.ecdh_.bob(ciphertext['v']);
  // Unwraps the session key with the key-encrypting key derived from the shared
  // secret.
  var keyWrapper = this.getKeyWrapper(message['secret']);
  var plaintext = keyWrapper.unwrap(ciphertext['u']);
  return e2e.async.Result.toAsynchronousResult(plaintext);
};


/**
 * Returns a key-wrapper that is used to wrap or unwrap the session key.
 * @param {!e2e.ByteArray} secret The ECDH shared secret.
 * @return {!e2e.cipher.AesKeyWrap} The key-wrapper object.
 */
e2e.cipher.Ecdh.prototype.getKeyWrapper = function(secret) {
  // Constructs the KDF params.
  var kdfParams = goog.array.clone(this.key['curve']);
  goog.array.extend(
      kdfParams,
      e2e.openpgp.constants.getId(e2e.cipher.Algorithm.ECDH));
  goog.array.extend(kdfParams, this.key['kdfInfo']);
  goog.array.extend(
      kdfParams,
      e2e.stringToByteArray('Anonymous Sender    '));
  // Add 20 octets representing a recipient encryption subkey or a master key
  // fingerprint, identifying the key material that is needed for the
  // decryption.
  goog.asserts.assertArray(this.key['fingerprint'],
      'Cannot encrypt: fingerprint is absent');
  goog.array.extend(kdfParams, this.key['fingerprint']);

  // Derives a key-wrapping key from the shared secret.
  var kdfHash = e2e.openpgp.constants.getInstance(
      e2e.openpgp.constants.Type.HASH,
      this.key['kdfInfo'][2]);
  kdfHash.reset();
  kdfHash.update([0x0, 0x0, 0x0, 0x1]);
  kdfHash.update(secret);
  kdfHash.update(kdfParams);
  var derivedKey = kdfHash.digest();

  var wrapPrimitive = /** @type {e2e.cipher.Aes} */
      (e2e.openpgp.constants.getInstance(
      e2e.openpgp.constants.Type.SYMMETRIC_KEY,
      this.key['kdfInfo'][3]));
  var keyWrapper = new e2e.cipher.AesKeyWrap(wrapPrimitive);
  // This condition has been implicitly checked in the constructor, still can't
  // hurt to explicitly double check it again here.
  goog.asserts.assert(
      derivedKey.length >= wrapPrimitive.keySize,
      'KDF: invalid params');
  var keyWrappingKey = {'key': derivedKey.slice(0, wrapPrimitive.keySize)};
  keyWrapper.setKey(keyWrappingKey);
  return keyWrapper;
};


e2e.cipher.factory.add(e2e.cipher.Ecdh, e2e.cipher.Algorithm.ECDH);
