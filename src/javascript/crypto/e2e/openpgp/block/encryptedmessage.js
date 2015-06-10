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
 * @fileoverview Encrypted Message block.
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.openpgp.block.EncryptedMessage');

goog.require('e2e');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Error');
goog.require('e2e.cipher.factory');
goog.require('e2e.openpgp.block.Message');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.error.DecryptError');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.PassphraseError');
goog.require('e2e.openpgp.packet.Compressed');
goog.require('e2e.openpgp.packet.EncryptedData');
goog.require('e2e.openpgp.packet.EncryptedSessionKey');
goog.require('e2e.openpgp.packet.PKEncryptedSessionKey');
goog.require('e2e.openpgp.packet.SymmetricKey');
goog.require('e2e.openpgp.packet.SymmetricallyEncryptedIntegrity');
goog.require('e2e.random');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.DeferredList');



/**
 * Representation of an Encrypted Message block. According to RFC 4880
 * Section 11.3, this block is represented as:
 *  - Optional repeated Encrypted Session Key (ESK) packets -- either public
 *      or symmetric.
 *  - One Encrypted Data block. Can be either a Symmetrically Encrypted Data
 *      Packet or a Symmetrically Encrypted Integrity Protected Data Packet.
 * @param {Array.<e2e.openpgp.packet.EncryptedSessionKey>=} opt_eskPackets
 *     List of Encrypted Session Key (ESK) packets in this block.
 * @param {e2e.openpgp.packet.EncryptedData=} opt_encryptedData
 *     Packet for the encrypted data block.
 * @param {Array.<!e2e.openpgp.packet.Signature>=} opt_signatures
 * @extends {e2e.openpgp.block.Message}
 * @constructor
 */
e2e.openpgp.block.EncryptedMessage = function(opt_eskPackets,
    opt_encryptedData, opt_signatures) {
  /**
   * List of Encrypted Session Key (ESK) packets in this block.
   * @type {Array.<!e2e.openpgp.packet.EncryptedSessionKey>}
   */
  this.eskPackets = opt_eskPackets || null;
  /**
   * Packet for the encrypted data block.
   * NOTE: The contents for this packet are another OpenPGP message.
   * @type {e2e.openpgp.packet.EncryptedData}
 */
  this.encryptedData = opt_encryptedData || null;
  goog.base(this, opt_signatures);
};
goog.inherits(e2e.openpgp.block.EncryptedMessage,
    e2e.openpgp.block.Message);


/**
 * Decrypts the encrypted message and returns the containing decrypted block.
 * @param {function(!e2e.ByteArray):e2e.openpgp.packet.Key}
 *     getKeyForSessionKeyCallback A callback to get a key packet with a given
 *     key id.
 * @param {function(string):!e2e.async.Result<string>} passphraseCallback A
 *     callback to get a passphrase for a given hint.
 * @return {!e2e.async.Result.<!e2e.openpgp.block.Message>}
 */
e2e.openpgp.block.EncryptedMessage.prototype.decrypt = function(
    getKeyForSessionKeyCallback, passphraseCallback) {
  // Search for a secret key that can decrypt the session key. foundSecretKeys
  // will contain an entry for each of public-key encrypted eskPackets.
  // Some entries might be null if a matching key has not been found.
  var foundSecretKeys = goog.array.map(
      goog.array.filter(this.eskPackets, function(eskPacket) {
        return eskPacket instanceof e2e.openpgp.packet.PKEncryptedSessionKey;
      }),
      function(eskPacket) {
        return getKeyForSessionKeyCallback(eskPacket.keyId);
      }, this);

  // Try to decrypt with all found secret keys.
  var decryptResults =
      /** @type {!Array.<
              !goog.async.Deferred.<!e2e.openpgp.block.Message>>} */ (
          goog.array.filter(
              goog.array.map(foundSecretKeys, this.decryptWithSecretKey_, this),
              goog.isDefAndNotNull));

  var res;
  if (decryptResults.length == 0) {
    // We couldn't find any public keys, try to find passphrases.
    res = this.decryptWithPassphrase_(passphraseCallback);
  } else {
    res = new goog.async.DeferredList(decryptResults);
  }

  return res.addCallback(this.decryptCallback_, this);
};


