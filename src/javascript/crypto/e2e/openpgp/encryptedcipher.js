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
 * @fileoverview Implements a cipher or signer where the key itself is
 * encrypted. TODO(evn): Replace this with WrappedKey.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.EncryptedCipher');
goog.provide('e2e.openpgp.EncryptedCipher.KeyDerivationType');
goog.provide('e2e.openpgp.EncryptedCipher.LockedKeyError');

goog.require('e2e');
goog.require('e2e.AlgorithmImpl');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.AsymmetricCipher');
goog.require('e2e.ciphermode.Cfb');
goog.require('e2e.debug.Console');
goog.require('e2e.hash.Md5');
goog.require('e2e.hash.Sha1');
goog.require('e2e.openpgp');
goog.require('e2e.openpgp.IteratedS2K');
goog.require('e2e.openpgp.Mpi');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.constants.Type');
goog.require('e2e.openpgp.error.DecryptError');
goog.require('e2e.openpgp.error.Error');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.error.MissingPassphraseError');
goog.require('e2e.openpgp.error.WrongPassphraseError');
goog.require('e2e.random');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.Signer');



/**
 * An EncryptedCipher wraps a e2e.cipher.Cipher so that some of the
 * operations (sign/decrypt) are only available after unlocking the encrypted
 * key material.
 * @param {!e2e.ByteArray} encryptedKeyData The encrypted key data.
 * @param {e2e.openpgp.EncryptedCipher.KeyDerivationType} keyDerivation The
 *     key derivation style to use.
 * @param {e2e.cipher.Cipher|e2e.signer.Signer} cipher Instance
 *     of the cipher with the public key.
 * @param {e2e.cipher.Algorithm=} opt_algorithm The algorithm to
 *     use for decrypting the encrypted key data.
 * @param {!e2e.ByteArray=} opt_iv The initialization vector for the key
 *     data.
 * @param {e2e.openpgp.S2k=} opt_s2k The S2K instance to use to generate
 *     the key from a passphrase.
 * @constructor
 * @extends {e2e.AlgorithmImpl}
 * @implements {e2e.cipher.AsymmetricCipher}
 * @implements {e2e.signer.Signer}
 */
e2e.openpgp.EncryptedCipher = function(
    encryptedKeyData,
    keyDerivation,
    cipher,
    opt_algorithm,
    opt_iv,
    opt_s2k) {
  /**
   * Used to mark whether the key is locked.
   * @type {boolean}
   * @private
   */
  this.locked_ = true;
  /**
   * The key derivation type to be used for decrypting the data.
   * @type {e2e.openpgp.EncryptedCipher.KeyDerivationType}
   * @private
   */
  this.keyDerivation_ = keyDerivation;
  switch (this.keyDerivation_) {
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.S2K_SHA1:
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.S2K_CHECKSUM:
      if (!goog.isDefAndNotNull(opt_s2k)) {
        throw new e2e.openpgp.error.InvalidArgumentsError(
            'Invalid S2K in encrypted cipher.');
      }
      /**
       * The S2K specifier for generating the key.
       * @type {e2e.openpgp.S2k|undefined}
       * @private
       */
      this.s2k_ = opt_s2k;
      // Falling through, no break;
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.MD5:
      if (!goog.isDefAndNotNull(opt_iv) ||
          !e2e.isByteArray(opt_iv) ||
          !goog.isDefAndNotNull(opt_algorithm)) {
        throw new e2e.openpgp.error.InvalidArgumentsError(
            'Invalid IV for encrypted cipher');
      }
      /**
       * The IV to be used for decrypting the data.
       * @type {!e2e.ByteArray|undefined}
       * @private
       */
      this.iv_ = opt_iv;
      /**
       * The algorithm in which the key is encrypted.
       * @type {e2e.cipher.Algorithm|undefined}
       * @private
       */
      this.symmetricAlgorithm_ = opt_algorithm;
      // Falling through, no break;
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.PLAINTEXT:
      /**
       * The cipher to use.
       * @type {e2e.cipher.Cipher|e2e.signer.Signer}
       * @private
       */
      this.cipher_ = cipher;
      if (!e2e.isByteArray(encryptedKeyData)) {
        throw new e2e.openpgp.error.InvalidArgumentsError(
            'Invalid Encrypted Key Data');
      }
      /**
       * The potentially encrypted key data.
       * @type {!e2e.ByteArray}
       */
      this.encryptedKeyData = encryptedKeyData;
      break;
    default:
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Invalid Key Derivation Type.');
  }
  goog.base(this, cipher.algorithm);
};
goog.inherits(e2e.openpgp.EncryptedCipher, e2e.AlgorithmImpl);


