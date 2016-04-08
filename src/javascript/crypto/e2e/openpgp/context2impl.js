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
 * @fileoverview Default implementation of Context2.
 */
goog.provide('e2e.openpgp.Context2Impl');

goog.require('e2e');
/** @suppress {extraRequire} force loading of all ciphers */
goog.require('e2e.cipher.all');
/** @suppress {extraRequire} force loading of all compression methods */
goog.require('e2e.compression.all');
/** @suppress {extraRequire} force loading of all hash functions */
goog.require('e2e.hash.all');
goog.require('e2e.openpgp.ClearSignMessage');
goog.require('e2e.openpgp.Context2');
goog.require('e2e.openpgp.KeyProviderCipher');
goog.require('e2e.openpgp.KeyPurposeType');
goog.require('e2e.openpgp.KeyRingType');
goog.require('e2e.openpgp.asciiArmor');
goog.require('e2e.openpgp.block.EncryptedMessage');
goog.require('e2e.openpgp.block.LiteralMessage');
goog.require('e2e.openpgp.block.TransferablePublicKey');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.packet.SurrogateSecretKey');
/** @suppress {extraRequire} force loading of all signers */
goog.require('e2e.signer.all');
goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');



/**
 * Implements a "context". Provides a high level API for key management,
 * encryption and signing. This context is used by external code, such as the
 * extension's user interface, to call the base OpenPGP library.
 * @constructor
 * @param {!e2e.openpgp.managers.KeyManager} keyManager The Key Manager object.
 * @implements {e2e.openpgp.Context2}
 */
e2e.openpgp.Context2Impl = function(keyManager) {
  /**
   * Key Manager object.
   * @private {!e2e.openpgp.managers.KeyManager}
   */
  this.keyManager_ = keyManager;
  /**
   * Should the output of the functions be ASCII-armored.
   * @private {boolean}
   */
  this.armorOutput_ = true;
  /**
   * List of headers to add to armored messages (Version, Comment, etc).
   * @private {!Object<string>}
   */
  this.armorHeaders_ = {};
};


/**
 * Deferred constructor.
 * @param {!goog.Thenable<!e2e.openpgp.managers.KeyManager>} keyManagerPromise
 *     The promise of the Key Manager instance.
 * @return {!goog.Thenable<!e2e.openpgp.Context2Impl>} The Context2Impl
 *     promise, fulfilled when the object will initialize.
 */
e2e.openpgp.Context2Impl.launch = function(keyManagerPromise) {
  return keyManagerPromise.then(function(keyManager) {
    return new e2e.openpgp.Context2Impl(keyManager);
  });
};


/**
 * Promise of a message that can be encoded. Used internally in
 * {@link #encryptSign}.
 * @typedef {!goog.Thenable<!e2e.openpgp.block.Armorable>}
 * @private
 */
e2e.openpgp.Context2Impl.EncodableMessagePromise_;