/**
 * Returns the first valid decryption result, or throws an exception if none.
 * @param {!Array} list The list of results.
 * @return {!e2e.openpgp.block.Message}
 * @private
 */
e2e.openpgp.block.EncryptedMessage.prototype.decryptCallback_ = function(
    list) {
  var valid = goog.array.find(list, function(r) {
    return r[0];
  });
  if (valid) {
    return valid[1];
  }
  throw new e2e.openpgp.error.DecryptError(
      'Encrypted message decryption failed.');
};


/**
 * Tries to decrypt the session key (as specified by index) with a given secret
 * key packet.
 * @param {!e2e.openpgp.packet.SecretKey} secretKey The secret key to try with.
 * @param {number} index The index (on eskPackets) to try to decrypt.
 * @return {e2e.async.Result.<!e2e.openpgp.block.Message>} Deferred decryption
 *     result or null, if no secretKey was passed.
 * @private
 */
e2e.openpgp.block.EncryptedMessage.prototype.decryptWithSecretKey_ =
    function(secretKey, index) {
  if (!secretKey) {
    return null;
  }
  return this.decryptKeyAndMessage_(
      goog.asserts.assertObject(secretKey.cipher.getKey()),
      this.eskPackets[index]);
};


/**
 * Tries to decrypt the session key and then the message.
 * @param {!e2e.cipher.key.Key} key The key object.
 * @param {!e2e.openpgp.packet.EncryptedSessionKey} eskPacket The encrypted
 *     session key packet to decrypt with the key object.
 * @return {!e2e.async.Result.<!e2e.openpgp.block.Message>}
 * @private
 */
e2e.openpgp.block.EncryptedMessage.prototype.decryptKeyAndMessage_ = function(
    key, eskPacket) {
  var decryptSuccess = eskPacket.decryptSessionKey(key);
  return decryptSuccess.addCallback(function(success) {
    if (!success) {
      throw new e2e.openpgp.error.DecryptError(
          'Session key decryption failed.');
    }
    return this.decryptMessage_(eskPacket);
  }, this);
};


/**
 * Attempts to decrypt the block with a passphrase. Will return an exception
 * in the errback if it fails.
 * @param {function(string):!e2e.async.Result<string>} passphraseCallback The
 *     callback for the passphrase.
 * @return {!e2e.async.Result.<!e2e.openpgp.block.Message>}
 * @private
 */
e2e.openpgp.block.EncryptedMessage.prototype.decryptWithPassphrase_ = function(
    passphraseCallback) {
  var result = new e2e.async.Result();
  var symEskPackets = goog.array.filter(
      this.eskPackets, function(esk) {
        return esk instanceof e2e.openpgp.packet.SymmetricKey;
      });
  if (symEskPackets.length == 0) {
    throw new e2e.openpgp.error.DecryptError('No keys found for message.');
  }
  // try to find the correct passphrase
  this.silencePassphraseCallback_ = false;
  this.repeatPassphraseCallback_ = false;
  var decryptCallback = goog.bind(function(passphrase) {
    try {
      var res = this.testPassphrase_(
          passphraseCallback, symEskPackets, passphrase);
      res.addCallback(function(list) {
        var failed = goog.array.every(list, function(f) {
          return !f[0];
        });
        if (!failed) {
          result.callback(list);
        } else {
          if (this.silencePassphraseCallback_ ||
              !this.repeatPassphraseCallback_) {
            throw new e2e.openpgp.error.DecryptError(
                'Passphrase decryption failed');
          } else {
            passphraseCallback('').addCallback(decryptCallback);
          }
        }
      }, this);
    } catch (e) {
      result.errback(e);
    }
  }, this);
  passphraseCallback('').addCallback(decryptCallback);
  return result;
};


/**
 * Tries to decrypt the ESK packets with a given passphrase.
 * @param {function(string):!e2e.async.Result<string>} passphraseCallback A
 *     callback to get a passphrase for a given hint.
 * @param {!Array.<!e2e.openpgp.packet.EncryptedSessionKey>} symEskPackets The
 *     list of symmetrically encrypted session key packets.
 * @param {string} passphraseString The passphrase to try to use to decrypt the
 *     ESK packet.
 * @return {!goog.async.DeferredList} The deferred list of message blocks.
 * @private
 */
