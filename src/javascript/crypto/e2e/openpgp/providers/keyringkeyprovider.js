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
 * @fileoverview OpenPGP KeyProvider implementation that uses KeyRing object
 * for the storage.
 */

goog.provide('e2e.openpgp.providers.KeyringKeyProvider');

goog.require('e2e');
goog.require('e2e.algorithm.KeyLocations');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.openpgp.KeyPurposeType');
goog.require('e2e.openpgp.KeyRing');
goog.require('e2e.openpgp.KeyRingType');
goog.require('e2e.openpgp.KeyringExportFormat');
goog.require('e2e.openpgp.asciiArmor');
goog.require('e2e.openpgp.block.TransferablePublicKey');
goog.require('e2e.openpgp.block.TransferableSecretKey');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.providers.PublicKeyProvider');
goog.require('e2e.openpgp.providers.SecretKeyProvider');
goog.require('e2e.openpgp.scheme.Ecdh');
goog.require('e2e.scheme.Ecdsa');
goog.require('e2e.scheme.Eme');
goog.require('e2e.scheme.Rsaes');
goog.require('e2e.scheme.Rsassa');
goog.require('e2e.signer.Algorithm');
goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.format.EmailAddress');


goog.scope(function() {
var providers = e2e.openpgp.providers;



/**
 * Secret and public key provider that uses {@link KeyRing} object for storage.
 * All of the keys are implicitly trusted (i.e. {@link #trustKeys} is a no-op).
 * @param {!e2e.openpgp.KeyRing} keyring User's keyring.
 * @constructor
 * @implements {e2e.openpgp.providers.PublicKeyProvider}
 * @implements {e2e.openpgp.providers.SecretKeyProvider}
 */
providers.KeyringKeyProvider = function(keyring) {
  /** @private {!e2e.openpgp.KeyRing} User's keyring */
  this.keyring_ = keyring;
};


/** @const {!e2e.openpgp.KeyProviderId} */
providers.KeyringKeyProvider.PROVIDER_ID = 'legacy-keyring';


/**
 * Regular expression matching a valid email address. This needs to be very
 * strict and reject uncommon formats to prevent vulnerability when
 * keyserver would choose a different key than intended.
 * @private @const
 */
providers.KeyringKeyProvider.EMAIL_ADDRESS_REGEXP_ =
    /^[+a-zA-Z0-9_.!-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;


/**
 * Deferred constructor.
 * @param  {!goog.Thenable.<!e2e.openpgp.KeyRing>} keyRingPromise
 * @return {!goog.Thenable.<!e2e.openpgp.providers.KeyringKeyProvider>}
 */
providers.KeyringKeyProvider.launch = function(keyRingPromise) {
  return keyRingPromise.then(function(keyring) {
    return new providers.KeyringKeyProvider(keyring);
  });
};


/** @override */
providers.KeyringKeyProvider.prototype.configure = function(config) {
  var configObj = config || {};
  var passphrase = goog.isString(configObj['passphrase']) ?
      configObj['passphrase'] : undefined;

  // Keyring initialization (no-op if the keyring was already initialized).
  return this.keyring_.initialize(passphrase)
      .then(function() {
        // Optionally, change the passphrase.
        if (goog.isString(configObj['newPassphrase'])) {
          return this.keyring_.changePassphrase(configObj['newPassphrase'])
              .then(function() {
                return this.getState();
              }, null, this);
        } else {
          return this.getState();
        }
      });
};


/** @override */
providers.KeyringKeyProvider.prototype.getState = function() {
  return goog.Promise.all([
    this.keyring_.isEncrypted(),
    this.keyring_.hasPassphrase()])
      .then(function(results) {
        var isEncrypted = results[0];
        var hasPassphrase = results[1];
        return /** @type {e2e.openpgp.KeyProviderState}*/ ({
          'encrypted': isEncrypted,
          'locked': !hasPassphrase
        });
      });
};


/**
 * @param {!Array.<!e2e.openpgp.block.TransferableKey>} transferableKeys
 * @return {!e2e.openpgp.Keys} The key objects
 * @private
 */
providers.KeyringKeyProvider.keysToKeyObjects_ = function(transferableKeys) {
  return goog.array.map(transferableKeys,
      providers.KeyringKeyProvider.keyToKeyObject_);
};


/**
 * @param {!Array.<!e2e.openpgp.block.TransferableKey>} transferableKeys
 * @return {!Array.<!e2e.ByteArray>} The key objects
 * @private
 */
providers.KeyringKeyProvider.keysToSerialization_ = function(transferableKeys) {
  return goog.array.map(transferableKeys,
      providers.KeyringKeyProvider.keyToSerialization_);
};


/**
 * @param {!e2e.openpgp.block.TransferableKey} transferableKey
 * @return {!e2e.openpgp.Key} The key object
 * @private
 */
providers.KeyringKeyProvider.keyToKeyObject_ = function(transferableKey) {
  return transferableKey.toKeyObject(false,
      providers.KeyringKeyProvider.PROVIDER_ID);
};


/**
 * @param {!e2e.openpgp.block.TransferableKey} transferableKey
 * @return {!e2e.ByteArray} The key object
 * @private
 */
providers.KeyringKeyProvider.keyToSerialization_ = function(transferableKey) {
  return transferableKey.serialize();
};


/**
 * @param  {!e2e.openpgp.KeyPurposeType} purpose Key purpose.
 * @return {!e2e.openpgp.KeyRing.Type}
 * @private
 */
providers.KeyringKeyProvider.getKeyringType_ = function(purpose) {
  if (purpose == e2e.openpgp.KeyPurposeType.SIGNING ||
      purpose == e2e.openpgp.KeyPurposeType.DECRYPTION) {
    return e2e.openpgp.KeyRing.Type.PRIVATE;
  }
  return e2e.openpgp.KeyRing.Type.PUBLIC;
};


/**
 * Extracts an e-mail address from a RFC-2822 formatted mailbox string.
 * For security, the e-mail address additionally needs to match a restrictive
 * regular expression.
 *
 * See {@link https://tools.ietf.org/html/rfc2822#section-3.4}
 *
 * @param  {string} uid Mailbox address specification
 * @return {?e2e.openpgp.UserEmail} Extracted e-mail address, or null.
 * @private
 */
providers.KeyringKeyProvider.extractValidEmail_ = function(uid) {
  var emailAddress = goog.format.EmailAddress.parse(uid);
  if (!emailAddress.isValid()) {
    return null;
  }
  var email = emailAddress.getAddress();
  if (!providers.KeyringKeyProvider.EMAIL_ADDRESS_REGEXP_.exec(
      emailAddress.getAddress())) {
    return null;
  }
  return email;
};


/** @override */
providers.KeyringKeyProvider.prototype.getId = function() {
  return goog.Promise.resolve(providers.KeyringKeyProvider.PROVIDER_ID);
};


/** @override */
providers.KeyringKeyProvider.prototype.getTrustedPublicKeysByEmail = function(
    purpose, email) {
  return this.getAllPublicKeysByEmail(email);
};


/** @override */
providers.KeyringKeyProvider.prototype.getTrustedSecretKeysByEmail = function(
    purpose, email) {
  return this.getAllSecretKeysByEmail(email);
};


/**
 * Resolves the keys for a given e-mail address.
 * @param {!e2e.openpgp.KeyRing.Type} keyringType Keyring type
 * @param {!e2e.openpgp.UserEmail} email The email address.
 * @private
 * @return {!goog.Thenable<!Array.<!e2e.openpgp.block.TransferableKey>>}
 */
providers.KeyringKeyProvider.prototype.resolveKeysByEmail_ = function(
    keyringType, email) {
  return goog.Promise.resolve(undefined)
      .then(function() {
        return this.keyring_.searchKeysByUidMatcher(function(uid) {
          return providers.KeyringKeyProvider.extractValidEmail_(uid) ==
              email;
        },
        keyringType);
      },
      null, this);
};


/** @override */
providers.KeyringKeyProvider.prototype.getVerificationKeysByKeyId = function(
    id) {
  // TODO(koto): Support wildcard key id. Return all keys then.
  return this.keyring_.getKeyBlockById(id, false /* isSecret*/).then(
      function(block) {
        return providers.KeyringKeyProvider.keysToSerialization_([block]);
      });
};


/** @override */
providers.KeyringKeyProvider.prototype.getDecryptionKeysByKeyId = function(id) {
  // TODO(koto): Support wildcard key id. Return all keys then.
  return this.keyring_.getKeyBlockById(id, true /* isSecret*/).then(
      function(block) {
        return providers.KeyringKeyProvider.keysToKeyObjects_([block]);
      });
};


/** @override */
providers.KeyringKeyProvider.prototype.getAllPublicKeys = function() {
  var keyMap = this.keyring_.getAllKeys(false /* isSecret*/);
  var keyObjects = [];
  keyMap.forEach(function(keysForUid, uid) {
    goog.array.forEach(keysForUid, function(key) {
      if (key instanceof e2e.openpgp.block.TransferableSecretKey) {
        // KeyRing.getAllKeys always returns the private keys.
        return;
      }
      keyObjects.push(providers.KeyringKeyProvider.keyToSerialization_(key));
    }, this);
  }, this);
  return goog.Promise.resolve(keyObjects);
};


/** @override */
providers.KeyringKeyProvider.prototype.getAllSecretKeys = function() {
  var keyMap = this.keyring_.getAllKeys(true /* isSecret */);
  var keyObjects = [];
  keyMap.forEach(function(keysForUid, uid) {
    goog.array.forEach(keysForUid, function(key) {
      keyObjects.push(providers.KeyringKeyProvider.keyToKeyObject_(key));
    }, this);
  }, this);
  return goog.Promise.resolve(keyObjects);
};


/** @override */
providers.KeyringKeyProvider.prototype.getAllPublicKeysByEmail = function(
    email) {
  return this.resolveKeysByEmail_(e2e.openpgp.KeyRing.Type.PUBLIC, email)
      .then(providers.KeyringKeyProvider.keysToSerialization_);
};


/** @override */
providers.KeyringKeyProvider.prototype.getAllSecretKeysByEmail = function(
    email) {
  return this.resolveKeysByEmail_(e2e.openpgp.KeyRing.Type.PRIVATE, email)
      .then(providers.KeyringKeyProvider.keysToKeyObjects_);
};


/** @override */
providers.KeyringKeyProvider.prototype.getPublicKeyByFingerprint = function(
    fingerprint) {
  return goog.Promise.resolve(this.keyring_.getPublicKeyBlockByFingerprint(
      fingerprint)).then(
      function(key) {
        return key ?
            providers.KeyringKeyProvider.keyToSerialization_(key) :
            null;
      });
};


/** @override */
providers.KeyringKeyProvider.prototype.getSecretKeyByFingerprint = function(
    fingerprint) {
  return goog.Promise.reject(new e2e.openpgp.error.UnsupportedError(
      'Unsupported'));
};


/** @override */
providers.KeyringKeyProvider.prototype.getKeyringExportOptions = function(
    keyringType) {
  return goog.Promise.resolve(keyringType).then(function(keyringType) {
    var options = [];
    switch (keyringType) {
      case e2e.openpgp.KeyRingType.PUBLIC:
        options.push(/** @type {e2e.openpgp.KeyringExportOptions} */ ({
          'format': e2e.openpgp.KeyringExportFormat.OPENPGP_PACKETS_ASCII
        }));
        options.push(/** @type {e2e.openpgp.KeyringExportOptions} */ ({
          'format': e2e.openpgp.KeyringExportFormat.OPENPGP_PACKETS_BINARY
        }));
        break;
      case e2e.openpgp.KeyRingType.SECRET:
        options.push(/** @type {e2e.openpgp.KeyringExportOptions} */ ({
          'format': e2e.openpgp.KeyringExportFormat.OPENPGP_PACKETS_ASCII,
          'passphrase': null
        }));
        options.push(/** @type {e2e.openpgp.KeyringExportOptions} */ ({
          'format': e2e.openpgp.KeyringExportFormat.OPENPGP_PACKETS_BINARY,
          'passphrase': null
        }));
        if (this.keyring_.getKeyringBackupData().seed) {
          options.push(/** @type {e2e.openpgp.KeyringExportOptions} */ ({
            'format': 'backup-code',
          }));
        }
        break;
    }
    return options;
  }, null, this);
};


/** @override */
providers.KeyringKeyProvider.prototype.exportKeyring = function(keyringType,
    exportOptions) {
  return goog.Promise.resolve(exportOptions).then(function(exportOptions) {
    switch (exportOptions.format) {
      case e2e.openpgp.KeyringExportFormat.OPENPGP_PACKETS_ASCII:
        return this.exportAllKeys_(keyringType, true,
            exportOptions['passphrase']);
        break;
      case e2e.openpgp.KeyringExportFormat.OPENPGP_PACKETS_BINARY:
        return this.exportAllKeys_(keyringType, false,
            exportOptions['passphrase']);
        break;
      case 'backup-code':
        if (keyringType == e2e.openpgp.KeyRingType.SECRET) {
          return this.keyring_.getKeyringBackupData();
        }
        break;
      default:
        throw new e2e.openpgp.error.InvalidArgumentsError(
            'Invalid export options.');
    }
  }, null, this);
};


/**
 * Exports a serialization of a public or private keyring.
 * @param {!e2e.openpgp.KeyRingType} keyringType The type of the keyring.
 * @param {boolean} asciiArmor If true, export will be ASCII armored, otherwise
 *     bytes will be returned.
 * @param {string=} opt_passphrase A passphrase to lock the private keys with.
 * @return {!goog.Thenable<string|!e2e.ByteArray>} Key blocks for all keys in a
 *     given keyring type. Private key exports also include all matching public
 *     key blocks.
 * @private
 */
providers.KeyringKeyProvider.prototype.exportAllKeys_ = function(
    keyringType, asciiArmor, opt_passphrase) {
  return goog.Promise.resolve()
      .then(goog.bind(
          this.serializeAllKeyBlocks_,
          this,
          keyringType,
          asciiArmor,
          opt_passphrase))
      .then(goog.bind(
          this.encodeKeyringExport_,
          this,
          keyringType,
          asciiArmor));
};


/**
 * Serializes all key blocks from a given keyring.
 * @param  {!e2e.openpgp.KeyRingType} keyringType Type of the keyring.
 * @param {boolean} asciiArmor If true, export will be ASCII armored, otherwise
 *     bytes will be returned.
 * @param  {string=} opt_passphrase A passphrase to lock the private keys with.
 * @return {!goog.Thenable<!e2e.ByteArray>} Serialization of all key blocks.
 * @private
 */
providers.KeyringKeyProvider.prototype.serializeAllKeyBlocks_ = function(
    keyringType, asciiArmor, opt_passphrase) {
  var isSecret = (keyringType == e2e.openpgp.KeyRingType.SECRET);
  var passphraseBytes = null;
  if (goog.isString(opt_passphrase) && opt_passphrase !== '') {
    if (!isSecret) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Cannot use passphrase during a public keyring export.');
    }
    passphraseBytes = e2e.stringToByteArray(opt_passphrase);
  }
  var keyMap = this.keyring_.getAllKeys(isSecret);
  /** @type {!Array<!goog.Thenable<!e2e.ByteArray>>} */
  var pendingSerializedKeys = [];
  keyMap.forEach(function(keysForUid, uid) {
    goog.array.forEach(keysForUid, function(key) {
      pendingSerializedKeys.push(
          this.serializeKey_(isSecret, passphraseBytes, key));
    }, this);
  }, this);
  return goog.Promise.all(pendingSerializedKeys).then(goog.array.flatten);
};


/**
 * Encoded the OpenPGP blocks serialization for export.
 * @param  {!e2e.openpgp.KeyRingType} keyringType Type of the keyring.
 * @param {boolean} asciiArmor If true, export will be ASCII armored, otherwise
 *     bytes will be returned.
 * @param  {!e2e.ByteArray} serialized Serialized keys
 * @return {string|!e2e.ByteArray} Optionally ASCII-armored serialization.
 * @private
 */
providers.KeyringKeyProvider.prototype.encodeKeyringExport_ = function(
    keyringType, asciiArmor, serialized) {
  if (asciiArmor) {
    var header = (keyringType == e2e.openpgp.KeyRingType.SECRET) ?
        'PRIVATE KEY BLOCK' : 'PUBLIC KEY BLOCK';
    return e2e.openpgp.asciiArmor.encode(header, serialized);
  }
  return serialized;
};


/**
 * Validates, optionally locks and serializes the key. For private keys also
 * serializes the matching public key block.
 * @param  {boolean} isSecret True iff private key is expected.
 * @param  {?e2e.ByteArray} passphraseBytes Passphrase to use to lock
 *     the secret key.
 * @param  {!e2e.openpgp.block.TransferableKey}  key The key block.
 * @return {!goog.Thenable<!e2e.ByteArray>} Serialization of the key(s)
 * @private
 */
providers.KeyringKeyProvider.prototype.serializeKey_ = function(
    isSecret, passphraseBytes, key) {
  /** @type {!goog.Thenable<e2e.openpgp.block.TransferableKey>} */
  var matchingKeyPromise = goog.Promise.resolve(
      /** @type {e2e.openpgp.block.TransferableKey} */(null));
  if (isSecret) {
    goog.asserts.assert(key instanceof e2e.openpgp.block.TransferableSecretKey);
    // Protect with passphrase
    matchingKeyPromise = key.processSignatures().then(goog.bind(function() {
      key.unlock();
      key.lock(goog.isNull(passphraseBytes) ? undefined :
          goog.asserts.assertArray(passphraseBytes));
      // Also add the public key block for this secret key.
      return this.keyring_.getPublicKeyBlockByFingerprint(
          key.keyPacket.fingerprint);
    }, this));
  } else {
    if (!(key instanceof e2e.openpgp.block.TransferablePublicKey)) {
      // KeyRing.getAllKeys always returns the private keys, ignore them.
      return goog.Promise.resolve([]);
    }
  }
  return matchingKeyPromise.then(function(matchingKey) {
    var serialized = key.serialize();
    if (matchingKey) {
      goog.array.extend(serialized, matchingKey.serialize());
    }
    return serialized;
  });
};


/** @override */
providers.KeyringKeyProvider.prototype.setCredentials = function(credentials) {
  // Ignored.
  return goog.Promise.resolve();
};


/** @override */
providers.KeyringKeyProvider.prototype.trustKeys = function(keys, email,
    purpose, opt_trustData) {
  // In the keyring, all keys are trusted.
  return goog.Promise.resolve(keys);
};


/** @override */
providers.KeyringKeyProvider.prototype.removePublicKeyByFingerprint = function(
    fingerprint) {
  return goog.Promise.resolve(undefined).then(function() {
    this.keyring_.deleteKeyByFingerprint(fingerprint,
        e2e.openpgp.KeyRing.Type.PUBLIC);
  }, null, this);
};


/** @override */
providers.KeyringKeyProvider.prototype.removeSecretKeyByFingerprint = function(
    fingerprint) {
  return goog.Promise.resolve(undefined).then(function() {
    this.keyring_.deleteKeyByFingerprint(fingerprint,
        e2e.openpgp.KeyRing.Type.PRIVATE);
  }, null, this);
};


/** @override */
providers.KeyringKeyProvider.prototype.importKeys = function(serializedKeys,
    passphraseCallback) {
  return goog.Promise.resolve(undefined).then(function() {
    var blocks = e2e.openpgp.block.factory.parseByteArrayAllTransferableKeys(
        serializedKeys, true /* skip keys with errors */);
    if (blocks.length == 0) {
      throw new e2e.openpgp.error.ParseError('No valid key blocks found.');
    }
    return blocks;
  }).then(function(keys) {
    return goog.Promise.all(goog.array.map(keys, function(key) {
      return this.keyring_.importKey(key);
    }, this));
  }, null, this).then(function(keysOrNull) {
    return providers.KeyringKeyProvider.keysToKeyObjects_(
        goog.array.filter(keysOrNull, goog.isDefAndNotNull));
  });
};


/** @override */
providers.KeyringKeyProvider.prototype.decrypt = function(key, keyId,
    algorithm, ciphertext) {
  return goog.Promise.resolve(key)
      .then(goog.bind(this.getSecretKeyPacket_, this, keyId))
      .then(goog.bind(this.requireDecryptionScheme_, this, algorithm))
      .then(function(scheme) {
        return scheme.decrypt(ciphertext);
      });
};


/**
 * Retrieves the secret key packet from a given Key object.
 * @param {!e2e.openpgp.KeyId} keyId
 * @param {!e2e.openpgp.Key} key The key object that the packet should
 *     originate from.
 * @return {e2e.openpgp.packet.SecretKey} The key packet
 * @private
 */
providers.KeyringKeyProvider.prototype.getSecretKeyPacket_ = function(keyId,
    key) {
  if (key.providerId !== providers.KeyringKeyProvider.PROVIDER_ID ||
      !key.key.secret) {
    throw new e2e.openpgp.error.InvalidArgumentsError('Invalid key handle.');
  }
  return this.keyring_.getSecretKey(keyId, key.key.fingerprint);
};


/**
 * Returns the matching decryption scheme for a given key packet. Throws an
 * error on algorithm mismatch.
 * @param  {!e2e.cipher.Algorithm} algorithm Requested decryption algorithm.
 * @param  {e2e.openpgp.packet.SecretKey} secretKeyPacket Secret key packet
 *     to extract the cipher from.
 * @return {!e2e.scheme.EncryptionScheme} The scheme.
 * @private
 */
providers.KeyringKeyProvider.prototype.requireDecryptionScheme_ = function(
    algorithm, secretKeyPacket) {
  if (!secretKeyPacket) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Could not find a key.');
  }
  var cipher = /** @type {!e2e.cipher.Cipher} */ (goog.asserts.assertObject(
      secretKeyPacket.cipher.getWrappedCipher()));
  if (algorithm !== cipher.algorithm) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Cipher algorithm mismatch.');
  }
  if (!goog.isFunction(cipher.decrypt)) {
    throw new e2e.openpgp.error.InvalidArgumentsError('Invalid cipher.');
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
  throw new e2e.openpgp.error.InvalidArgumentsError(
      'Could not find a matching decryption scheme.');
};


/** @override */
providers.KeyringKeyProvider.prototype.sign = function(key, keyId, algorithm,
    hashAlgorithm, data) {
  return goog.Promise.resolve(key)
      .then(goog.bind(this.getSecretKeyPacket_, this, keyId))
      .then(goog.bind(this.requireSignatureScheme_, this, algorithm,
          hashAlgorithm))
      .then(function(scheme) {
        return scheme.sign(data);
      });
};


/**
 * Returns the matching signature scheme for a given key packet. Throws an
 * error on algorithm mismatch.
 * @param  {!e2e.cipher.Algorithm} algorithm Requested signing algorithm.
 * @param  {!e2e.hash.Algorithm} hashAlgorithm Requested signing hash algorithm.
 * @param  {e2e.openpgp.packet.SecretKey} secretKeyPacket Secret key packet
 *     to extract the cipher from.
 * @return {!e2e.scheme.SignatureScheme|!e2e.signer.Signer} The scheme.
 * @private
 */
providers.KeyringKeyProvider.prototype.requireSignatureScheme_ = function(
    algorithm, hashAlgorithm, secretKeyPacket) {
  if (!secretKeyPacket) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Could not find a key.');
  }
  var signer = /** @type {e2e.signer.Signer} */ (goog.asserts.assertObject(
      secretKeyPacket.cipher.getWrappedCipher()));
  if (algorithm !== signer.algorithm ||
      hashAlgorithm !== signer.getHashAlgorithm()) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Signer algorithm mismatch.');
  }

  if (!goog.isFunction(signer.sign)) {
    throw new e2e.openpgp.error.InvalidArgumentsError('Invalid signer.');
  }
  switch (signer.algorithm) {
    case e2e.cipher.Algorithm.RSA:
    case e2e.signer.Algorithm.RSA_SIGN:
      return new e2e.scheme.Rsassa(signer);
      break;
    case e2e.signer.Algorithm.ECDSA:
      return new e2e.scheme.Ecdsa(signer);
      break;
    case e2e.signer.Algorithm.DSA:
      return signer;
      break;
  }
  throw new e2e.openpgp.error.InvalidArgumentsError(
      'Could not find a matching signature scheme.');
};