/**
 * The key bytes, only available after key was unlocked.
 * @type {!e2e.ByteArray}
 * @private
 */
e2e.openpgp.EncryptedCipher.prototype.keyBytes_;


/**
 * Returns the key derivation type.
 * @return {e2e.openpgp.EncryptedCipher.KeyDerivationType|undefined}
 */
e2e.openpgp.EncryptedCipher.prototype.getKeyDerivationType = function() {
  return this.keyDerivation_;
};


/**
 * Returns the key derivation IV.
 * @return {!e2e.ByteArray|undefined}
 */
e2e.openpgp.EncryptedCipher.prototype.getKeyDerivationIv = function() {
  return this.iv_;
};


/**
 * Returns the key derivation algorithm.
 * @return {e2e.cipher.Algorithm|undefined}
 */
e2e.openpgp.EncryptedCipher.prototype.getKeyDerivationAlgorithm =
    function() {
  return this.symmetricAlgorithm_;
};


/**
 * Returns the key derivation S2k.
 * @return {e2e.openpgp.S2k|undefined}
 */
e2e.openpgp.EncryptedCipher.prototype.getKeyDerivationS2k = function() {
  return this.s2k_;
};


/**
 * @const {number} Default iterated salt for encrypting with a passphrase.
 */
e2e.openpgp.EncryptedCipher.DEFAULT_COUNT = 96;


/**
 * @const {e2e.cipher.Algorithm} Default cipher to use to encrypt
 *     with a passphrase.
 */
e2e.openpgp.EncryptedCipher.DEFAULT_CIPHER =
    e2e.cipher.Algorithm.AES256;


/**
 * Locks the key with the given passphrase.
 * @param {!e2e.ByteArray=} opt_passphrase
 */
e2e.openpgp.EncryptedCipher.prototype.lockKey = function(
    opt_passphrase) {
  if (this.locked_) {
    throw new e2e.openpgp.EncryptedCipher.LockedKeyError(this);
  }
  if (!goog.isDef(opt_passphrase)) {
    this.keyDerivation_ =
        e2e.openpgp.EncryptedCipher.KeyDerivationType.PLAINTEXT;
    this.iv_ = [];
    this.symmetricAlgorithm_ = undefined;
    this.s2k_ = undefined;
    this.encryptedKeyData = this.keyBytes_.concat(
        e2e.openpgp.calculateNumericChecksum(this.keyBytes_));
  } else {
    // Encrypt all ciphers with passphrase on SHA1 Salted Iterated S2K.
    this.keyDerivation_ =
        e2e.openpgp.EncryptedCipher.KeyDerivationType.S2K_SHA1;
    var salt = e2e.random.getRandomBytes(8);
    this.symmetricAlgorithm_ =
        e2e.openpgp.EncryptedCipher.DEFAULT_CIPHER;
    var cipher = /** @type {e2e.cipher.SymmetricCipher} */ (
        e2e.openpgp.constants.getInstance(
            e2e.openpgp.constants.Type.SYMMETRIC_KEY,
            this.symmetricAlgorithm_));
    this.iv_ = e2e.random.getRandomBytes(
        cipher.blockSize);
    var count = e2e.openpgp.EncryptedCipher.DEFAULT_COUNT;
    // TODO(evn): Maybe we can use a cheaper function here instead of sha1.
    this.s2k_ = new e2e.openpgp.IteratedS2K(
        new e2e.hash.Sha1, salt, count);
    var symCipher = /** @type {e2e.cipher.SymmetricCipher} */ (
        e2e.openpgp.constants.getInstance(
            e2e.openpgp.constants.Type.SYMMETRIC_KEY,
            e2e.openpgp.EncryptedCipher.DEFAULT_CIPHER));
    var cfbSymCipher = new e2e.ciphermode.Cfb(symCipher);
    var key = this.s2k_.getKey(opt_passphrase, symCipher.keySize);
    symCipher.setKey({key: key});
    var sha1 = new e2e.hash.Sha1;
    var hash = sha1.hash(this.keyBytes_);
    // TODO(evn): Make this call asynchronous.
    this.encryptedKeyData = e2e.async.Result.getValue(
        cfbSymCipher.encrypt(this.keyBytes_.concat(hash), this.iv_));
  }
};


