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
goog.require('e2e.openpgp.Context2');
goog.require('e2e.openpgp.KeyRingType');
goog.require('e2e.openpgp.asciiArmor');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.openpgp.error.ParseError');
goog.require('goog.Promise');
goog.require('goog.array');



/**
 * Implements a "context". Provides a high level API for key management,
 * encryption and signing. This context is used by external code, such as the
 * extension's user interface, to call the base OpenPGP library.
 * @constructor
 * @param {!e2e.openpgp.KeyManager} keyManager The Key Manager object.
 * @implements {e2e.openpgp.Context2}
 */
e2e.openpgp.Context2Impl = function(keyManager) {
  /**
   * Key Manager object.
   * @private {!e2e.openpgp.KeyManager}
   */
  this.keyManager_ = keyManager;
};


/**
 * Deferred constructor.
 * @param {!goog.Thenable.<!e2e.openpgp.KeyManager>} keyManagerPromise The
 *     promise of the Key Manager instance.
 * @return {!goog.Thenable.<!e2e.openpgp.Context2Impl>} The Context2Impl
 *     promise, fulfilled when the object will initialize.
 */
e2e.openpgp.Context2Impl.launch = function(keyManagerPromise) {
  return keyManagerPromise.then(function(keyManager) {
    return new e2e.openpgp.Context2Impl(keyManager);
  });
};


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
e2e.openpgp.Context2Impl.prototype.getKeyByFingerprint = function(fingerprint,
    opt_providerId) {
  return this.keyManager_.getKeyByFingerprint(fingerprint, opt_providerId);
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
e2e.openpgp.Context2Impl.prototype.unlockKey = function(key, unlockData) {
  return this.keyManager_.unlockKey(key, unlockData);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.setArmorOutput = function(shouldArmor) {
  // TODO(koto): implement.
  return goog.Promise.resolve(undefined);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.setArmorHeader = function(name, value) {
  // TODO(koto): implement.
  return goog.Promise.resolve(undefined);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.initializeKeyRing = function(
    passphraseCallback) {
  // TODO(koto): implement.
  return goog.Promise.resolve(undefined);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.changeKeyRingPassphrase = function(
    passphrase) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.Context2Impl.prototype.isKeyRingUnlocked = function() {
  // TODO(koto): implement.
  return goog.Promise.resolve(true);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.isKeyRingEncrypted = function() {
  // TODO(koto): implement.
  return goog.Promise.resolve(false);
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
  // TODO(koto): implement.
  return goog.Promise.resolve('--BEGIN DUMMY ENCRYPTION--\n' +
      '--END DUMMY ENCRYPTION--');
};


/** @override */
e2e.openpgp.Context2Impl.prototype.verifyDecrypt = function(encryptedMessage,
    passphraseCallback, opt_decryptionKeys, opt_verificationKeys) {
  // TODO(koto): implement.
  return goog.Promise.resolve(/** @type {!e2e.openpgp.VerifiedDecrypt} */ ({
    decrypt: {
      data: e2e.stringToByteArray('DUMMY DECRYPTION'),
      options: {filename: '', creationTime: 0, charset: 'utf-8'},
      wasEncrypted: false
    },
    verify: null
  }));
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
 * @private
 * @param {string} text String with one or more armor messages.
 * @return {!e2e.ByteArray} Serialized keys
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


