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
goog.provide('e2e.openpgp.managers.SimpleKeyManager');

goog.require('e2e.openpgp.KeyPurposeType');
goog.require('e2e.openpgp.KeyRingType');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.managers.KeyManager');
goog.require('goog.Promise');
goog.require('goog.array');



/**
 * Implements a simple {@link e2e.openpgp.managers.KeyManager}.
 * This KeyManager uses a single object as a
 * {@link e2e.openpgp.providers.SecretKeyProvider} and
 * a {@link e2e.openpgp.providers.PublicKeyProvider}.
 * @param {!e2e.openpgp.providers.DualKeyProvider} dualKeyProvider Object to
 *     use as both a public, and a secret key provider.
 * @param {!e2e.openpgp.KeyProviderId} providerId Key provider ID.
 * @constructor
 * @implements {e2e.openpgp.managers.KeyManager}
 */
e2e.openpgp.managers.SimpleKeyManager = function(dualKeyProvider, providerId) {
  /** @private {!e2e.openpgp.providers.DualKeyProvider} */
  this.keyProvider_ = dualKeyProvider;
  /** @private {!e2e.openpgp.KeyProviderId} */
  this.providerId_ = providerId;
};


/**
 * Deferred constructor.
 * @param {!goog.Thenable.<!e2e.openpgp.providers.DualKeyProvider>}
 *     keyProviderPromise The promise of both a public, and a secret key
 *     provider.
 * @return {!goog.Thenable<!e2e.openpgp.managers.SimpleKeyManager>} The
 *     SimpleKeyManager promise, fulfilled when the object has initialized.
 */