/** @override */
providers.KeyringKeyProvider.prototype.generateKeyPair = function(userId,
    generateOptions) {
  return this.validateGenerateOptions_(generateOptions)
      .then(function(options) {
        return this.keyring_.generateKey(userId,
           options['keyAlgo'],
           options['keyLength'],
           options['subkeyAlgo'],
           options['subkeyLength'],
           options['keyLocation']);
      }, null, this)
      .then(function(transferableKeys) {
        var pubKeyBlock = transferableKeys[0];
        var privKeyBlock = transferableKeys[1];
        return /** @type {e2e.openpgp.KeyPair} */ ({
          'public': providers.KeyringKeyProvider.keyToKeyObject_(pubKeyBlock),
          'secret': providers.KeyringKeyProvider.keyToKeyObject_(privKeyBlock)
        });
      }, null, this);
};


/**
 * Validates the key generation options.
 * @param  {!e2e.openpgp.KeyGenerateOptions} generateOptions Keypair generation
 *     options
 * @return {!goog.Thenable<!e2e.openpgp.KeyGenerateOptions>}
 * @private
 */
providers.KeyringKeyProvider.prototype.validateGenerateOptions_ = function(
    generateOptions) {
  return new goog.Promise(function(resolve, reject) {
    if (!goog.isNumber(generateOptions['keyLength']) ||
        generateOptions['keyLength'] <= 0) {
      throw new e2e.openpgp.error.InvalidArgumentsError('Invalid keyLength');
    }
    if (!goog.isNumber(generateOptions['subkeyLength']) ||
        generateOptions['subkeyLength'] <= 0) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Invalid subkeyLength');
    }
    if (!(generateOptions['keyAlgo'] in e2e.signer.Algorithm)) {
      throw new e2e.openpgp.error.InvalidArgumentsError('Invalid keyAlgo');
    }
    if (!(generateOptions['subkeyAlgo'] in e2e.cipher.Algorithm)) {
      throw new e2e.openpgp.error.InvalidArgumentsError('Invalid subkeyAlgo');
    }
    if (!(generateOptions['keyLocation'] in e2e.algorithm.KeyLocations)) {
      throw new e2e.openpgp.error.InvalidArgumentsError('Invalid keyLocation');
    }
    resolve(generateOptions);
  });
};


/** @override */
providers.KeyringKeyProvider.prototype.getKeyGenerateOptions = function() {
  var webCryptoKeyGenerateOptions = {
    keyAlgo: [e2e.signer.Algorithm.ECDSA],
    keyLength: [256],
    subkeyAlgo: [e2e.cipher.Algorithm.ECDH],
    subkeyLength: [256],
    keyLocation: [e2e.algorithm.KeyLocations.WEB_CRYPTO]
  };
  var javascriptKeyGenerateOptions = {
    keyAlgo: [e2e.signer.Algorithm.ECDSA],
    keyLength: [256],
    subkeyAlgo: [e2e.cipher.Algorithm.ECDH],
    subkeyLength: [256],
    keyLocation: [e2e.algorithm.KeyLocations.JAVASCRIPT]
  };
  return goog.Promise.resolve([
    javascriptKeyGenerateOptions,
    webCryptoKeyGenerateOptions
  ]);
};


/** @override */
providers.KeyringKeyProvider.prototype.unlockSecretKey = function(key,
    unlockData) {
  // In the keyring, all keys are unlocked.
  return goog.Promise.resolve(/** @type {e2e.openpgp.Key} */ (key));
};
});  // goog.scope