e2e.openpgp.block.EncryptedMessage.prototype.testPassphrase_ = function(
    passphraseCallback, symEskPackets, passphraseString) {
  var passphraseKey = {'passphrase': e2e.stringToByteArray(passphraseString)};
  var results = goog.array.map(
      symEskPackets, goog.bind(this.testPassphraseKey_, this, passphraseKey));
  return new goog.async.DeferredList(
      /** @type {!Array.<!goog.async.Deferred> } */ (results));
};


/**
 * Tries to decrypt the session key and then the message (this is just a very
 *     thin wrapper around decryptKeyAndMessage that silences the passphrase).
 * @param {!e2e.cipher.key.Key} key The key object.
 * @param {!e2e.openpgp.packet.EncryptedSessionKey} eskPacket The encrypted
 *     session key packet to decrypt with the key object.
 * @return {!e2e.async.Result.<!e2e.openpgp.block.Message>}
 * @private
 */
e2e.openpgp.block.EncryptedMessage.prototype.testPassphraseKey_ = function(
    key, eskPacket) {
  return this.decryptKeyAndMessage_(key, eskPacket).addCallback(function() {
    this.silencePassphraseCallback_ = true;
  }, this).addErrback(function(e) {
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
    if ((e instanceof e2e.cipher.Error) ||
        (e instanceof e2e.openpgp.error.PassphraseError) ||
        (e instanceof e2e.openpgp.error.DecryptError)) {
      this.repeatPassphraseCallback_ = true;
    } else {
      // We caught an unexpected error, fail the operation.
      this.silencePassphraseCallback_ = true;
    }
  }, this);
};


/**
 * Decrypts the encrypted data packet with the session key.
 * @param {!e2e.openpgp.packet.EncryptedSessionKey} eskPacket The unlocked
 *     session key packet.
 * @return {!e2e.openpgp.block.Message}
 * @private
 */
e2e.openpgp.block.EncryptedMessage.prototype.decryptMessage_ = function(
    eskPacket) {
  if (!goog.isDef(eskPacket.symmetricAlgorithm)) {
    throw new e2e.openpgp.error.DecryptError('Invalid session key packet.');
  }
  this.encryptedData.decrypt(
      eskPacket.symmetricAlgorithm, eskPacket.getSessionKey());
  var decryptedData = this.encryptedData.data;
  // TODO(user): Can this be refactored to avoid the circular dependency?
  /** @suppress {missingRequire} We assume the factory is already present. */
  var message = e2e.openpgp.block.factory.parseByteArrayMessage(
      decryptedData, this.getCharset());
  if (message) {
    return message;
  }
  throw new e2e.openpgp.error.ParseError('Invalid decrypted message.');
};


/** @inheritDoc */
e2e.openpgp.block.EncryptedMessage.prototype.parse = function(packets) {
  var eskPackets = [];
  while (packets[0] instanceof
         e2e.openpgp.packet.EncryptedSessionKey) {
    eskPackets.push(packets.shift());
  }
  if (packets[0] instanceof
      e2e.openpgp.packet.EncryptedData) {
    var encryptedData = packets.shift();
  } else {
    throw new e2e.openpgp.error.ParseError(
        'Invalid EncryptedMessage. Missing encrypted data block.');
  }

  this.eskPackets = eskPackets;
  this.encryptedData = /** @type {e2e.openpgp.packet.EncryptedData} */
      (encryptedData);
  return packets;
};


/** @inheritDoc */
e2e.openpgp.block.EncryptedMessage.prototype.serializeMessage = function() {
  var result = [];
  goog.array.forEach(this.eskPackets, function(eskPacket) {
    goog.array.extend(result, eskPacket.serialize());
  });
  goog.array.extend(result, this.encryptedData.serialize());
  return result;
};


