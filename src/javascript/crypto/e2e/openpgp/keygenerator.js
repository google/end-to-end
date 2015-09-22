/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
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
 * @fileoverview Implements an OpenPGP key generator using ECC keys.
 */

goog.provide('e2e.openpgp.KeyGenerator');

goog.require('e2e');
goog.require('e2e.Hkdf');
goog.require('e2e.algorithm.KeyLocations');
goog.require('e2e.asymmetric.keygenerator');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.hash.Sha256');
goog.require('e2e.openpgp');
goog.require('e2e.openpgp.DummyS2k');
goog.require('e2e.openpgp.EncryptedCipher');
goog.require('e2e.openpgp.Mpi');
goog.require('e2e.openpgp.block.TransferablePublicKey');
goog.require('e2e.openpgp.block.TransferableSecretKey');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.packet.PublicKey');
goog.require('e2e.openpgp.packet.PublicSubkey');
goog.require('e2e.openpgp.packet.SecretKey');
goog.require('e2e.openpgp.packet.SecretSubkey');
goog.require('e2e.openpgp.packet.Signature');
goog.require('e2e.openpgp.packet.SignatureSub');
goog.require('e2e.openpgp.packet.UserId');
goog.require('e2e.random');
goog.require('e2e.signer.Algorithm');
goog.require('goog.array');



/**
 * Implements an OpenPGP key generator
 * @constructor
 */
e2e.openpgp.KeyGenerator = function() {};


/**
 * ECC key generation seed
 * @type {?e2e.ByteArray}
 * @private
 */
e2e.openpgp.KeyGenerator.prototype.eccSeed_;


/**
 * Number of keys generated from ECC generation seed
 * @type {?number}
 * @private
 */
e2e.openpgp.KeyGenerator.prototype.eccCount_;


/**
 * Size in bytes for the ECC key generation seed.
 * @const
 */
e2e.openpgp.KeyGenerator.ECC_SEED_SIZE = 16;


/**
 * Returns the ECC key generation seed and key count backup data.
 * @return {!e2e.openpgp.KeyringBackupInfo}
 */
e2e.openpgp.KeyGenerator.prototype.getGeneratorState = function() {
  return {
    seed: this.eccSeed_,
    count: this.eccCount_
  };
};


/**
 * Initializes the ECC key generation seed and key count.
 * @param {e2e.openpgp.KeyringBackupInfo} backupInfo
 */
e2e.openpgp.KeyGenerator.prototype.setGeneratorState = function(backupInfo) {
  if (goog.isDefAndNotNull(backupInfo) && backupInfo.count % 2) {
    throw new e2e.error.InvalidArgumentsError('Keys must be restored in pairs');
  }
  this.eccSeed_ = goog.isDefAndNotNull(backupInfo) ? (backupInfo.seed ||
      null) : null;
  this.eccCount_ = goog.isDefAndNotNull(backupInfo) ? (backupInfo.count ||
      null) : null;
};


/**
 * Generates and imports to the key ring a master signing key and a subordinate
 * encryption key.
 * @param {string} email The email to associate the key with.
 * @param {!e2e.signer.Algorithm} keyAlgo Algorithm of the master key.
 *     It must be one of the digital signature algorithms.
 * @param {number} keyLength Length in bits of the master key.
 * @param {e2e.cipher.Algorithm} subkeyAlgo Algorithm of the subkey.
 *     It must be one of the cipher algorithms.
 * @param {number} subkeyLength Length in bits of the subkey.
 * @param {!e2e.algorithm.KeyLocations=} opt_keyLocation Where should the key be
 *     stored? (default to JS)
 * @return {e2e.async.Result.<!Array.<!e2e.openpgp.block.TransferableKey>>}
 * The generated public key and secret key in an array.
 */