/**
 * Checks if the key data is valid and sets the key. Can throw an error
 * if the key type is unrecognized.
 * @param {!e2e.ByteArray} decryptedKeyData The key data.
 * @private
 */
e2e.openpgp.EncryptedCipher.prototype.unlockAndVerifyKey_ = function(
    decryptedKeyData) {
  switch (this.keyDerivation_) {
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.S2K_SHA1:
      // S2K_SHA1 uses sha1 for the checksum.
      this.unlockKeyWithSha1Checksum_(decryptedKeyData);
      break;
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.PLAINTEXT:
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.S2K_CHECKSUM:
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.MD5:
      // The MD5, plaintext and S2K checksum use numeric checksum.
      this.unlockKeyWithNumericChecksum_(decryptedKeyData);
      break;
    default:
      // This should never happen, but..
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Invalid Key Derivation Type.');
  }
};


/**
 * Unlocks the key so that this key can be used for private operations. If this
 * key isn't encrypted verify that its checksum is correct; otherwise decrypt it
 * and verify checksum. There are several ways of decrypting an encrypted
 * cipher, and there are different checksums that can be used to verify the key
 * was correct. Each has different decryption modes of operation as well, and
 * the encoding of the data inside the code is formatted differently depending
 * on which key derivation type.
 * @param {!e2e.ByteArray=} opt_passphrase The passphrase to use to
 *     decrypt it.
 */
e2e.openpgp.EncryptedCipher.prototype.unlockKey = function(
    opt_passphrase) {
  if (!this.locked_) {
    return;
  }
  e2e.openpgp.EncryptedCipher.console_.info(
      'Unlocking key with derivation type', this.keyDerivation_);
  // Special casing for unencrypted keys.
  if (this.keyDerivation_ ==
      e2e.openpgp.EncryptedCipher.KeyDerivationType.PLAINTEXT) {
    // Plaintext key derivation type uses numeric checksum.
    this.unlockAndVerifyKey_(this.encryptedKeyData);
    return;
  } else if (!goog.isDef(this.iv_) || !goog.isDef(this.symmetricAlgorithm_)) {
    throw new e2e.openpgp.error.DecryptError(
        'Missing encrypted key metadata.');
  }

  var key;
  var symCipher = /** @type {e2e.cipher.SymmetricCipher} */ (
      e2e.openpgp.constants.getInstance(
          e2e.openpgp.constants.Type.SYMMETRIC_KEY,
          this.symmetricAlgorithm_));
  var cfbSymCipher = new e2e.ciphermode.Cfb(symCipher);
  switch (this.keyDerivation_) {
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.S2K_SHA1:
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.S2K_CHECKSUM:
      // For SHA1 and numeric checksum a passphrase is required.
      if (!goog.isDef(opt_passphrase)) {
        throw new e2e.openpgp.error.MissingPassphraseError();
      }
      key = this.s2k_.getKey(opt_passphrase, symCipher.keySize);
      break;
    case e2e.openpgp.EncryptedCipher.KeyDerivationType.MD5:
      // For MD5 there's no S2K, and the key is simply the MD5 of the secret.
      var md5 = new e2e.hash.Md5;
      if (!goog.isDef(opt_passphrase)) {
        throw new e2e.openpgp.error.MissingPassphraseError();
      }
      key = md5.hash(opt_passphrase);
      break;
    default:
      // This should never happen, but..
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Invalid Key Derivation Type.');
  }
  symCipher.setKey({key: key});
  // TODO(evn): Make this call asynchronous.
  var decryptedData = e2e.async.Result.getValue(
      cfbSymCipher.decrypt(this.encryptedKeyData, this.iv_));
  this.unlockAndVerifyKey_(decryptedData);
};


