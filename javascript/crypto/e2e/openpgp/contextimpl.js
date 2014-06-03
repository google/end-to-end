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
goog.require('e2e.cipher.Error');
goog.require('e2e.cipher.all');
goog.require('e2e.compression.all');
goog.require('e2e.hash.all');
goog.require('e2e.openpgp.Context');
goog.require('e2e.openpgp.KeyRing');
goog.require('e2e.openpgp.asciiArmor');
goog.require('e2e.openpgp.block.EncryptedMessage');
goog.require('e2e.openpgp.block.TransferablePublicKey');
goog.require('e2e.openpgp.block.all');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.error.DecryptError');
goog.require('e2e.openpgp.error.PassphraseError');
goog.require('e2e.openpgp.packet.Compressed');
goog.require('e2e.openpgp.packet.Data');
goog.require('e2e.openpgp.packet.Key');
goog.require('e2e.openpgp.packet.LiteralData');
goog.require('e2e.openpgp.packet.OnePassSignature');
goog.require('e2e.openpgp.packet.SecretKey');
goog.require('e2e.openpgp.packet.SecretSubkey');
goog.require('e2e.openpgp.packet.Signature');
goog.require('e2e.openpgp.packet.SymmetricKey');
goog.require('e2e.openpgp.packet.all');
goog.require('e2e.openpgp.parse');
goog.require('e2e.signer.all');
goog.require('goog.array');
goog.require('goog.async.DeferredList');
goog.require('goog.structs');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');



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


/**
 * Maximum nesting level of compressed blocks - see CVE-2013-4402
 * @const {number}
 */
e2e.openpgp.ContextImpl.prototype.MAX_COMPRESSION_NESTING_LEVEL = 20;


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
  // TODO(adhintz) Key block is parsed again in importKey. Refactor to
  // remove repeated work.
  if (typeof key == 'string') {
    key = e2e.openpgp.asciiArmor.parse(key).data;
  }
  var blocks = e2e.openpgp.block.factory.parseByteArrayMulti(key);
  var description = '';
  for (var b = 0; b < blocks.length; b++) {
    for (var i = 0; i < blocks[b].userIds.length; i++) {
      description += '\n' + blocks[b].userIds[i].userId + '\n';
      if (blocks[b].keyPacket instanceof e2e.openpgp.packet.SecretKey) {
        description += 'Private key ';
      }
      description += goog.crypt.byteArrayToHex(blocks[b].keyPacket.fingerprint);
      description += '\n';
      for (var s = 0; s < blocks[b].subKeys.length; s++) {
        if (blocks[b].subKeys[s] instanceof
            e2e.openpgp.packet.SecretSubkey) {
          description += 'Private subkey ';
        }
        description += goog.crypt.byteArrayToHex(
            blocks[b].subKeys[s].fingerprint) + '\n';
      }
    }
  }
  return description;
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.importKey = function(
    passphraseCallback, key) {
  if (typeof key == 'string') {
    key = e2e.openpgp.asciiArmor.parse(key).data;
  }
  var blocks = e2e.openpgp.block.factory.parseByteArrayMulti(key);
  var importedBlocksResult = goog.array.map(
      blocks,
      goog.bind(function(block) {
        return this.tryToImportKey_(passphraseCallback, block);
      }, this));
  return /** @type {e2e.openpgp.ImportKeyResult} */ (
      goog.async.DeferredList.gatherResults(
      importedBlocksResult).addCallback(function(importedBlocks) {
    return goog.array.flatten(
          goog.array.map(
              importedBlocks,
              function(block) {
                return block ? block.getUserIds() : [];
              }));
  }));
};


