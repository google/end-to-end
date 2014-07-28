// Copyright 2013 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
goog.require('e2e.openpgp.block.Message');
goog.require('e2e.openpgp.block.TransferableKey');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.PassphraseError');
/** @suppress {extraRequire} force loading of all signers */
goog.require('e2e.signer.all');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.DeferredList');
goog.require('goog.structs');
goog.require('goog.structs.Map');




/**
 * Implements a "context". Provides a high level API for encryption and signing
 *     services. This context is used by external code, such as the extension's
 *     user interface, to call the base OpenPGP library.
 * @constructor
 * @implements {e2e.openpgp.Context}
 */
e2e.openpgp.ContextImpl = function() {
  /**
   * List of headers to add to armored messages (Version, Comment, etc).
   * @type {!Object.<string>}
   * @private
   */
  this.armorHeaders_ = {};
};


/** @override */
e2e.openpgp.ContextImpl.prototype.armorOutput = true;


/** @override */
e2e.openpgp.ContextImpl.prototype.setArmorHeader = function(name, value) {
  this.armorHeaders_[name] = value;
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
  this.keyRing_ = new e2e.openpgp.KeyRing(passphrase);
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.changeKeyRingPassphrase = function(
    passphrase) {
  this.keyRing_.changePassphrase(passphrase);
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.hasPassphrase = function() {
  return goog.isDefAndNotNull(this.keyRing_) && this.keyRing_.hasPassphrase();
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.isKeyRingEncrypted = function() {
  return this.keyRing_.isEncrypted();
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.getKeyDescription = function(key) {
  try {
    if (typeof key == 'string') {
      key = e2e.openpgp.asciiArmor.parse(key).data;
    }
    var blocks = e2e.openpgp.block.factory.parseByteArrayMulti(key);
    return e2e.async.Result.toResult(
        e2e.openpgp.block.factory.extractKeys(blocks));
  } catch (e) {
    return e2e.async.Result.toError(e);
  }
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.importKey = function(
    passphraseCallback, key) {
  if (typeof key == 'string') {
    key = e2e.openpgp.asciiArmor.parse(key).data;
  }
  var blocks = e2e.openpgp.block.factory.parseByteArrayMulti(key);
  var importedBlocksResult = goog.array.map(blocks, function(block) {
    goog.asserts.assertInstanceof(block, e2e.openpgp.block.TransferableKey);
    return this.tryToImportKey_(passphraseCallback, block);
  }, this);
  var allResults =
      /** @type {!goog.async.Deferred.<!Array.<!string>>} */ (
          goog.async.DeferredList.gatherResults(importedBlocksResult)
              .addCallback(function(importedBlocks) {
    return goog.array.flatten(goog.array.map(importedBlocks, function(block) {
      return block ? block.getUserIds() : [];
    }));
  }));
  return allResults;
};


/**
 * Attempts to decrypt and import the key with the given passphrase.
 * @param {function(string, function(string))} callback
 * @param {!e2e.openpgp.block.TransferableKey} block
 * @param {e2e.async.Result.<!Array.<string>>=} opt_result
 * @param {string=} opt_passphrase
 * @return {!e2e.async.Result.<!Array.<string>>} Result with all imported uids.
 * @private
 */
e2e.openpgp.ContextImpl.prototype.tryToImportKey_ = function(
    callback, block, opt_result, opt_passphrase) {
  var result = opt_result || new e2e.async.Result();
  try {
    var passphrase = goog.isDef(opt_passphrase) ?
        e2e.stringToByteArray(opt_passphrase) : undefined;
    this.keyRing_.importKey(block, passphrase);
    result.callback(block);
  } catch (e) {
    if (e instanceof e2e.openpgp.error.PassphraseError) {
      if (opt_passphrase == '') {
        // Allow the user to bail out.
        result.callback(null);
      } else {
        callback(
            block.getUserIds().join('\n'),
            goog.bind(this.tryToImportKey_, this, callback, block, result));
      }
    }
  }
  return result;
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
 * @param {function(string, function(string))} passphraseCallback This callback
 *     is used for requesting an action-specific passphrase from the user.
 * @param {!e2e.ByteArray} encryptedMessage The encrypted data.
 * @param {string=} opt_charset The (optional) charset to decrypt with.
 * @protected
 * @return {!e2e.openpgp.VerifyDecryptResult}
 */
e2e.openpgp.ContextImpl.prototype.verifyDecryptInternal = function(
    passphraseCallback, encryptedMessage, opt_charset) {
  try {
    var block = e2e.openpgp.block.factory.parseByteArray(
        encryptedMessage, opt_charset);
    if (block instanceof e2e.openpgp.block.EncryptedMessage) {
      var keyCallback = goog.bind(this.keyRing_.getSecretKey, this.keyRing_);
      return block.decrypt(keyCallback, passphraseCallback).addCallback(
          this.processLiteralMessage_, this);
    } else {
      if (block instanceof e2e.openpgp.block.Message) {
        return this.processLiteralMessage_(block);
      } else {
        throw new e2e.openpgp.error.ParseError('Invalid message block.');
      }
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
    return this.clearSignInternal(plaintext, signatureKeyBlock);
  }
  var encryptSignResult = this.encryptSignInternal(
      plaintext,
      options,
      goog.array.map(encryptionKeys, this.keyRing_.getKeyBlock, this.keyRing_),
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
 * Internal implementation of the encrypt/sign operation.
 * @param {string} plaintext The plaintext.
 * @param {!e2e.openpgp.block.TransferableKey} key The key to sign the
 *     message with.
 * @protected
 * @return {!e2e.openpgp.EncryptSignResult}
 */
e2e.openpgp.ContextImpl.prototype.clearSignInternal = function(
    plaintext, key) {
  var message = e2e.openpgp.ClearSignMessage.construct(plaintext, key);
  var cleartext = e2e.openpgp.asciiArmor.encodeClearSign(message,
      this.armorHeaders_);
  return e2e.async.Result.toResult(cleartext);
};


/**
 * Internal implementation of the encrypt/sign operation.
 * @param {string} plaintext The plaintext.
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
    var literal = e2e.openpgp.block.LiteralMessage.fromText(plaintext);
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
  /** @type {!Array.<!e2e.openpgp.block.TransferableKey>} */
  var keyBlocks = this.keyRing_.searchKey(uid, type) || [];
  /** @type {!e2e.openpgp.Keys} */
  var keys = goog.array.map(keyBlocks,
    function(keyBlock) {
    return keyBlock.toKeyObject();
  });
  return e2e.async.Result.toResult(keys);
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
/* TODO(user): Remove email when we can use keyserver for lookups */
e2e.openpgp.ContextImpl.prototype.restoreKeyring = function(data, email) {
  return e2e.async.Result.toResult(this.keyRing_.restoreKeyring(data, email));
};