e2e.openpgp.managers.SimpleKeyManager.launch = function(keyProviderPromise) {
  var keyProviderObject;
  return keyProviderPromise.then(function(keyProvider) {
    keyProviderObject = keyProvider;
    return keyProvider.getId();
  }).then(function(providerId) {
    return new e2e.openpgp.managers.SimpleKeyManager(keyProviderObject,
        providerId);
  });
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.getKeyProviderIds = function() {
  return this.keyProvider_.getId().then(function(myProviderId) {
    return [myProviderId];
  });
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.getTrustedKeys = function(
    purpose, email) {
  if (this.expectsSecretKeys_(purpose)) {
    return this.keyProvider_.getTrustedSecretKeysByEmail(purpose, email);
  } else {
    return this.keyProvider_.getTrustedPublicKeysByEmail(purpose, email)
        .then(this.serializationsToKeyObjects_, null, this);
  }
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.getKeysByKeyId = function(
    purpose, id) {
  if (purpose == e2e.openpgp.KeyPurposeType.VERIFICATION) {
    return this.keyProvider_.getVerificationKeysByKeyId(id)
        .then(this.serializationsToKeyObjects_, null, this);
  } else if (purpose == e2e.openpgp.KeyPurposeType.DECRYPTION) {
    return this.keyProvider_.getDecryptionKeysByKeyId(id);
  }
  return goog.Promise.reject(
      new e2e.openpgp.error.InvalidArgumentsError('Invalid key purpose.'));
};


/**
 * @param  {!e2e.openpgp.KeyPurposeType} purpose The key purpose.
 * @return {boolean}
 * @private
 */
e2e.openpgp.managers.SimpleKeyManager.prototype.expectsSecretKeys_ = function(
    purpose) {
  switch (purpose) {
    case e2e.openpgp.KeyPurposeType.DECRYPTION:
    case e2e.openpgp.KeyPurposeType.SIGNING:
      return true;
  }
  return false;
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.getAllKeys = function(
    keyringType, opt_providerId) {
  if (keyringType == e2e.openpgp.KeyRingType.SECRET) {
    return this.keyProvider_.getAllSecretKeys();
  } else {
    return this.keyProvider_.getAllPublicKeys()
        .then(this.serializationsToKeyObjects_, null, this);
  }
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.getAllKeysByEmail = function(
    email) {
  var publicKeys;
  return this.keyProvider_.getAllPublicKeysByEmail(email)
      .then(this.serializationsToKeyObjects_, null, this)
      .then(function(pk) {
        publicKeys = pk;
        return this.keyProvider_.getAllSecretKeysByEmail(email);
      }, null, this)
      .then(function(secretKeys) {
        return publicKeys.concat(secretKeys);
      });
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.getPublicKeyByFingerprint =
    function(fingerprint, opt_providerId) {
  return this.keyProvider_.getPublicKeyByFingerprint(fingerprint)
      .then(function(key) {
        return key ? this.serializationToKeyObject_(key) : null;
      }, null, this);
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.getAllKeyGenerateOptions =
    function() {
  return this.keyProvider_.getKeyGenerateOptions();
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.generateKeyPair = function(
    userId, generateOptions) {
  return this.keyProvider_.generateKeyPair(userId, generateOptions);
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.getKeyringExportOptions =
    function(keyringType) {
  return this.keyProvider_.getKeyringExportOptions(keyringType);
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.exportKeyring = function(
    keyringType, exportOptions) {
  return this.keyProvider_.exportKeyring(keyringType, exportOptions);
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.setProviderCredentials =
    function(providerId, credentials) {
  return this.keyProvider_.setCredentials(credentials);
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.trustKeys = function(keys,
    email, purpose, opt_trustData) {
  return this.keyProvider_.trustKeys(keys, email, purpose, opt_trustData);
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.unlockSecretKey = function(key,
    unlockData) {
  return this.keyProvider_.unlockSecretKey(key, unlockData);
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.importKeys = function(
    serializedKeys, passphraseCallback) {
  return this.keyProvider_.importKeys(serializedKeys, passphraseCallback);
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.removeKeys = function(keys) {
  return goog.Promise.all(goog.array.map(keys, function(key) {
    if (key.key.secret) {
      return this.keyProvider_.removeSecretKeyByFingerprint(
          key.key.fingerprint);
    } else {
      return this.keyProvider_.removePublicKeyByFingerprint(
          key.key.fingerprint);
    }
  }, this));
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.sign = function(key, keyId,
    algorithm, hashAlgorithm, data) {
  return this.keyProvider_.sign(key, keyId, algorithm, hashAlgorithm, data);
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.decrypt = function(key, keyId,
    algorithm, ciphertext) {
  return this.keyProvider_.decrypt(key, keyId, algorithm, ciphertext);
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.initializeKeyProviders =
    function(config) {
  return this.keyProvider_.configure(config[this.providerId_] || {})
      .then(this.wrapState_, null, this);
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.reconfigureKeyProvider =
    function(providerId, config) {
  if (providerId !== this.providerId_) {
    return goog.Promise.reject(
        new e2e.openpgp.error.InvalidArgumentsError('Invalid provider'));
  }
  return this.keyProvider_.configure(config);
};


/** @override */
e2e.openpgp.managers.SimpleKeyManager.prototype.getKeyProvidersState =
    function() {
  return this.keyProvider_.getState()
      .then(this.wrapState_, null, this);
};


/**
 * Wraps the state into an object keyed by KeyProviderId to satisfy the
 * KeyManager contract.
 * @param {e2e.openpgp.KeyProviderState} state
 * @return {!Object<e2e.openpgp.KeyProviderId,e2e.openpgp.KeyProviderState>}
 * @private
 */
e2e.openpgp.managers.SimpleKeyManager.prototype.wrapState_ = function(state) {
  var states = {};
  states[this.providerId_] = state;
  return states;
};


/**
 * @param {!Array.<!e2e.ByteArray>} serializations The keys serializations.
 * @return {!e2e.openpgp.Keys} The key objects
 * @private
 */
e2e.openpgp.managers.SimpleKeyManager.prototype.serializationsToKeyObjects_ =
    function(serializations) {
  return goog.array.map(serializations,
      this.serializationToKeyObject_, this);
};


/**
 * @param {!e2e.ByteArray} serialization The key serialization.
 * @return {!e2e.openpgp.Key} The key object.
 * @private
 */
e2e.openpgp.managers.SimpleKeyManager.prototype.serializationToKeyObject_ =
    function(serialization) {
  var key = e2e.openpgp.block.factory.parseByteArrayTransferableKey(
      serialization);
  return key.toKeyObject(false /* opt_dontSerialize */, this.providerId_);
};