/**
 * Verifies the data is valid, and unlocks the key to do private operations.
 * @param {!e2e.ByteArray} data The data to verify and import.
 * @private
 */
e2e.openpgp.EncryptedCipher.prototype.unlockKeyWithSha1Checksum_ =
    function(data) {
  var key = data.slice(0, -20);
  var chk = data.slice(-20);
  var sha1 = new e2e.hash.Sha1;
  var hash = /** @type {!e2e.ByteArray} */ (sha1.hash(key));
  if (!e2e.compareByteArray(chk, hash)) {
    e2e.openpgp.EncryptedCipher.console_.info(
        'Shasum mismatch, assuming wrong passphrase.');
    throw new e2e.openpgp.error.WrongPassphraseError();
  }
  this.unlockKey_(key);
};


/**
 * Verifies the data is valid, and unlocks the key to do private operations.
 * @param {!e2e.ByteArray} data The data to verify and import.
 * @private
 */
e2e.openpgp.EncryptedCipher.prototype.unlockKeyWithNumericChecksum_ =
    function(data) {
  var key = data.slice(0, -2);
  var checksum = data.slice(-2);
  if (!e2e.compareByteArray(checksum,
      e2e.openpgp.calculateNumericChecksum(key))) {
    e2e.openpgp.EncryptedCipher.console_.info(
        'Numeric checksum mismatch, assuming wrong passphrase.');
    throw new e2e.openpgp.error.WrongPassphraseError();
  }
  this.unlockKey_(key);
};


/**
 * Unlocks the encrypted cipher so that it can do private operations.
 * @param {!e2e.ByteArray} keyBytes The key data to use to get the MPIs.
 * @private
 */
e2e.openpgp.EncryptedCipher.prototype.unlockKey_ = function(keyBytes) {
  // Make a copy of the key to avoid changing it.
  var key = keyBytes.slice(0);
  var keyData = this.cipher_.getKey();
  switch (this.cipher_.algorithm) {
    case e2e.cipher.Algorithm.RSA:
    case e2e.cipher.Algorithm.RSA_ENCRYPT:
    case e2e.signer.Algorithm.RSA_SIGN:
      keyData.d = e2e.openpgp.Mpi.parse(key);
      keyData.p = e2e.openpgp.Mpi.parse(key);
      keyData.q = e2e.openpgp.Mpi.parse(key);
      keyData.u = e2e.openpgp.Mpi.parse(key);
      break;
    case e2e.signer.Algorithm.DSA:
    case e2e.cipher.Algorithm.ELGAMAL:
      keyData.x = e2e.openpgp.Mpi.parse(key);
      break;
    case e2e.cipher.Algorithm.ECDH:
    case e2e.signer.Algorithm.ECDSA:
      keyData.privKey = e2e.openpgp.Mpi.parse(key);
      break;
    default:
      e2e.openpgp.EncryptedCipher.console_.warn(
          'Unknown cipher algorithm', this.cipher_.algorithm);
      throw new e2e.openpgp.error.InvalidArgumentsError('Unknown algorithm');
  }
  // TODO(user): Figure out whether loc needs to be set to JS in some case here.
  this.cipher_.setKey(keyData);
  this.locked_ = false;
  this.keyBytes_ = keyBytes;
};


