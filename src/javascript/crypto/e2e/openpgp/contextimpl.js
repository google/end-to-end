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
 * @fileoverview Internal implementation of Context.
 */

goog.provide('e2e.openpgp.ContextImpl');

goog.require('e2e');
goog.require('e2e.async.Result');
/** @suppress {extraRequire} force loading of all ciphers */
goog.require('e2e.cipher.all');
/** @suppress {extraRequire} force loading of all compression methods */
goog.require('e2e.compression.all');
/** @suppress {extraRequire} force loading of all hash functions */
goog.require('e2e.hash.all');
goog.require('e2e.openpgp.ClearSignMessage');
goog.require('e2e.openpgp.Context');
goog.require('e2e.openpgp.KeyRing');
goog.require('e2e.openpgp.asciiArmor');
goog.require('e2e.openpgp.block.EncryptedMessage');
goog.require('e2e.openpgp.block.LiteralMessage');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.PassphraseError');
/** @suppress {extraRequire} force loading of all signers */
goog.require('e2e.signer.all');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.DeferredList');
goog.require('goog.storage.mechanism.HTML5LocalStorage');
goog.require('goog.structs');
goog.require('goog.structs.Map');



/**
 * Implements a "context". Provides a high level API for encryption and signing
 *     services. This context is used by external code, such as the extension's
 *     user interface, to call the base OpenPGP library.
 * @constructor
 * @implements {e2e.openpgp.Context}
 * @param {goog.storage.mechanism.Mechanism=} opt_keyRingStorageMechanism
 *     mechanism for storing keyring data. Defaults to HTML5 local storage.
 */
e2e.openpgp.ContextImpl = function(opt_keyRingStorageMechanism) {
  /**
   * List of headers to add to armored messages (Version, Comment, etc).
   * @type {!Object.<string>}
   * @private
   */
  this.armorHeaders_ = {};

  this.keyServerUrl = e2e.openpgp.ContextImpl.KEY_SERVER_URL || undefined;

  /**
   * Mechanism for storing keyring data.
   * @type {!goog.storage.mechanism.Mechanism}
   * @private
   */
  this.keyRingStorageMechanism_ = opt_keyRingStorageMechanism ||
      new goog.storage.mechanism.HTML5LocalStorage();
};


/**
 * @define {string} The URL of the key server.
 */
e2e.openpgp.ContextImpl.KEY_SERVER_URL = '';


/** @override */
e2e.openpgp.ContextImpl.prototype.armorOutput = true;


/** @override */
e2e.openpgp.ContextImpl.prototype.keyServerUrl;


/** @override */
e2e.openpgp.ContextImpl.prototype.setArmorHeader = function(name, value) {
  this.armorHeaders_[name] = value;
  return e2e.async.Result.toResult(undefined);
};


/**
 * KeyRing used to store all of the user's keys.
 * @type {e2e.openpgp.KeyRing}
 * @private
 */