e2e.openpgp.KeyGenerator.prototype.generateKey = function(email,
                                                     keyAlgo,
                                                     keyLength,
                                                     subkeyAlgo,
                                                     subkeyLength,
                                                     opt_keyLocation) {
  var keyData = {
    'pubKey': new Array(),
    'privKey': new Array()
  };
  if (!goog.isDef(opt_keyLocation)) {
    opt_keyLocation = e2e.algorithm.KeyLocations.JAVASCRIPT;
  }

  if (opt_keyLocation == e2e.algorithm.KeyLocations.JAVASCRIPT) {
    var fingerprint;
    if (keyAlgo == e2e.signer.Algorithm.ECDSA &&
        keyLength == 256) {
      var ecdsa = e2e.asymmetric.keygenerator.newEcdsaWithP256(
          this.getNextKey_(keyLength));
      this.extractKeyData_(keyData, ecdsa);
      fingerprint = keyData.pubKey[0].fingerprint;
    }
    if (subkeyAlgo == e2e.cipher.Algorithm.ECDH &&
        subkeyLength == 256) {
      var ecdh = e2e.asymmetric.keygenerator.newEcdhWithP256(
          this.getNextKey_(subkeyLength));
      this.extractKeyData_(keyData, ecdh, true);
    }
    return e2e.async.Result.toResult(this.certifyKeys_(email, keyData));
  } else if (opt_keyLocation == e2e.algorithm.KeyLocations.WEB_CRYPTO) {
    if (keyAlgo == e2e.signer.Algorithm.RSA) {
      if ((keyLength != 4096 && keyLength != 8192) ||
          subkeyAlgo != e2e.cipher.Algorithm.RSA || subkeyLength != keyLength) {
        throw new e2e.openpgp.error.UnsupportedError(
            'WebCrypto RSA keyLength must be 4096 or 8192');
      }
      return e2e.asymmetric.keygenerator.newWebCryptoRsaKeys(
          keyLength).addCallback(
          function(ciphers) {
            this.extractKeyData_(keyData, ciphers[0]);
            this.extractKeyData_(keyData, ciphers[1]);
            return this.certifyKeys_(email, keyData);
          });
    }
  } else if (opt_keyLocation == e2e.algorithm.KeyLocations.HARDWARE) {
    // TODO(user): https://code.google.com/p/end-to-end/issues/detail?id=130
    throw new e2e.openpgp.error.UnsupportedError(
        'Hardware keygen not supported yet');
  }
  // Should never happen.
  throw new e2e.openpgp.error.UnsupportedError(
      'Unsupported key type or length.');
};


/**
 * @param {string} email The email to associate the key with.
 * @param {{privKey: Array, pubKey: Array}} keyData
 * @return {!Array.<!e2e.openpgp.block.TransferableKey>}
 * @private
 */
e2e.openpgp.KeyGenerator.prototype.certifyKeys_ = function(email, keyData) {
  if (keyData['pubKey'].length == 2 && keyData['privKey'].length == 2) {
    // TODO(evn): Move this code to a .construct.
    var primaryKey = keyData['privKey'][0];
    var uid = new e2e.openpgp.packet.UserId(email);
    uid.certifyBy(primaryKey);
    keyData['privKey'][1].bindTo(
        primaryKey,
        e2e.openpgp.packet.Signature.SignatureType.SUBKEY,
        e2e.openpgp.packet.SignatureSub.KeyFlags.ENCRYPT_COMMUNICATION |
        e2e.openpgp.packet.SignatureSub.KeyFlags.ENCRYPT_STORAGE);
    keyData['pubKey'][1].bindTo(
        primaryKey,
        e2e.openpgp.packet.Signature.SignatureType.SUBKEY,
        e2e.openpgp.packet.SignatureSub.KeyFlags.ENCRYPT_COMMUNICATION |
        e2e.openpgp.packet.SignatureSub.KeyFlags.ENCRYPT_STORAGE
    );

    var privKeyBlock = new e2e.openpgp.block.TransferableSecretKey();
    privKeyBlock.keyPacket = primaryKey;
    privKeyBlock.addUnverifiedSubKey(keyData['privKey'][1]);
    privKeyBlock.addUnverifiedUserId(uid);

    var pubKeyBlock = new e2e.openpgp.block.TransferablePublicKey();
    pubKeyBlock.keyPacket = keyData['pubKey'][0];
    pubKeyBlock.addUnverifiedSubKey(keyData['pubKey'][1]);
    pubKeyBlock.addUnverifiedUserId(uid);

    privKeyBlock.processSignatures();
    pubKeyBlock.processSignatures();

    return [pubKeyBlock, privKeyBlock];
  }
  // Should never happen.
  throw new e2e.openpgp.error.UnsupportedError(
      'Unsupported key type or length.');
};