/**
 * Attempts to decrypt and import the key with the given passphrase.
 * @param {function(string, function(string))} callback
 * @param {e2e.openpgp.block.TransferableKey} block
 * @param {e2e.async.Result.<Array.<string>>=} opt_result
 * @param {string=} opt_passphrase
 * @return {e2e.async.Result.<Array.<string>>} Result with all imported uids.
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
  var res = this.keyRing_.generateKey(
      description, keyAlgo, keyLength, subkeyAlgo, subkeyLength);
  return e2e.async.Result.toResult(
      goog.array.map(res, this.keyBlockToKeyObject_, this));
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.verifyClearSign = function(
    clearSignMessage) {
  /** @type {e2e.openpgp.VerifyClearSignResult} */
  var result = new e2e.async.Result();
  try {
    if (typeof clearSignMessage == 'string') {
      clearSignMessage = e2e.openpgp.asciiArmor.parseClearSign(
        clearSignMessage);
    }
    var signaturePacket = e2e.openpgp.parse.parseSerializedPacket(
      clearSignMessage.signature);
    var signerKeyId = signaturePacket.getSignerKeyId();
    if (goog.array.equals(signerKeyId,
          e2e.openpgp.constants.EMPTY_KEY_ID)) {
        result.callback(false); // Key ID not found in signature.
        return result;
    }
    var key = this.keyRing_.getKey(signerKeyId);
    if (!key) {
        result.callback(false); // Key not found in keyring.
        return result;
    }
    result.callback(signaturePacket.verify(e2e.stringToByteArray(
      clearSignMessage.body), key.cipher));
  } catch (e) {
    result.errback(e);
  }
  return result;
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.verifyDecrypt = function(
    passphraseCallback, encryptedMessage) {
  var encryptedData, charset;
  if (typeof encryptedMessage == 'string') {
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
 * Processes errors thrown when decrypting messages.
 * @param {!e2e.async.Result} decryptResult
 * @param {!e2e.async.Result} parentResult
 * @param {!Object} state
 * @param {!Error} e
 * @private
 */
e2e.openpgp.ContextImpl.prototype.verifyDecryptErrback_ = function(
    decryptResult, parentResult, state, e) {
  // Error types that can be caught on an incorrect decryption:
  // e2e.openpgp.error.PassphraseError - when the symmetric
  // ESK decryption is incorrect and the ESK cipher byte is invalid.
  // e2e.cipher.Error - when we have an incorrectly decrypted
  // ESK, but the ESK cipher byte happens to be valid and the SEIP
  // packet decrypts to have an invalid cipher choice.
  // e2e.openpgp.error.DecryptError - when the ESK incorrectly
  // decrypts, the ESK cipher byte happens to be valid, the SEIP
  // cipher byte happens to be valid, but the SEIP decryption fails
  // the duplicated two bytes and/or MDC check.
  if ((e instanceof e2e.openpgp.error.PassphraseError) ||
      (e instanceof e2e.cipher.Error) ||
      (e instanceof e2e.openpgp.error.DecryptError)) {
    decryptResult.cancel();
  } else { // errors that are not because of a wrong password
    state.silencePassphraseCallback = true;
    parentResult.errback(e);
  }
};


/**
 * Internal implementation of the verification/decryption operation.
 * @param {function(string, function(string))} passphraseCallback This callback
 *     is used for requesting an action-specific passphrase from the user.
 * @param {e2e.ByteArray} encryptedMessage The encrypted data.
 * @param {string=} opt_charset The (optional) charset to decrypt with.
 * @protected
 * @return {!e2e.openpgp.VerifyDecryptResult}
 */
e2e.openpgp.ContextImpl.prototype.verifyDecryptInternal = function(
    passphraseCallback, encryptedMessage, opt_charset) {
  var block = e2e.openpgp.block.factory.parseByteArray(encryptedMessage);
  var result = new e2e.async.Result();
  var found = goog.array.filter(block.eskPackets, goog.bind(
      this.decryptBlockWithSessionKey_,
      this, passphraseCallback, result, block, opt_charset));
  if (found.length == 0) {
    var symEskPackets = goog.array.filter(block.eskPackets, function(esk) {
        return esk instanceof e2e.openpgp.packet.SymmetricKey;});
    if (symEskPackets.length == 0) {
      result.errback(new Error('No keys found for message.'));
    } else {  // try to find the correct passphrase

      var state = {}; // using wrapper only to be able to pass-by-ref to errback
      state.silencePassphraseCallback = false;
      var tryKey = goog.bind(function(passphrase) {
        passphrase = e2e.stringToByteArray(passphrase);
        goog.array.forEach(symEskPackets, function(eskPacket) {
          var decryptResult = this.decryptSymSessionKey_(eskPacket,
                                                         passphrase);
          var boundErrback = goog.bind(this.verifyDecryptErrback_, this,
                                       decryptResult, result, state);
          decryptResult.addErrback(boundErrback);
          decryptResult.addCallback(goog.bind(
              this.decryptMessage_, this, block.encryptedData, opt_charset));
          decryptResult.addErrback(boundErrback);
          decryptResult.addCallback(function(decryptedData) {
            state.silencePassphraseCallback = true;
            if (!result.hasFired()) {
              result.callback(decryptedData);
            }
          });
        }, this);
        if (!state.silencePassphraseCallback) {
          passphraseCallback('decrypting this message. (Retry)', tryKey);
        }
      }, this);
      passphraseCallback('decrypting this message.', tryKey);
    }
  }
  return /** @type {e2e.openpgp.VerifyDecryptResult} */(result);
};


/**
 * Decrypts the private key (as it might be protected with a passphrase), then
 * it decrypts the session key (with the private key) and finally decrypts the
 * block encrypted data with the session key.
 * @param {function(string, function(string))} passphraseCallback This callback
 *     is used for requesting an action-specific passphrase from the user.
 * @param {!e2e.async.Result} result The result to chain to.
 * @param {!e2e.openpgp.block.Block} block The encrypted message block.
 * @param {string|undefined} charset The charset used in the message.
 * @param {!e2e.openpgp.packet.PKEncryptedSessionKey} eskPacket The session
 *     key packet (encrypted).
 * @return {boolean} Whether the session key could be used.
 * @private
 */
e2e.openpgp.ContextImpl.prototype.decryptBlockWithSessionKey_ =
    function(passphraseCallback, result, block, charset, eskPacket) {
  var key = /** @type {e2e.openpgp.packet.SecretKey} */ (
      this.keyRing_.getKey(eskPacket.keyId, true));
  if (!key) return false;
  var privKeyResult = e2e.async.Result.toResult(key);
  var decryptedSessionKey = privKeyResult.addCallback(
      goog.bind(this.decryptSessionKey_, this, eskPacket));
  var decryptedMessage = decryptedSessionKey.addCallback(
      goog.bind(this.decryptMessage_, this, block.encryptedData, charset));
  decryptedMessage.addCallback(function(decryptedData) {
    if (!result.hasFired()) {
      result.callback(decryptedData);
    }
  });
  return true;
};


/**
 * Decrypts the session key with the private key.
 * @param {!e2e.openpgp.packet.PKEncryptedSessionKey} eskPacket The session
 *     key packet (encrypted).
 * @param {!e2e.openpgp.packet.SecretKey} privKey The session key packet to
 *     decrypt the session key.
 * @return {!e2e.async.Result.<!e2e.openpgp.packet.PKEncryptedSessionKey>}
 *     The decrypted session key packet.
 * @private
 */
e2e.openpgp.ContextImpl.prototype.decryptSessionKey_ = function(
    eskPacket, privKey) {
  return eskPacket.decryptSessionKey(privKey.cipher.getKey()).addCallback(
      function(success) {
        if (!success) {
          throw new Error('Session key decryption failed.');
        }
        return eskPacket;
      }, this);
};

/**
 * Decrypts the session key with the passphrase.
 * @param {!e2e.openpgp.packet.SymmetricKey} eskPacket The session
 *     key packet (encrypted).
 * @param {!e2e.ByteArray} passphrase Passphrase to decrypt this ESK.
 * @return {!e2e.async.Result.<!e2e.openpgp.packet.SymmetricKey>}
 *     The decrypted session key packet.
 * @private
 */
e2e.openpgp.ContextImpl.prototype.decryptSymSessionKey_ = function(
    eskPacket, passphrase) {
  return eskPacket.decryptSessionKey({'passphrase': passphrase}).addCallback(
      function(success) {
        if (!success) {
           throw new e2e.openpgp.error.PassphraseError(
                  'Session key decryption failed.');
        }
        return eskPacket;
      }, this);
};


/**
 * Decrypts the encrypted data packet with the session key.
 * @param {!e2e.openpgp.packet.EncryptedData} encryptedData The encrypted
 *     data packet in the block.
 * @param {string|undefined} charset The charset the data is encrypted as.
 * @param {!e2e.openpgp.packet.EncryptedSessionKey} eskPacket The unloacked
 *     session key packet.
 * @return {!e2e.openpgp.VerifyDecryptResult}
 * @private
 */
e2e.openpgp.ContextImpl.prototype.decryptMessage_ = function(
    encryptedData, charset, eskPacket) {
  // TODO(evn): Move all code that deals with packets to block.
  if (!goog.isDef(eskPacket.symmetricAlgorithm)) {
    throw new e2e.openpgp.error.DecryptError('Invalid session key packet.');
  }
  encryptedData.decrypt(
      eskPacket.symmetricAlgorithm, eskPacket.getSessionKey());
  var decryptedData = encryptedData.data;
  var decryptedBlocks = e2e.openpgp.block.factory.parseByteArrayMulti(
      decryptedData);
  if (decryptedBlocks.length != 1) {
    throw new e2e.openpgp.error.ParseError('Invalid decrypted message.');
  }
  var decryptedBlock = decryptedBlocks[0];
  var currentLevel = 0;
  while (decryptedBlock instanceof e2e.openpgp.block.Compressed) {
      if (currentLevel >= this.MAX_COMPRESSION_NESTING_LEVEL) {
        throw new e2e.openpgp.error.ParseError(
                    'input data with too deeply nested packets');
      }
    decryptedBlock = decryptedBlock.getBlock();
    currentLevel++;
  }
  if (decryptedBlock instanceof e2e.openpgp.block.LiteralMessage) {
    if (decryptedBlock.packets.length != 1) {
      throw new e2e.openpgp.error.ParseError(
          'Literal block should contain exactly one packet.');
    }
    if (!(decryptedBlock.packets[0] instanceof
        e2e.openpgp.packet.LiteralData)) {
      throw new e2e.openpgp.error.ParseError(
          'Literal block should contain LiteralData packet.');
    }
    var verifyResult = null;
    if (decryptedBlock.signatures) {
      verifyResult = this.verifyMessage_(decryptedBlock);
    }
    var dataPacket = decryptedBlock.getData(); // First LiteralMessage contents.
    return /** @type {!e2e.openpgp.VerifyDecryptResult} */ (
        e2e.async.Result.toResult({
            'decrypt': {
                'data': dataPacket.data,
                'options': {
                  'charset': charset,
                  'creationTime': dataPacket.timestamp,
                  'filename': e2e.byteArrayToString(
                    dataPacket.filename)
                }
            },
            'verify': verifyResult
        }));
  } else {
    throw new e2e.openpgp.error.ParseError('No literal block found.');
  }
};

/**
 * Verifies signatures places on a LiteralMessage
 * @param  {e2e.openpgp.block.LiteralMessage} message Block to verify
 * @return {?e2e.openpgp.VerifyResult} Verification result.
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
  return /** type {e2e.openpgp.VerifyResult} */ ({
    success: goog.array.map(verifyResult.success, goog.bind(function(key) {
      return this.keyBlockToKeyObject_(key);
    }, this)),
    failure: goog.array.map(verifyResult.failure, goog.bind(function(key) {
      return this.keyBlockToKeyObject_(key);
    }, this))
  });
};


/** @inheritDoc */
e2e.openpgp.ContextImpl.prototype.encryptSign = function(
    plaintext, options, encryptionKeys, passphrases, opt_signatureKey) {
  if (encryptionKeys.length == 0 && passphrases.length == 0 &&
      opt_signatureKey) {
    return this.clearSignInternal(
        plaintext, options, this.keyRing_.getKeyBlock(opt_signatureKey));
  }
  var encryptSignResult = this.encryptSignInternal(
      e2e.stringToByteArray(plaintext),
      options,
      goog.array.map(
          encryptionKeys,
          goog.bind(this.keyRing_.getKeyBlock, this.keyRing_)),
      passphrases,
      opt_signatureKey && this.keyRing_.getKeyBlock(opt_signatureKey));
  if (this.armorOutput) {
    return encryptSignResult.addCallback(function(data) {
      return e2e.openpgp.asciiArmor.encode(
          'MESSAGE', data, this.armorHeaders_);
    }, this);
  } else {
    return encryptSignResult;
  }
};


/**
 * Internal implementation of the encrypt/sign operation.
 * @param {string} plaintext The plaintext.
 * @param {e2e.openpgp.EncryptOptions} options Metadata to add.
 * @param {e2e.openpgp.block.TransferableKey=} key The key to sign the
 *     message with.
 * @protected
 * @return {e2e.openpgp.EncryptSignResult}
 */
e2e.openpgp.ContextImpl.prototype.clearSignInternal = function(
    plaintext, options, key) {
  var keyPacket = key.getKeyToSign();
  // TODO(evn): Move this to block.ClearSigned or something like that.
  plaintext = e2e.openpgp.packet.Signature.convertNewlines(plaintext);
  var data = e2e.stringToByteArray(plaintext);
  var signature = e2e.openpgp.packet.Signature.construct(
      keyPacket,
      data,
      e2e.openpgp.packet.Signature.SignatureType.TEXT,
      {
        'SIGNATURE_CREATION_TIME': e2e.dwordArrayToByteArray(
          [Math.floor(new Date().getTime() / 1e3)]),
        'ISSUER': keyPacket.keyId
      });
  var cleartext = e2e.openpgp.asciiArmor.encodeClearSign(
      plaintext, signature.serialize(), signature.hashAlgorithm,
      this.armorHeaders_);
  return /** @type {e2e.openpgp.EncryptSignResult} */ (
      e2e.async.Result.toResult(cleartext));
};

/**
 * Internal implementation of the encrypt/sign operation.
 * @param {e2e.ByteArray} plaintext The plaintext.
 * @param {e2e.openpgp.EncryptOptions} options Metadata to add.
 * @param {!Array.<e2e.openpgp.block.TransferableKey>} encryptionKeys The
 *     keys to encrypt the message with.
 * @param {Array.<string>} passphrases Passphrases to use for symmetric
 *     key encryption of the message.
 * @param {e2e.openpgp.block.TransferableKey=} opt_signatureKey The key to
 *     sign the message with.
 * @protected
 * @return {e2e.openpgp.EncryptSignResult}
 */
e2e.openpgp.ContextImpl.prototype.encryptSignInternal = function(
    plaintext, options, encryptionKeys, passphrases, opt_signatureKey) {
  try {
    goog.array.forEach(passphrases, function(passphrase, i, passphrases) {
      passphrases[i] = e2e.stringToByteArray(passphrase);
    });
    encryptionKeys = goog.array.filter(goog.array.map(
        encryptionKeys,
        function(keyBlock) {
          return keyBlock.getKeyToEncrypt();
        }), goog.isDefAndNotNull);
    if (encryptionKeys.length == 0 && passphrases.length == 0) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
        'Cannot encrypt to empty passphrase and empty key lists.');
    }
    var sigKeyPacket = opt_signatureKey && opt_signatureKey.getKeyToSign();
    if (opt_signatureKey && !sigKeyPacket) {
      // Signature was requested, but no provided key can sign.
      throw new e2e.openpgp.error.InvalidArgumentsError(
        'Could not find key with signing capability.');
    }
    var literal = new e2e.openpgp.packet.LiteralData(
        e2e.openpgp.packet.LiteralData.Format.TEXT,
        e2e.stringToByteArray(''),  // file name
        new Date().getTime() / 1000,  // time date in seconds since 1970
        plaintext);
    var blockResult = e2e.openpgp.block.EncryptedMessage.construct(
        literal,
        encryptionKeys,
        /** @type {!Array.<e2e.ByteArray>} */(passphrases),
        /** @type {!e2e.openpgp.packet.SecretKey} */(sigKeyPacket));
    var serializedBlock = blockResult.addCallback(function(block) {
      return block.serialize();
    }, this);
    return serializedBlock;
  } catch (e) {
    /** @type {e2e.openpgp.EncryptSignResult} */
    var errorResult = new e2e.async.Result();
    errorResult.errback(e);
    return errorResult;
  }
};