e2e.openpgp.ContextImpl.prototype.keyRing_ = null;


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.setKeyRingPassphrase = function(
    passphrase) {
  this.keyRing_ = new e2e.openpgp.KeyRing(passphrase,
      this.keyRingStorageMechanism_, this.keyServerUrl);
  return e2e.async.Result.toResult(undefined);
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.changeKeyRingPassphrase = function(
    passphrase) {
  this.keyRing_.changePassphrase(passphrase);
  return e2e.async.Result.toResult(undefined);
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.hasPassphrase = function() {
  return e2e.async.Result.toResult(
      goog.isDefAndNotNull(this.keyRing_) && this.keyRing_.hasPassphrase());
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.isKeyRingEncrypted = function() {
  return e2e.async.Result.toResult(this.keyRing_.isEncrypted());
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.getKeyDescription = function(key) {
  try {
    if (typeof key == 'string') {
      key = this.extractByteArrayFromArmorText_(key);
    }
    var blocks = e2e.openpgp.block.factory.parseByteArrayAllTransferableKeys(
        key, true /* skip keys with errors */);
    if (blocks.length == 0) {
      throw new e2e.openpgp.error.ParseError('No valid key blocks found.');
    }
    return e2e.async.Result.toResult(
        e2e.openpgp.block.factory.extractKeys(
            blocks, true /* skip keys with errors */));
  } catch (e) {
    return e2e.async.Result.toError(e);
  }
};


/**
 * @private
 * @param {string} text String with one or more armor messages.
 * @return {!e2e.ByteArray} Serialized keys
 */
e2e.openpgp.ContextImpl.prototype.extractByteArrayFromArmorText_ = function(
    text) {
  var messages = e2e.openpgp.asciiArmor.parseAll(text);
  var bytes = [];
  goog.array.forEach(messages, function(armor) {
    goog.array.extend(bytes, armor.data);
  });
  return bytes;
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.importKey = function(
    passphraseCallback, key) {
  if (typeof key == 'string') {
    key = this.extractByteArrayFromArmorText_(key);
  }
  var blocks = e2e.openpgp.block.factory.parseByteArrayAllTransferableKeys(
      key, true /* skip keys with errors */);
  if (blocks.length == 0) {
    throw new e2e.openpgp.error.ParseError('No valid key blocks found.');
  }
  var importedBlocksResult = goog.array.map(blocks, function(block) {
    return this.tryToImportKey_(passphraseCallback, block);
  }, this);
  var allResults = (
      goog.async.DeferredList.gatherResults(importedBlocksResult)
      .addCallback(function(importedBlocks) {
        return goog.array.flatten(goog.array.map(importedBlocks,
            function(block) {
              return block ? block.getUserIds() : [];
            }));
      }));
  return allResults;
};


/**
 * Attempts to decrypt and import the key with the given passphrase.
 * @param {function(string):!e2e.async.Result<string>} callback Callback used
 *     to provide a passphrase.
 * @param {!e2e.openpgp.block.TransferableKey} block
 * @param {e2e.async.Result.<e2e.openpgp.block.TransferableKey>=}
 *     opt_result Result from the previous call.
 * @param {string=} opt_passphrase
 * @return {!e2e.async.Result.<
 *     e2e.openpgp.block.TransferableKey>} Result with all imported uids.
 * @private
 */
e2e.openpgp.ContextImpl.prototype.tryToImportKey_ = function(
    callback, block, opt_result, opt_passphrase) {
  var result = opt_result || new e2e.async.Result();
  try {
    var passphrase = goog.isDef(opt_passphrase) ?
        e2e.stringToByteArray(opt_passphrase) : undefined;
    // Ignore the return value. If the key is invalid (e.g. because of wrong
    // certification), importKey throws. False as a return value only indicates
    // duplicate keys already existing.
    this.keyRing_.importKey(block, passphrase);
    result.callback(block);
  } catch (e) {
    if (e instanceof e2e.openpgp.error.PassphraseError) {
      if (opt_passphrase == '') {
        // Allow the user to bail out.
        result.callback(null);
      } else {
        callback(block.getUserIds().join('\n')).addCallback(
            goog.bind(this.tryToImportKey_, this, callback, block, result));
      }
    } else {
      result.errback(e);
    }
  }
  return /** @type {!e2e.async.Result.<e2e.openpgp.block.TransferableKey>} */ (
      result.branch());
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.generateKey = function(
    keyAlgo, keyLength, subkeyAlgo, subkeyLength,
    name, comment, email, expirationDate) {
  var description = name || '';
  if (email) {
    if (description.length > 0) {
      description += ' ';
    }
    description += '<' + email + '>';
  }
  return this.keyRing_.generateKey(
      description, keyAlgo, keyLength, subkeyAlgo, subkeyLength).addCallback(
      function(res) {
        return goog.array.map(res, function(keyBlock) {
          return keyBlock.toKeyObject();
        });
      });
};


/**
 * Verifies a clearsign message signatures.
 * @param  {string|!e2e.openpgp.ClearSignMessage} clearSignMessage Message to
 *     verify.
 * @return {!e2e.openpgp.VerifyDecryptResult} verification result
 * @private
 */
e2e.openpgp.ContextImpl.prototype.verifyClearSign_ = function(
    clearSignMessage) {
  try {
    if (typeof clearSignMessage == 'string') {
      clearSignMessage = e2e.openpgp.asciiArmor.parseClearSign(
          clearSignMessage);
    }
    return this.processLiteralMessage_(clearSignMessage.toLiteralMessage());
  } catch (e) {
    return e2e.async.Result.toError(e);
  }
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.verifyDecrypt = function(
    passphraseCallback, encryptedMessage) {
  var encryptedData, charset;
  if (typeof encryptedMessage == 'string') {
    if (e2e.openpgp.asciiArmor.isClearSign(encryptedMessage)) {
      return this.verifyClearSign_(encryptedMessage);
    }
    var armoredMessage = e2e.openpgp.asciiArmor.parse(encryptedMessage);
    charset = armoredMessage.charset;
    encryptedData = armoredMessage.data;
  } else {
    encryptedData = encryptedMessage;
  }
  return this.verifyDecryptInternal(
      passphraseCallback, encryptedData, charset);
};


/**
 * Internal implementation of the verification/decryption operation.
 * @param {function(string):!e2e.async.Result<string>} passphraseCallback This
 *     callback is used for requesting an action-specific passphrase from the
 *     user.
 * @param {!e2e.ByteArray} encryptedMessage The encrypted data.
 * @param {string=} opt_charset The (optional) charset to decrypt with.
 * @protected
 * @return {!e2e.openpgp.VerifyDecryptResult}
 */
e2e.openpgp.ContextImpl.prototype.verifyDecryptInternal = function(
    passphraseCallback, encryptedMessage, opt_charset) {
  try {
    var block = e2e.openpgp.block.factory.parseByteArrayMessage(
        encryptedMessage, opt_charset);
    if (block instanceof e2e.openpgp.block.EncryptedMessage) {
      var keyCallback = goog.bind(this.keyRing_.getSecretKey, this.keyRing_);
      return block.decrypt(keyCallback, passphraseCallback).addCallback(
          this.processLiteralMessage_, this);
    } else {
      return this.processLiteralMessage_(block);
    }
  } catch (e) {
    return e2e.async.Result.toError(e);
  }
};


/**
 * Processes a literal message and returns the result of verification.
 * @param {e2e.openpgp.block.Message} block
 * @return {!e2e.openpgp.VerifyDecryptResult}
 * @private
 */
e2e.openpgp.ContextImpl.prototype.processLiteralMessage_ = function(block) {
  var literalBlock = block.getLiteralMessage();
  var verifyResult = null;
  if (literalBlock.signatures) {
    verifyResult = this.verifyMessage_(literalBlock);
  }
  /** @type {!e2e.openpgp.VerifiedDecrypt} */
  var result = {
    'decrypt': {
      'data': literalBlock.getData(),
      'options': {
        'charset': literalBlock.getCharset(),
        'creationTime': literalBlock.getTimestamp(),
        'filename': literalBlock.getFilename()
      }
    },
    'verify': verifyResult
  };
  return e2e.async.Result.toResult(result);
};


/**
 * Verifies signatures places on a LiteralMessage
 * @param  {!e2e.openpgp.block.LiteralMessage} message Block to verify
 * @return {!e2e.openpgp.VerifyResult} Verification result.
 * @private
 */
e2e.openpgp.ContextImpl.prototype.verifyMessage_ = function(
    message) {
  // Get keys matching key IDs declared in signatures.
  var keyBlocks = goog.array.map(message.getSignatureKeyIds(), goog.bind(
      function(keyId) {
        return this.keyRing_.getKeyBlockById(keyId);
      }, this));
  // Verify not empty key blocks only
  var verifyResult = message.verify(goog.array.filter(keyBlocks,
      function(block) {
        return !goog.isNull(block);
      }));
  return {
    success: goog.array.map(verifyResult.success, function(key) {
      return key.toKeyObject();
    }),
    failure: goog.array.map(verifyResult.failure, function(key) {
      return key.toKeyObject();
    })
  };
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.encryptSign = function(
    plaintext, options, encryptionKeys, passphrases, opt_signatureKey) {
  var signatureKeyBlock;
  if (opt_signatureKey) {
    signatureKeyBlock = this.keyRing_.getKeyBlock(opt_signatureKey);
  }
  if (encryptionKeys.length == 0 && passphrases.length == 0 &&
      signatureKeyBlock) {
    if (typeof plaintext == 'string' && this.armorOutput) {
      return this.clearSignInternal(plaintext, signatureKeyBlock);
    } else {
      return this.byteSignInternal(
          goog.asserts.assertArray(plaintext), signatureKeyBlock);
    }
  }
  // De-duplicate keys.
  var keyMap = new goog.structs.Map();
  goog.array.forEach(encryptionKeys, function(key) {
    keyMap.set(key.key.fingerprintHex, key);
  });
  var encryptSignResult = this.encryptSignInternal(
      plaintext,
      options,
      goog.array.map(keyMap.getValues(), this.keyRing_.getKeyBlock,
                     this.keyRing_),
      passphrases,
      signatureKeyBlock);
  if (this.armorOutput) {
    return encryptSignResult.addCallback(function(data) {
      return e2e.openpgp.asciiArmor.encode(
          'MESSAGE', goog.asserts.assertArray(data), this.armorHeaders_);
    }, this);
  } else {
    return encryptSignResult;
  }
};


/**
 * Internal implementation of the clear sign operation.
 * @param {string} plaintext The plaintext.
 * @param {!e2e.openpgp.block.TransferableKey} key The key to sign the
 *     message with.
 * @protected
 * @return {!e2e.openpgp.EncryptSignResult}
 */
e2e.openpgp.ContextImpl.prototype.clearSignInternal = function(
    plaintext, key) {
  var messageRes = e2e.openpgp.ClearSignMessage.construct(plaintext, key);
  return messageRes.addCallback(function(message) {
    return e2e.openpgp.asciiArmor.encodeClearSign(message, this.armorHeaders_);
  }, this);
};


/**
 * Internal implementation of the byte sign operation.
 * @param {!e2e.ByteArray} plaintext The plaintext.
 * @param {!e2e.openpgp.block.TransferableKey} key The key to sign the
 *     message with.
 * @protected
 * @return {!e2e.openpgp.EncryptSignResult}
 */
e2e.openpgp.ContextImpl.prototype.byteSignInternal = function(
    plaintext, key) {
  var msg = e2e.openpgp.block.LiteralMessage.construct(plaintext);
  var sigKey = key.getKeyToSign();
  if (goog.isDefAndNotNull(sigKey)) {
    return msg.signWithOnePass(sigKey).addCallback(function() {
      var data = msg.serialize();
      if (this.armorOutput) {
        return e2e.openpgp.asciiArmor.encode(
            'MESSAGE',
            goog.asserts.assertArray(data),
            this.armorHeaders_);
      }
      return data;
    }, this);
  }
  return e2e.async.Result.toError(
      new e2e.openpgp.error.InvalidArgumentsError('Invalid signing key.'));
};


/**
 * Internal implementation of the encrypt/sign operation.
 * @param {string|!e2e.ByteArray} plaintext The plaintext.
 * @param {!e2e.openpgp.EncryptOptions} options Metadata to add.
 * @param {!Array.<!e2e.openpgp.block.TransferableKey>} encryptionKeys The
 *     keys to encrypt the message with.
 * @param {!Array.<string>} passphrases Passphrases to use for symmetric
 *     key encryption of the message.
 * @param {e2e.openpgp.block.TransferableKey=} opt_signatureKey The key to
 *     sign the message with.
 * @protected
 * @return {!e2e.openpgp.EncryptSignResult}
 */
e2e.openpgp.ContextImpl.prototype.encryptSignInternal = function(
    plaintext, options, encryptionKeys, passphrases, opt_signatureKey) {
  try {
    var literal = e2e.openpgp.block.LiteralMessage.construct(plaintext);
    var blockResult = e2e.openpgp.block.EncryptedMessage.construct(
        literal,
        encryptionKeys,
        passphrases,
        opt_signatureKey);
    var serializedBlock = blockResult.addCallback(function(block) {
      return block.serialize();
    }, this);
    return serializedBlock;
  } catch (e) {
    /** @type {!e2e.openpgp.EncryptSignResult} */
    var errorResult = new e2e.async.Result();
    errorResult.errback(e);
    return errorResult;
  }
};


/**
 * Searches a key (either public, private, or both) in the keyring.
 * @param {string} uid The user id.
 * @param {!e2e.openpgp.KeyRing.Type} type Type of key to search for.
 * @private
 * @return {!e2e.openpgp.KeyResult} The result of the search.
 */
e2e.openpgp.ContextImpl.prototype.searchKey_ = function(uid, type) {
  return this.keyRing_.searchKeyLocalAndRemote(uid, type).addCallback(
      function(keyBlocks) {
        return /** @type {!e2e.openpgp.Keys} */ (goog.array.map(keyBlocks,
            function(keyBlock) {
              return keyBlock.toKeyObject();
            }));
      });
};


/** @override */
e2e.openpgp.ContextImpl.prototype.searchPublicKey = function(uid) {
  return this.searchKey_(uid, e2e.openpgp.KeyRing.Type.PUBLIC);
};


/** @override */
e2e.openpgp.ContextImpl.prototype.searchPrivateKey = function(uid) {
  return this.searchKey_(uid, e2e.openpgp.KeyRing.Type.PRIVATE);
};


/** @override */
e2e.openpgp.ContextImpl.prototype.searchKey = function(uid) {
  return this.searchKey_(uid, e2e.openpgp.KeyRing.Type.ALL);
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.getAllKeys = function(opt_priv) {
  var keyMap = this.keyRing_.getAllKeys(opt_priv);
  var result = /** @type {!e2e.openpgp.KeyRingMap} */ (
      goog.structs.map(keyMap, function(keyList) {
        return goog.array.map(keyList, function(keyBlock) {
          return keyBlock.toKeyObject();
        });
      }));
  return e2e.async.Result.toResult(result);
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.deleteKey = function(uid) {
  this.keyRing_.deleteKey(uid);
  return e2e.async.Result.toResult(undefined);
};


/**
 * Obtains a passphrase from the user.
 * @param {function(string, function(string))} passphraseCallback This callback
 *     is used for requesting an action-specific passphrase from the user.
 * @param {string} message A message to display to the user.
 * @return {!e2e.async.Result.<!e2e.ByteArray>} A result with the passphrase.
 * @private
 */
e2e.openpgp.ContextImpl.prototype.getPassphrase_ =
    function(passphraseCallback, message) {
  /**
   * Obtains a passphrase from the user.
   * @type {!e2e.async.Result.<!e2e.ByteArray>}
   */
  var passphraseResult = new e2e.async.Result();
  passphraseCallback(message, function(passphrase) {
    passphraseResult.callback(e2e.stringToByteArray(passphrase));
  });
  return passphraseResult;
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.exportKeyring = function(armored) {
  return this.getAllKeys().addCallback(
      function(keys) {
        keys = new goog.structs.Map(keys);
        var serialized = goog.array.flatten(goog.array.map(
            goog.array.flatten(keys.getValues()),
            function(keyInfo) {
              return this.keyRing_.getKeyBlock(keyInfo).serialize();
            }, this));
        if (armored) {
          return e2e.openpgp.asciiArmor.encode(
              'PRIVATE KEY BLOCK', serialized, this.armorHeaders_);
        }
        return serialized;
      }, this);
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.getKeyringBackupData = function() {
  return e2e.async.Result.toResult(this.keyRing_.getKeyringBackupData());
};


/** @inheritDoc */
/* TODO(rcc): Remove email when we can use keyserver for lookups */
e2e.openpgp.ContextImpl.prototype.restoreKeyring = function(data, email) {
  return e2e.async.Result.toResult(this.keyRing_.restoreKeyring(data, email));
};
