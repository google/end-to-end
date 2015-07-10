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
goog.require('e2e.openpgp.KeyPurposeType');
goog.require('goog.Promise');
goog.require('goog.crypt.Sha1');



/**
 * Implements a "context". Provides a high level API for key management,
 * encryption and signing. This context is used by external code, such as the
 * extension's user interface, to call the base OpenPGP library.
 * @constructor
 * @implements {e2e.openpgp.Context2}
 */
e2e.openpgp.Context2Impl = function() {
};


/**
 * Deferred constructor.
 * @return {!goog.Thenable<!e2e.openpgp.Context2Impl>} The Context2Impl promise,
 * fulfilled when the object has initialized.
 */
e2e.openpgp.Context2Impl.launch = function() {
  return goog.Promise.resolve(new e2e.openpgp.Context2Impl());
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getTrustedKeys = function(purpose, email) {
  return goog.Promise.resolve(undefined).then(
      goog.bind(this.getTrustedKeysInternal_, this, purpose, email),
      undefined, this);
};


/**
 * Internal implementation of {@link #getTrustedKeys}.
 * @param {!e2e.openpgp.KeyPurposeType} purpose The purpose of the key.
 * @param {!e2e.openpgp.UserEmail} email The email address.
 * @return {!e2e.openpgp.Keys} The resulting keys.
 * @private
 */
e2e.openpgp.Context2Impl.prototype.getTrustedKeysInternal_ = function(purpose,
    email) {
  var keys = [];
  if (email == 'notfound@example.com') {
    return [];
  }
  if (email == 'error@example.com') {
    throw new Error('Error when getting keys.');
  }
  switch (purpose) {
    case e2e.openpgp.KeyPurposeType.ENCRYPTION:
    case e2e.openpgp.KeyPurposeType.VERIFICATION:
      // Public keys.
      keys.push(this.getDummyPublicKey_(email));
      break;
    case e2e.openpgp.KeyPurposeType.SIGNING:
    case e2e.openpgp.KeyPurposeType.DECRYPTION:
      // Secret keys.
      keys.push(this.getDummySecretKey_(email));
      break;
    default:
      throw new Error('Unknown purpose.');
  }
  return keys;
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getAllSecretKeys = function(opt_providerId) {
  return goog.Promise.resolve([
    this.getTrustedKeysInternal_(e2e.openpgp.KeyPurposeType.SIGNING,
        'one@example.com'),
    this.getTrustedKeysInternal_(e2e.openpgp.KeyPurposeType.SIGNING,
        'two@example.com'),
  ]);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getAllPublicKeys = function(opt_providerId) {
  return goog.Promise.resolve([
    this.getTrustedKeysInternal_(e2e.openpgp.KeyPurposeType.ENCRYPTION,
        'three@example.com'),
    this.getTrustedKeysInternal_(e2e.openpgp.KeyPurposeType.ENCRYPTION,
        'four@example.com'),
  ]);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getKeyByFingerprint = function(fingerprint,
    opt_providerId) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.Context2Impl.prototype.setProviderCredentials = function(providerId,
    credentials) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getAllKeyGenerateOptions = function() {
  return goog.Promise.resolve([]);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.generateKeypair = function(userId,
    generateOptions) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.Context2Impl.prototype.getKeyringExportOptions = function(
    keyringType) {
  return goog.Promise.resolve(/** @type {!e2e.openpgp.KeyringExportOptions} */ (
      {}));
};


/** @override */
e2e.openpgp.Context2Impl.prototype.exportKeyring = function(keyringType,
    exportOptions) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.Context2Impl.prototype.trustKeys = function(keys, email, purpose,
    opt_trustData) {
  // TODO(koto): implement.
  return goog.Promise.resolve(keys);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.isKeyTrusted = function(key, email,
    purpose) {
  // TODO(koto): implement.
  return goog.Promise.resolve(true);
};


/** @override */
e2e.openpgp.Context2Impl.prototype.unlockKey = function(key, unlockData) {
  // TODO(koto): implement.
  return goog.Promise.resolve(key);
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
e2e.openpgp.Context2Impl.prototype.getKeyDescription = function(
    keySerialization) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.Context2Impl.prototype.importKey = function(keySerialization) {
  return goog.Promise.reject(new Error('Not implemented.'));
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
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.Context2Impl.prototype.removeKeys = function(keys) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/**
 * Returns a dummy public key handle. USE FOR INTEGRATION TESTING ONLY.
 * @param {!e2e.openpgp.UserEmail} email
 * @return {!e2e.openpgp.Key}
 * @private
 */
e2e.openpgp.Context2Impl.prototype.getDummyPublicKey_ = function(email) {
  var sha1 = new goog.crypt.Sha1();
  sha1.update(email);
  // TODO(koto): Remove this function.
  return /** @type {!e2e.openpgp.Key} */ ({
    subKeys: [],
    uids: ['dummy public <' + email + '>'],
    key: {
      fingerprint: sha1.digest(),
      secret: false,
      algorithm: 'DUMMY',
      fingerprintHex: '0X-DUMMY-PUBLIC-KEY-' + email,
    },
    serialized: [],
    providerId: 'DummyProvider'
  });
};


/**
 * Returns a dummy secret key handle. USE FOR INTEGRATION TESTING ONLY.
 * @param {!e2e.openpgp.UserEmail} email
 * @return {!e2e.openpgp.Key}
 * @private
 */
e2e.openpgp.Context2Impl.prototype.getDummySecretKey_ = function(email) {
  // TODO(koto): Remove this function.
  var sha1 = new goog.crypt.Sha1();
  sha1.update(email);
  return /** @type {!e2e.openpgp.Key} */ ({
    subKeys: [],
    uids: ['dummy secret <' + email + '>'],
    key: {
      fingerprint: sha1.digest(),
      secret: true,
      algorithm: 'DUMMY',
      fingerprintHex: '0X-DUMMY-SECRET-KEY-' + email,
    },
    serialized: [],
    providerId: 'DummyProvider'
  });
};