/**
 * Searches a key (either public, private, or both) in the keyring.
 * @param {string} uid The user id.
 * @param {e2e.openpgp.KeyRing.Type} type Type of key to search for.
 * @private
 * @return {e2e.openpgp.KeyResult} The result of the search.
 */
e2e.openpgp.ContextImpl.prototype.searchKey_ =
    function(uid, type) {
  return e2e.async.Result.toResult(goog.array.map(
      this.keyRing_.searchKey(uid, type) || [],
      this.keyBlockToKeyObject_,
      this));
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
  return e2e.async.Result.toResult(
      /** @type {!Array.<e2e.openpgp.Key>} */
      (goog.structs.map(
          this.keyRing_.getAllKeys(opt_priv),
          function(value) {
            return goog.array.map(
                value,
                this.keyBlockToKeyObject_,
                this);
          },
          this)));
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
 * @return {!e2e.async.Result.<e2e.ByteArray>} A result with the
 *     passphrase.
 * @private
 */
e2e.openpgp.ContextImpl.prototype.getPassphrase_ =
    function(passphraseCallback, message) {
  /**
   * Obtains a passphrase from the user.
   * @type {!e2e.async.Result.<e2e.ByteArray>}
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


/**
 * @param {e2e.openpgp.block.TransferableKey} block
 * @return {e2e.openpgp.Key}
 * @private
 */
e2e.openpgp.ContextImpl.prototype.keyBlockToKeyObject_ = function(block) {
  return {
    key: this.keyPacketToKeyInfo_(block.keyPacket),
    subKeys: goog.array.map(
      block.subKeys, goog.bind(function(subKey) {
        return this.keyPacketToKeyInfo_(subKey);
      }, this)),
    uids: block.getUserIds(),
    serialized: /** @type {e2e.ByteArray} */(
      block instanceof e2e.openpgp.block.TransferablePublicKey ?
      block.serialize() : [])
  };
};


/**
 * Converts a key packet to KeyInfo.
 * @param  {e2e.openpgp.packet.Key} packet Key packet
 * @return {!e2e.openpgp.KeyInfo}
 * @private
 */
e2e.openpgp.ContextImpl.prototype.keyPacketToKeyInfo_ = function(packet) {
  return /** @type {e2e.openpgp.KeyInfo} */ ({
    secret: packet instanceof e2e.openpgp.packet.SecretKey,
    fingerprint: packet.fingerprint,
    algorithm: packet.cipher.algorithm
  });
};
