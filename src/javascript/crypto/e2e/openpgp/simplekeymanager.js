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
 * @fileoverview Sample implementation of a Key Manager.
 */
goog.provide('e2e.openpgp.SimpleKeyManager');

goog.require('e2e.openpgp.KeyManager');
goog.require('e2e.openpgp.KeyPurposeType');
goog.require('e2e.openpgp.KeyRingType');
goog.require('goog.Promise');
goog.require('goog.crypt.Sha1');



/**
 * Implements a simple KeyManager.
 * TODO(koto): Add LockableStorage
 * TODO(koto): Use key providers, move dummy implementation to a key provider
 * provided by the test case.
 * @constructor
 * @implements {e2e.openpgp.KeyManager}
 */
e2e.openpgp.SimpleKeyManager = function() {
};


/**
 * Deferred constructor.
 * @return {!goog.Thenable<!e2e.openpgp.SimpleKeyManager>} The SimpleKeyManager
 *     promise, fulfilled when the object has initialized.
 */
e2e.openpgp.SimpleKeyManager.launch = function() {
  return goog.Promise.resolve(new e2e.openpgp.SimpleKeyManager());
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getTrustedKeys = function(purpose,
    email) {
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
e2e.openpgp.SimpleKeyManager.prototype.getTrustedKeysInternal_ = function(
    purpose, email) {
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
e2e.openpgp.SimpleKeyManager.prototype.getKeysByKeyId = function(purpose, id) {
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getAllKeys = function(keyringType,
    opt_providerId) {
  switch (keyringType) {
    case e2e.openpgp.KeyRingType.SECRET:
      return goog.Promise.resolve([
        this.getTrustedKeysInternal_(e2e.openpgp.KeyPurposeType.SIGNING,
            'one@example.com'),
        this.getTrustedKeysInternal_(e2e.openpgp.KeyPurposeType.SIGNING,
            'two@example.com'),
      ]);
    case e2e.openpgp.KeyRingType.PUBLIC:
      return goog.Promise.resolve([
        this.getTrustedKeysInternal_(e2e.openpgp.KeyPurposeType.ENCRYPTION,
            'three@example.com'),
        this.getTrustedKeysInternal_(e2e.openpgp.KeyPurposeType.ENCRYPTION,
            'four@example.com'),
      ]);
    default:
      return goog.Promise.reject(new Error('Unknown keyring type.'));
  }
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getAllKeysByEmail = function(email) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getKeyByFingerprint = function(
    fingerprint, opt_providerId) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getAllKeyGenerateOptions = function() {
  return goog.Promise.resolve([]);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.generateKeyPair = function(userId,
    generateOptions) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getKeyringExportOptions = function(
    keyringType) {
  return goog.Promise.resolve(/** @type {!e2e.openpgp.KeyringExportOptions} */ (
      {}));
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.exportKeyring = function(keyringType,
    exportOptions) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.setProviderCredentials = function(
    providerId, credentials) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.trustKeys = function(keys, email,
    purpose, opt_trustData) {
  // TODO(koto): implement.
  return goog.Promise.resolve(keys);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.unlockKey = function(key, unlockData) {
  // TODO(koto): implement.
  return goog.Promise.resolve(/** @type {e2e.openpgp.Key} */ (key));
};


/**
 * Returns a dummy public key handle. USE FOR INTEGRATION TESTING ONLY.
 * @param {!e2e.openpgp.UserEmail} email
 * @return {!e2e.openpgp.Key}
 * @private
 */
e2e.openpgp.SimpleKeyManager.prototype.getDummyPublicKey_ = function(email) {
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
e2e.openpgp.SimpleKeyManager.prototype.getDummySecretKey_ = function(email) {
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


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getKeysDescription = function(
    keySerialization) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.importKeys = function(keySerialization,
    passphraseCallback) {
  return goog.Promise.reject(new Error('Not implemented.'));
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.removeKeys = function(keys) {
  return goog.Promise.reject(new Error('Not implemented.'));
};
