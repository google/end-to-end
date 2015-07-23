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
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('goog.Promise');



/**
 * Implements a simple {@link KeyManager}.
 * This KeyManager uses a single object as a {@link SecretKeyProvier} and
 * {@link PublicKeyProvider}.
 * @param {!e2e.openpgp.SecretKeyProvider} dualKeyProvider Object to use as both
 *     a public, and a secret key provider.
 * @constructor
 * @implements {e2e.openpgp.KeyManager}
 */
e2e.openpgp.SimpleKeyManager = function(dualKeyProvider) {
  /** @private {!e2e.openpgp.SecretKeyProvider} */
  this.keyProvider_ = dualKeyProvider;
};


/**
 * Deferred constructor.
 * @param {!goog.Thenable.<!e2e.openpgp.SecretKeyProvider>} keyProviderPromise
 *     The promise of both a public, and a secret key provider.
 * @return {!goog.Thenable<!e2e.openpgp.SimpleKeyManager>} The SimpleKeyManager
 *     promise, fulfilled when the object has initialized.
 */
e2e.openpgp.SimpleKeyManager.launch = function(keyProviderPromise) {
  return keyProviderPromise.then(function(keyProvider) {
    return new e2e.openpgp.SimpleKeyManager(keyProvider);
  });
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getTrustedKeys = function(purpose,
    email) {
  return this.keyProvider_.getTrustedKeysByEmail(purpose, email);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getKeysByKeyId = function(purpose, id) {
  var isSecret;
  switch (purpose) {
    case e2e.openpgp.KeyPurposeType.VERIFICATION:
      isSecret = false;
      break;
    case e2e.openpgp.KeyPurposeType.DECRYPTION:
      isSecret = true;
      break;
    default:
      return goog.Promise.reject(
          new e2e.openpgp.error.InvalidArgumentsError('Invalid key purpose.'));
  }
  return this.keyProvider_.getKeysByKeyId(purpose, id);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getAllKeys = function(keyringType,
    opt_providerId) {
  return this.keyProvider_.getAllKeys(keyringType);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getAllKeysByEmail = function(email) {
  return this.keyProvider_.getAllKeysByEmail(email);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getKeyByFingerprint = function(
    fingerprint, opt_providerId) {
  return this.keyProvider_.getKeyByFingerprint(fingerprint);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getAllKeyGenerateOptions = function() {
  return this.keyProvider_.getKeyGenerateOptions();
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.generateKeyPair = function(userId,
    generateOptions) {
  return this.keyProvider_.generateKeyPair(userId, generateOptions);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.getKeyringExportOptions = function(
    keyringType) {
  return this.keyProvider_.getKeyringExportOptions(keyringType);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.exportKeyring = function(keyringType,
    exportOptions) {
  return this.keyProvider_.exportKeyring(keyringType, exportOptions);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.setProviderCredentials = function(
    providerId, credentials) {
  return this.keyProvider_.setCredentials(credentials);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.trustKeys = function(keys, email,
    purpose, opt_trustData) {
  return this.keyProvider_.trustKeys(keys, email, purpose, opt_trustData);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.unlockKey = function(key, unlockData) {
  return this.keyProvider_.unlockKey(key, unlockData);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.importKeys = function(keySerialization,
    passphraseCallback) {
  return this.keyProvider_.importKeys(keySerialization, passphraseCallback);
};


/** @override */
e2e.openpgp.SimpleKeyManager.prototype.removeKeys = function(keys) {
  return this.keyProvider_.removeKeys(keys);
};