/**
 * Makes an EncryptedMessage containing data. Encrypts the data for
 * the public keys passed in.
 * @param {!e2e.openpgp.block.LiteralMessage} literalMessage
 *   Data to encrypt.
 * @param {!Array.<!e2e.openpgp.block.TransferableKey>=} opt_publicKeys
 *   Keys to encrypt to.
 * @param {!Array.<string>=} opt_passphrases Symmetrically encrypt
 *   session key with each of these passphrases. Either opt_publicKeys or
 *   opt_passphrases must be provided or
 *   {e2e.openpgp.error.InvalidArgumentsError} will be thrown.
 * @param {e2e.openpgp.block.TransferableKey=} opt_signatureKey The key used
 *   to sign the message. Throws {e2e.openpgp.error.InvalidArgumentsError} if no
 *   provided key has a signing capability.
 * @return {!e2e.async.Result.<!e2e.openpgp.block.EncryptedMessage>}
 */
e2e.openpgp.block.EncryptedMessage.construct = function(
    literalMessage, opt_publicKeys, opt_passphrases, opt_signatureKey) {
  // Prepare encryption keys.
  var publicKeys = opt_publicKeys || [];
  var passphrases = opt_passphrases || [];
  goog.array.forEach(passphrases, function(passphrase, i, passphrases) {
    passphrases[i] = e2e.stringToByteArray(passphrase);
  });
  publicKeys = goog.array.filter(goog.array.map(
      publicKeys,
      function(keyBlock) {
        return keyBlock.getKeyToEncrypt();
      }), goog.isDefAndNotNull);
  if (publicKeys.length == 0 && passphrases.length == 0) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'No public key nor passphrase was provided, encryption is impossible.');
  }
  // Optionally sign the message.
  var sigKeyPacket = opt_signatureKey && opt_signatureKey.getKeyToSign();
  if (opt_signatureKey && !sigKeyPacket) {
    // Signature was requested, but no provided key can sign.
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Provided key does not have a signing capability.');
  }
  /** @type {!e2e.async.Result.<undefined>} */
  var signResult = new e2e.async.Result;
  if (sigKeyPacket) {
    // Creates OnePassSignature + LiteralData + Signature sequence.
    // That sequence will be later compressed and encrypted.
    // This allows e.g. GnuPG to verify the signature.
    signResult = literalMessage.signWithOnePass(sigKeyPacket);
  } else {
    signResult.callback();
  }
  var cipher = /** @type {!e2e.cipher.SymmetricCipher} */ (
      e2e.cipher.factory.require(
          e2e.openpgp.constants.DEFAULT_SYMMETRIC_CIPHER));
  var sessionKey = e2e.random.getRandomBytes(cipher.keySize);
  cipher.setKey({key: sessionKey});

  var encryptedResult = signResult.addCallback(function() {
    var compressedPacket = e2e.openpgp.packet.Compressed.construct(
        literalMessage.serialize());

    return e2e.openpgp.packet.SymmetricallyEncryptedIntegrity.construct(
        compressedPacket.serialize(),
        cipher);
  });

  var encryptedSessions = [];
  goog.array.forEach(passphrases, function(passphrase) {
    var packet = e2e.openpgp.packet.SymmetricKey.construct(
        passphrase, sessionKey);
    encryptedSessions.push(packet);
  });

  var pending = publicKeys.slice();
  var blockResult = new e2e.async.Result;
  goog.array.forEach(publicKeys, function(publicKey) {
    var packetResult = e2e.openpgp.packet.PKEncryptedSessionKey.construct(
        publicKey, sessionKey);
    packetResult.addCallback(function(packet) {
      encryptedSessions.push(packet);
      pending.splice(pending.indexOf(publicKey), 1);
      if (pending.length == 0) {
        encryptedResult.addCallback(function(encrypted) {
          // Make sure that blockresult won't finish until encryptedResult does.
          blockResult.callback(encrypted);
        });
      }
    });
  });
  if (publicKeys.length == 0) {
    encryptedResult.addCallback(function(encrypted) {
      // Make sure that blockresult won't finish until encryptedResult does.
      blockResult.callback(encrypted);
    });
  }

  blockResult.addCallback(function(encryptedData) {
    var block = new e2e.openpgp.block.EncryptedMessage(
        encryptedSessions,
        encryptedData);
    return block;
  });
  return blockResult;
};


/** @inheritDoc */
e2e.openpgp.block.EncryptedMessage.prototype.header = 'MESSAGE';