/** @override */
e2e.openpgp.Context2Impl.prototype.getTrustedKeys = function(purpose, email) {
  return this.keyManager_.getTrustedKeys(purpose, email);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getAllSecretKeys = function(opt_providerId) {
  return this.keyManager_.getAllKeys(e2e.openpgp.KeyRingType.SECRET,
      opt_providerId);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getAllPublicKeys = function(opt_providerId) {
  return this.keyManager_.getAllKeys(e2e.openpgp.KeyRingType.PUBLIC,
      opt_providerId);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getPublicKeyByFingerprint = function(
    fingerprint, opt_providerId) {
  return this.keyManager_.getPublicKeyByFingerprint(fingerprint,
      opt_providerId);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.setProviderCredentials = function(providerId,
    credentials) {
  return this.keyManager_.setProviderCredentials(providerId, credentials);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getAllKeyGenerateOptions = function() {
  return this.keyManager_.getAllKeyGenerateOptions();
};


/** @override */
e2e.openpgp.Context2Impl.prototype.generateKeyPair = function(userId,
    generateOptions) {
  return this.keyManager_.generateKeyPair(userId, generateOptions);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getKeyringExportOptions = function(
    keyringType) {
  return this.keyManager_.getKeyringExportOptions(keyringType);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.exportKeyring = function(keyringType,
    exportOptions) {
  return this.keyManager_.exportKeyring(keyringType, exportOptions);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.trustKeys = function(keys, email, purpose,
    opt_trustData) {
  return this.keyManager_.trustKeys(keys, email, purpose, opt_trustData);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.isKeyTrusted = function(key, email,
    purpose) {
  // TODO(koto): implement.
  return goog.Promise.resolve(true);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.unlockSecretKey = function(key, unlockData) {
  return this.keyManager_.unlockSecretKey(key, unlockData);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.setArmorOutput = function(shouldArmor) {
  this.armorOutput_ = shouldArmor;
  return goog.Promise.resolve(undefined);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.setArmorHeader = function(name, value) {
  this.armorHeaders_[name] = value;
  return goog.Promise.resolve(undefined);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.initializeKeyProviders = function(
    config) {
  return this.keyManager_.initializeKeyProviders(config);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getKeyProviderIds = function() {
  return this.keyManager_.getKeyProviderIds();
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getKeyRingState = function() {
  return this.keyManager_.getKeyProvidersState();
};


/** @override */
e2e.openpgp.Context2Impl.prototype.reconfigureKeyProvider = function(providerId,
    newConfig) {
  return this.keyManager_.reconfigureKeyProvider(providerId, newConfig);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getKeysDescription = function(
    keySerialization) {
  return goog.Promise.resolve(undefined).then(function() {
    if (typeof keySerialization == 'string') {
      keySerialization = this.extractByteArrayFromArmorText_(keySerialization);
    }
    var blocks = e2e.openpgp.block.factory.parseByteArrayAllTransferableKeys(
        keySerialization, true /* skip keys with errors */);
    if (blocks.length == 0) {
      throw new e2e.openpgp.error.ParseError('No valid key blocks found.');
    }
    return e2e.openpgp.block.factory.extractKeys(
        blocks, true /* skip keys with errors */);
  }, null, this);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.importKeys = function(keySerialization,
    passphraseCallback) {
  if (typeof keySerialization == 'string') {
    keySerialization = this.extractByteArrayFromArmorText_(keySerialization);
  }
  return this.keyManager_.importKeys(keySerialization, passphraseCallback);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.encryptSign = function(plaintext, options,
    encryptionKeys, passphrases, signatureKeys) {
  return this.createSurrogateSecretKeys_(signatureKeys)
      .then(goog.partial(
          this.doEncryptSignOperation_,
          plaintext,
          options,
          encryptionKeys,
          passphrases), null, this)
      .then(this.encodeMessage_, null, this);
};


/**
 * Selects the correct encrypt/sign operation and calls it, returning the
 * results.
 * @param {!e2e.openpgp.Plaintext} plaintext The plaintext.
 * @param {!e2e.openpgp.EncryptOptions} options Metadata to add.
 * @param {!Array<!e2e.openpgp.Key>} encryptionKeys The keys to
 *     encrypt the message with.
 * @param {!Array<string>} passphrases Passphrases to use for symmetric
 *     key encryption of the message.
 * @param {!Array<!e2e.openpgp.packet.SurrogateSecretKey>} signKeys
 * @return {!e2e.openpgp.Context2Impl.EncodableMessagePromise_}
 *     The encrypted and/or signed message, before encoding.
 * @private
 */
e2e.openpgp.Context2Impl.prototype.doEncryptSignOperation_ = function(
    plaintext, options, encryptionKeys, passphrases, signKeys) {
  if (signKeys.length > 1) {
    // TODO(koto): Support multiple signing keys.
    throw new e2e.openpgp.error.UnsupportedError(
        'Signing with multiple keys is unsupported.');
  }
  var needsEncryption = (encryptionKeys.length > 0 || passphrases.length > 0);
  var result;
  if (needsEncryption) {
    // Encryption required.
    result = this.encryptSign_(
        plaintext,
        options,
        encryptionKeys,
        passphrases,
        signKeys);
  } else {
    // No encryption required, just signing.
    if (signKeys.length == 0) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'No signing keys provided.');
    }

    if (typeof plaintext == 'string') {
      // Clearsign messages support only single signature keys now.
      result = this.clearSign_(plaintext, signKeys[0]);
    } else {
      result = this.byteSign_(plaintext, signKeys);
    }
  }

  // Creating a type annotation here to satisfy the covariance/contravariance
  // problems of Thenables. Do NOT use this result object outside this class.
  return /** @type {!e2e.openpgp.Context2Impl.EncodableMessagePromise_} */ (
      result);
};


/**
 * Internal implementation of the encrypt/sign operation.
 * @param {!e2e.ByteArray|string} plaintext The plaintext.
 * @param {!e2e.openpgp.EncryptOptions} options Metadata to add.
 * @param {!e2e.openpgp.Keys} encryptionKeys The key handles to encrypt the
 *     message to.
 * @param {!Array<string>} passphrases Passphrases to use for symmetric
 *     key encryption of the message.
 * @param {!Array<!e2e.openpgp.packet.SurrogateSecretKey>} signatureKeys
 *     The keys to sign the message with.
 * @return {!goog.Thenable<!e2e.openpgp.block.EncryptedMessage>} The encrypted
 *     message.
 * @private
 */
e2e.openpgp.Context2Impl.prototype.encryptSign_ = function(
    plaintext, options, encryptionKeys, passphrases, signatureKeys) {
  var keyPromises = goog.array.map(encryptionKeys,
      this.requirePublicKey_, this);
  var literal = e2e.openpgp.block.LiteralMessage.construct(plaintext);
  goog.asserts.assert(signatureKeys.length <= 1);
  return goog.Promise.all(keyPromises).then(function(keys) {
    return e2e.openpgp.block.EncryptedMessage.construct(
        literal,
        keys,
        passphrases,
        signatureKeys[0] || undefined);
  });
};


/**
 * Converts a public key handle to a key block.
 * Throws an error when a key handle does not represent a public key or the
 * resulting key is invalid due to e.g. invalid/outdated signatures.
 * @param {!e2e.openpgp.Key} key A key handle.
 * @return {!goog.Thenable<!e2e.openpgp.block.TransferablePublicKey>}
 * @private
 */
e2e.openpgp.Context2Impl.prototype.requirePublicKey_ = function(key) {
  goog.asserts.assert(!key.key.secret);
  var keyBlock = e2e.openpgp.block.factory.parseByteArrayTransferableKey(
      key.serialized);
  if (keyBlock instanceof e2e.openpgp.block.TransferablePublicKey) {
    return keyBlock.processSignatures().then(function() { return keyBlock; });
  }
  throw new e2e.openpgp.error.InvalidArgumentsError('Invalid public key.');
};


/**
 * Creates surrogate keys with encryption/signing backed by the KeyProvider.
 * @param {!e2e.openpgp.Keys} keys
 * @return {!goog.Thenable<!Array<!e2e.openpgp.packet.SurrogateSecretKey>>}
 *     The surrogate keys.
 * @private
 */
e2e.openpgp.Context2Impl.prototype.createSurrogateSecretKeys_ = function(keys) {
  return goog.Promise.all(goog.array.map(keys,
      this.createSurrogateSecretKey_, this));
};


/**
 * Creates surrogate keys with encryption/signing backed by the KeyProvider.
 * @param {!e2e.openpgp.Key} key
 * @return {!goog.Thenable<!e2e.openpgp.packet.SurrogateSecretKey>} The
 *     surrogate key.
 * @private
 */
e2e.openpgp.Context2Impl.prototype.createSurrogateSecretKey_ = function(key) {
  return goog.Promise.resolve(key).then(function(key) {
    goog.asserts.assert(key.key.secret);
    return e2e.openpgp.packet.SurrogateSecretKey.constructSigningKey(
        key,
        goog.bind(this.keyManager_.sign, this.keyManager_));
  }, null, this);
};


/**
 * Internal implementation of the clear sign operation.
 * @param {string} plaintext The plaintext.
 * @param {!e2e.openpgp.packet.SurrogateSecretKey} key The key to sign the
 *     message with.
 * @return {!goog.Thenable<!e2e.openpgp.ClearSignMessage>}
 * @private
 */
e2e.openpgp.Context2Impl.prototype.clearSign_ = function(
    plaintext, key) {
  return e2e.openpgp.ClearSignMessage.construct(plaintext, key);
};


/**
 * Internal implementation of the byte sign operation.
 * @param {!e2e.ByteArray|string} plaintext The plaintext.
 * @param {!Array<!e2e.openpgp.packet.SurrogateSecretKey>} sigKeys The keys to
 *     sign the message with.
 * @return {!goog.Thenable<!e2e.openpgp.block.Message>}
 * @private
 */
e2e.openpgp.Context2Impl.prototype.byteSign_ = function(
    plaintext, sigKeys) {
  var msg = e2e.openpgp.block.LiteralMessage.construct(plaintext);
  goog.asserts.assert(sigKeys.length <= 1);
  var sigKey = sigKeys[0];
  if (!sigKey) {
    throw new e2e.openpgp.error.InvalidArgumentsError('Invalid signing key.');
  }
  return msg.signWithOnePass(sigKey).then(function() {
    return msg;
  });
};


/**
 * Encodes the encrypted and/or signed message for output.
 * @param {!e2e.openpgp.block.Armorable} message The message to encode.
 * @return {!e2e.ByteArray|string} The message, optionally armored.
 * @private
 */
e2e.openpgp.Context2Impl.prototype.encodeMessage_ = function(message) {
  if (this.armorOutput_) {
    return e2e.openpgp.asciiArmor.armorBlock(message, this.armorHeaders_);
  } else {
    return message.serialize();
  }
};


/** @override */
e2e.openpgp.Context2Impl.prototype.verifyDecrypt = function(encryptedMessage,
    passphraseCallback, opt_decryptionKeys, opt_verificationKeys) {
  return goog.Promise.resolve(undefined).then(function() {
    var encryptedData, charset;
    if (typeof encryptedMessage == 'string') {
      if (e2e.openpgp.asciiArmor.isClearSign(encryptedMessage)) {
        return this.verifyClearSign_(
            e2e.openpgp.asciiArmor.parseClearSign(encryptedMessage),
            opt_verificationKeys);
      }
      var armoredMessage = e2e.openpgp.asciiArmor.parse(encryptedMessage);
      charset = armoredMessage.charset;
      encryptedData = armoredMessage.data;
    } else {
      encryptedData = encryptedMessage;
    }
    return this.verifyDecryptInternal(
        encryptedData, passphraseCallback, charset, opt_decryptionKeys,
        opt_verificationKeys);
  }, null, this);
};


/**
 * Verifies a clearsign message signatures.
 * @param {!e2e.openpgp.ClearSignMessage} clearSignMessage Message to
 *     verify.
 * @param {!Array<!e2e.openpgp.Key>=} opt_verificationKeys If present,
 *     only those keys will be used for signature verification. Otherwise,
 *     Key ID hints in the message will be used to resolve the keys.
 * @return {!e2e.openpgp.VerifyDecryptPromise} Verification result
 * @private
 */
e2e.openpgp.Context2Impl.prototype.verifyClearSign_ = function(
    clearSignMessage, opt_verificationKeys) {
  return this.processLiteralMessage_(clearSignMessage.toLiteralMessage(),
      opt_verificationKeys)
      .then(function(result) {
        result.decrypt.wasEncrypted = false;
        return result;
      });
};


/**
 * Internal implementation of the verification/decryption operation.
 * @param {!e2e.ByteArray} encryptedMessage The encrypted data.
 * @param {function(string):!goog.Thenable<string>} passphraseCallback This
 *     callback is used for requesting an action-specific passphrase from the
 *     user.
 * @param {string=} opt_charset The (optional) charset to decrypt with.
 * @param {!Array<!e2e.openpgp.Key>=} opt_decryptionKeys If present,
 *     only those keys will be used for decryption. Otherwise, Context2 uses
 *     Key ID hints in the message to resolve keys on its own.
 * @param {!Array<!e2e.openpgp.Key>=} opt_verificationKeys If present,
 *     only those keys will be used for signature verification. Otherwise,
 *     Key ID hints in the message will be used to resolve the keys.
 * @protected
 * @return {!e2e.openpgp.VerifyDecryptPromise}
 */
e2e.openpgp.Context2Impl.prototype.verifyDecryptInternal = function(
    encryptedMessage, passphraseCallback, opt_charset, opt_decryptionKeys,
    opt_verificationKeys) {
  var block = e2e.openpgp.block.factory.parseByteArrayMessage(
      encryptedMessage, opt_charset);
  if (block instanceof e2e.openpgp.block.EncryptedMessage) {
    var keyCipherCallback = goog.bind(function(keyId, algorithm) {
      return goog.async.Deferred.fromPromise(
          this.getDecryptionCipher_(keyId, algorithm, opt_decryptionKeys));
    }, this);

    var pwCallbackWrapper = function(passphrase) {
      return goog.async.Deferred.succeed(passphrase).addCallback(
          passphraseCallback);
    };

    return block.decrypt(keyCipherCallback, pwCallbackWrapper)
        .addCallbacks(function(message) {
          return this.processLiteralMessage_(message, opt_verificationKeys);
        }, goog.Promise.reject, this)
        .then(function(result) {
          result.decrypt.wasEncrypted = true;
          return result;
        });
  } else {
    return this.processLiteralMessage_(block, opt_verificationKeys)
        .then(function(result) {
          result.decrypt.wasEncrypted = false;
          return result;
        });
  }
};


/**
 * Returns a decrypting cipher for a first found secret key with a given Key ID
 * Optionally limits the search to a set of key object in a provided array.
 * @param {!e2e.openpgp.KeyId} keyId Key ID hint.
 * @param {!e2e.cipher.Algorithm} algorithm Algorithm hint.
 * @param {!e2e.openpgp.Keys=} opt_allowedDecryptionKeys If provided,
 *     only ciphers for keys in that array can be returned.
 * @return {!goog.Promise<e2e.openpgp.KeyProviderCipher>} The cipher, or null
 *     if no matching cipher has been found.
 * @private
 */
e2e.openpgp.Context2Impl.prototype.getDecryptionCipher_ = function(keyId,
    algorithm, opt_allowedDecryptionKeys) {
  return goog.Promise.resolve(opt_allowedDecryptionKeys)
      .then(goog.partial(this.getDecryptionKeys_, keyId, algorithm), null, this)
      .then(goog.partial(this.getCipherForDecryptionKeys_, keyId, algorithm),
          null, this);
};


/**
 * Returns decryption key objects that match the given algorithm and keyId
 * hints. Optionally restricts the returned keys to given allowed keys list.
 * @param {!e2e.openpgp.KeyId} keyId Key ID hint.
 * @param {!e2e.cipher.Algorithm} algorithm Algorithm hint.
 * @param {!e2e.openpgp.Keys=} opt_allowedDecryptionKeys If provided,
 *     only keys in that array can be returned.
 * @return {!goog.Thenable<!e2e.openpgp.Keys>} The decryption keys.
 * @private
 */
e2e.openpgp.Context2Impl.prototype.getDecryptionKeys_ = function(
    keyId, algorithm, opt_allowedDecryptionKeys) {
  if (goog.isArray(opt_allowedDecryptionKeys)) {
    // Currently only the first key matching a Key ID is returned
    // Key ID collisions in secret keys can prevent decryption.

    // Preselect based on the key object
    var foundKey = goog.array.find(opt_allowedDecryptionKeys, function(key) {
      return (key.key.secret &&
          key.decryptionAlgorithm == algorithm &&
          e2e.compareByteArray(goog.asserts.assertArray(key.decryptionKeyId),
              keyId));
    });
    return goog.Promise.resolve(foundKey ? [foundKey] : []);
  } else {
    // Use the Key ID hint to resolve the key.
    return this.keyManager_.getKeysByKeyId(
        e2e.openpgp.KeyPurposeType.DECRYPTION, keyId);
  }
};


/**
 * Creates a decrypting cipher for the first of the given keys.
 * @param {!e2e.openpgp.KeyId} keyId Key ID hint.
 * @param {!e2e.cipher.Algorithm} algorithm Algorithm hint.
 * @param {!e2e.openpgp.Keys} keys Decryption keys. For the time being, only
 *     single-element arrays are accepted.
 * @return {?e2e.openpgp.KeyProviderCipher} Cipher bound to the provided key
 *     that can only decrypt. Null when no key was provided.
 * @private
 */
e2e.openpgp.Context2Impl.prototype.getCipherForDecryptionKeys_ = function(keyId,
    algorithm, keys) {
  if (keys.length == 0) {
    return null;
  }
  if (keys.length > 1) {
    throw new e2e.openpgp.error.UnsupportedError(
        'Multiple decryption keys are not supported.');
  }
  return new e2e.openpgp.KeyProviderCipher(
      algorithm,
      undefined,
      goog.bind(this.keyManager_.decrypt, this.keyManager_, keys[0], keyId));
};


/**
 * Processes a literal message and returns the result of verification.
 * @param {e2e.openpgp.block.Message} block
 * @param {!Array<!e2e.openpgp.Key>=} opt_verificationKeys If present,
 *     only those keys will be used for signature verification. Otherwise,
 *     Key ID hints in the message will be used to resolve the keys.
 * @return {!e2e.openpgp.VerifyDecryptPromise}
 * @private
 */
e2e.openpgp.Context2Impl.prototype.processLiteralMessage_ = function(block,
    opt_verificationKeys) {
  var literalBlock = block.getLiteralMessage();
  var verifyPromise = goog.Promise.resolve(null);
  if (literalBlock.signatures) {
    verifyPromise = this.verifyMessage_(literalBlock, opt_verificationKeys);
  }
  return verifyPromise.then(function(verify) {
    return /** @type {!e2e.openpgp.VerifiedDecrypt} */ ({
      'decrypt': {
        'data': new Uint8Array(literalBlock.getData()),
        'options': {
          'charset': literalBlock.getCharset(),
          'creationTime': literalBlock.getTimestamp(),
          'filename': literalBlock.getFilename()
        },
        'wasEncrypted': false
      },
      'verify': verify
    });
  });
};


/**
 * Verifies signatures places on a LiteralMessage
 * @param {!e2e.openpgp.block.LiteralMessage} message Block to verify
 * @param {!Array<!e2e.openpgp.Key>=} opt_verificationKeys If present,
 *     only those keys will be used for signature verification. Otherwise,
 *     Key ID hints in the message will be used to resolve the keys.
 * @return {!goog.Thenable<e2e.openpgp.VerifyResult>} Verification result.
 * @private
 */
e2e.openpgp.Context2Impl.prototype.verifyMessage_ = function(
    message, opt_verificationKeys) {
  var keyBlocksPromise;

  if (goog.isDefAndNotNull(opt_verificationKeys)) {
    // We know the keys upfront.
    keyBlocksPromise = goog.Promise.all(
        goog.array.map(opt_verificationKeys, this.requirePublicKey_, this));
  } else {
    // Get keys matching key IDs declared in signatures.
    keyBlocksPromise = goog.Promise.all(
        goog.array.map(message.getSignatureKeyIds(), goog.bind(function(keyId) {
          return this.keyManager_.getKeysByKeyId(
              e2e.openpgp.KeyPurposeType.VERIFICATION, keyId);
        }, this))).then(function(keyHandles) {
          var foundKeys = goog.array.flatten(goog.array.filter(
              keyHandles, function(keyHandle) {
                return !goog.isNull(keyHandle);
              }));
          return goog.Promise.all(
              goog.array.map(foundKeys, this.requirePublicKey_, this));
        }, null, this);
  }

  return keyBlocksPromise.then(function(verificationKeys) {
    return message.verify(verificationKeys);
  }).then(function(verifyResult) {
    return {
      success: goog.array.map(verifyResult.success, function(key) {
        return key.toKeyObject();
      }),
      failure: goog.array.map(verifyResult.failure, function(key) {
        return key.toKeyObject();
      })
    };
  });
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getAllKeysByEmail = function(email) {
  return this.keyManager_.getAllKeysByEmail(email);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.removeKeys = function(keys) {
  return this.keyManager_.removeKeys(keys);
};


/**
 * @param {string} text String with one or more armor messages.
 * @return {!e2e.ByteArray} Serialized keys.
 * @private
 */
e2e.openpgp.Context2Impl.prototype.extractByteArrayFromArmorText_ = function(
    text) {
  var messages = e2e.openpgp.asciiArmor.parseAll(text);
  var bytes = [];
  goog.array.forEach(messages, function(armor) {
    goog.array.extend(bytes, armor.data);
  });
  return bytes;
};