/**
 * Extracts serialized key data contained in a crypto object.
 * @param {{privKey: Array, pubKey: Array}} keyData The map
 *     to store the extracted data.
 * @param {!e2e.cipher.Cipher|!e2e.signer.Signer} cryptor
 *     The crypto object to extract key material.
 * @param {boolean=} opt_subKey Whether the key is a subkey. Defaults to false.
 * @param {boolean=} opt_isJS Whether the key material is stored in JS.
 *                            Default to true.
 * @private
 */
e2e.openpgp.KeyGenerator.prototype.extractKeyData_ = function(
    keyData, cryptor, opt_subKey, opt_isJS) {
  var version = 0x04;
  var timestamp = 0;
  var publicConstructor = opt_subKey ?
      e2e.openpgp.packet.PublicSubkey : e2e.openpgp.packet.PublicKey;
  var secretConstructor = opt_subKey ?
      e2e.openpgp.packet.SecretSubkey : e2e.openpgp.packet.SecretKey;
  var pubKey = new publicConstructor(
      version, timestamp, cryptor);
  var serializedPubKey = pubKey.serializePacketBody();

  if (!goog.isDef(opt_isJS)) {
    opt_isJS = true;
  }
  var serializedPrivKey;
  if (opt_isJS) {
    // privKey is MPI, needs to serialize to get the right byte array.
    var privKey = e2e.openpgp.Mpi.serialize(cryptor.getKey()['privKey']);
    serializedPrivKey = goog.array.flatten(
        serializedPubKey,
        /* key is not encrypted individually. */
        e2e.openpgp.EncryptedCipher.KeyDerivationType.PLAINTEXT,
        privKey,
        e2e.openpgp.calculateNumericChecksum(privKey));
  } else {
    // Use dummy s2k
    var s2k = new e2e.openpgp.DummyS2k(new e2e.hash.Sha256,
        [0x45, 0x32, 0x45],
        e2e.openpgp.DummyS2k.E2E_modes.WEB_CRYPTO);
    serializedPrivKey = goog.array.flatten(
        serializedPubKey,
        e2e.openpgp.EncryptedCipher.KeyDerivationType.S2K_CHECKSUM,
        s2k.serialize(), [0], [0]);
  }

  privKey = secretConstructor.parse(serializedPrivKey);
  privKey.cipher.unlockKey();
  keyData['privKey'].push(privKey);
  keyData['pubKey'].push(
      publicConstructor.parse(serializedPubKey));
};


/**
 * Generates the next key in the sequence based on the ECC generation seed
 * @param {number} keyLength Length in bits of the key.
 * @private
 * @return {!e2e.ByteArray} Deterministic privKey based on ECC seed.
 */
e2e.openpgp.KeyGenerator.prototype.getNextKey_ = function(keyLength) {
  if (!this.eccSeed_) {
    this.eccSeed_ = e2e.random.getRandomBytes(
        e2e.openpgp.KeyGenerator.ECC_SEED_SIZE);
    this.eccCount_ = 0;
  }

  if (++this.eccCount_ > 0x7F) {
    throw new e2e.openpgp.error.UnsupportedError('Too many ECC keys generated');
  }

  if (keyLength % 8) {
    throw new e2e.openpgp.error.UnsupportedError(
        'Key length is not a multiple of 8');
  }

  return new e2e.Hkdf(new e2e.hash.Sha256()).getHKDF(this.eccSeed_,
      e2e.dwordArrayToByteArray([this.eccCount_]), keyLength / 8);

};