/** @inheritDoc */
e2e.openpgp.EncryptedCipher.prototype.getKey = function() {
  return this.cipher_.getKey();
};


/** @inheritDoc */
e2e.openpgp.EncryptedCipher.prototype.getWebCryptoKey = function() {
  return this.cipher_.getWebCryptoKey();
};


/** @inheritDoc */
e2e.openpgp.EncryptedCipher.prototype.setWebCryptoKey = function(webCryptoKey) {
  return this.cipher_.setWebCryptoKey(webCryptoKey);
};


/** @inheritDoc */
e2e.openpgp.EncryptedCipher.prototype.encrypt = function(data) {
  return this.cipher_.encrypt(data);
};


/** @inheritDoc */
e2e.openpgp.EncryptedCipher.prototype.decrypt = function(data) {
  if (this.locked_) {
    throw new e2e.openpgp.EncryptedCipher.LockedKeyError(this);
  }
  return this.cipher_.decrypt(data);
};


/** @override */
e2e.openpgp.EncryptedCipher.prototype.sign = function(data) {
  if (this.locked_) {
    throw new e2e.openpgp.EncryptedCipher.LockedKeyError(this);
  }
  return this.cipher_.sign(data);
};


/** @override */
e2e.openpgp.EncryptedCipher.prototype.verify = function(data, sig) {
  return this.cipher_.verify(data, sig);
};


/** @override */
e2e.openpgp.EncryptedCipher.prototype.getHash = function() {
  return this.cipher_.getHash();
};


/** @override */
e2e.openpgp.EncryptedCipher.prototype.setHash = function(hash) {
  this.cipher_.setHash(hash);
};


/**
 * @return {boolean} True iff the cipher is locked.
 */
e2e.openpgp.EncryptedCipher.prototype.isLocked = function() {
  return Boolean(this.locked_);
};


/**
 * Returns the wrapped cipher, throwing error if the cipher is locked.
 * @return {e2e.cipher.Cipher|e2e.signer.Signer} The cipher.
 */
e2e.openpgp.EncryptedCipher.prototype.getWrappedCipher = function() {
  if (this.locked_) {
    throw new e2e.openpgp.EncryptedCipher.LockedKeyError(this);
  }
  return this.cipher_;
};


/**
 * Returns the algorithm used by the signature hash function.
 * @return {e2e.hash.Algorithm}
 */
e2e.openpgp.EncryptedCipher.prototype.getHashAlgorithm = function() {
  return this.cipher_.getHash().algorithm;
};


/**
 * Defines the different types of key derivation to decrypt the key material.
 * It is defined in RFC 4880 Section 5.5.3. as string-to-key usage conventions.
 * @enum {number}
 */
e2e.openpgp.EncryptedCipher.KeyDerivationType = {
  'S2K_CHECKSUM': 255,
  'S2K_SHA1': 254,
  'PLAINTEXT': 0,
  'MD5': 1
};



/**
 * Exception used when a private operation is done on a locked cipher.
 * @param {e2e.openpgp.EncryptedCipher} cipher The locked cipher.
 * @constructor
 * @extends {e2e.openpgp.error.Error}
 */
e2e.openpgp.EncryptedCipher.LockedKeyError = function(cipher) {
  /**
   * The locked encrypted cipher.
   * @type {e2e.openpgp.EncryptedCipher}
   */
  this.cipher = cipher;
  goog.base(this, 'Operation not allowed on locked key. Unlock key first.');
};
goog.inherits(e2e.openpgp.EncryptedCipher.LockedKeyError,
              e2e.openpgp.error.Error);


/**
 * @private {!e2e.debug.Console}
 */
e2e.openpgp.EncryptedCipher.console_ = e2e.debug.Console.getConsole(
    'e2e.openpgp.EncryptedCipher');
