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
 * @fileoverview OpenPGP KeyProvider implementation that uses KeyRing object
 * for the storage.
 */

goog.provide('e2e.openpgp.KeyringKeyProvider');

goog.require('e2e.algorithm.KeyLocations');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.openpgp.KeyPurposeType');
goog.require('e2e.openpgp.KeyRing');
goog.require('e2e.openpgp.KeyRingType');
goog.require('e2e.openpgp.SecretKeyProvider');
goog.require('e2e.openpgp.block.TransferableSecretKey');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.signer.Algorithm');
goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.format.EmailAddress');



/**
 * Secret and public key provider that uses {@link KeyRing} object for storage.
 * All of the keys are implicitly trusted (i.e. {@link #trustKeys} is a no-op).
 * @param {!e2e.openpgp.KeyRing} keyring User's keyring.
 * @constructor
 * @implements {e2e.openpgp.SecretKeyProvider}
 */
e2e.openpgp.KeyringKeyProvider = function(keyring) {
  /** @private {!e2e.openpgp.KeyRing} User's keyring */
  this.keyring_ = keyring;
};


/**
 * @private {!e2e.openpgp.KeyProviderId}
 */
e2e.openpgp.KeyringKeyProvider.PROVIDER_ID_ = 'legacy-keyring';


/**
 * Regular expression matching a valid email address. This needs to be very
 * strict and reject uncommon formats to prevent vulnerability when
 * keyserver would choose a different key than intended.
 * @private @const
 */
e2e.openpgp.KeyringKeyProvider.EMAIL_ADDRESS_REGEXP_ =
    /^[+a-zA-Z0-9_.!-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;


/**
 * Deferred constructor.
 * @param  {!goog.Thenable.<!e2e.openpgp.KeyRing>} keyRingPromise
 * @return {!goog.Thenable.<!e2e.openpgp.KeyringKeyProvider>}
 */
e2e.openpgp.KeyringKeyProvider.launch = function(keyRingPromise) {
  return keyRingPromise.then(function(keyring) {
    return new e2e.openpgp.KeyringKeyProvider(keyring);
  });
};


/**
 * @param {!Array.<!e2e.openpgp.block.TransferableKey>} transferableKeys
 * @return {!e2e.openpgp.Keys} The key objects
 * @private
 */
e2e.openpgp.KeyringKeyProvider.keysToKeyObjects_ = function(transferableKeys) {
  return goog.array.map(transferableKeys,
      e2e.openpgp.KeyringKeyProvider.keyToKeyObject_);
};


/**
 * @param {!e2e.openpgp.block.TransferableKey} transferableKey
 * @return {!e2e.openpgp.Key} The key object
 * @private
 */
e2e.openpgp.KeyringKeyProvider.keyToKeyObject_ = function(transferableKey) {
  return transferableKey.toKeyObject(false,
      e2e.openpgp.KeyringKeyProvider.PROVIDER_ID_);
};


/**
 * @param  {!e2e.openpgp.KeyPurposeType} purpose Key purpose.
 * @return {!e2e.openpgp.KeyRing.Type}
 * @private
 */
e2e.openpgp.KeyringKeyProvider.getKeyringType_ = function(purpose) {
  if (purpose == e2e.openpgp.KeyPurposeType.SIGNING ||
      purpose == e2e.openpgp.KeyPurposeType.DECRYPTION) {
    return e2e.openpgp.KeyRing.Type.PRIVATE;
  }
  return e2e.openpgp.KeyRing.Type.PUBLIC;
};


/**
 * Extracts an e-mail address from a RFC-2822 formatted mailbox string.
 * For security, the e-mail address additionally needs to match a restrictive
 * regular expression.
 *
 * See {@link https://tools.ietf.org/html/rfc2822#section-3.4}
 *
 * @param  {string} uid Mailbox address specification
 * @return {?e2e.openpgp.UserEmail} Extracted e-mail address, or null.
 * @private
 */
e2e.openpgp.KeyringKeyProvider.extractValidEmail_ = function(uid) {
  var emailAddress = goog.format.EmailAddress.parse(uid);
  if (!emailAddress.isValid()) {
    return null;
  }
  var email = emailAddress.getAddress();
  if (!e2e.openpgp.KeyringKeyProvider.EMAIL_ADDRESS_REGEXP_.exec(
      emailAddress.getAddress())) {
    return null;
  }
  return email;
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.getTrustedKeysByEmail = function(
    purpose, email) {
  return goog.Promise.resolve(undefined)
      .then(function() {
        return this.keyring_.searchKeysByUidMatcher(function(uid) {
          return e2e.openpgp.KeyringKeyProvider.extractValidEmail_(uid) ==
              email;
        },
        e2e.openpgp.KeyringKeyProvider.getKeyringType_(purpose));
      },
      null, this)
      .then(e2e.openpgp.KeyringKeyProvider.keysToKeyObjects_);
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.getKeysByKeyId = function(purpose,
    id) {
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
  // TODO(koto): Support wildcard key id. Return all keys then.
  return goog.Promise.resolve([this.keyring_.getKeyBlockById(id, isSecret)]).
      then(e2e.openpgp.KeyringKeyProvider.keysToKeyObjects_);
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.getAllKeys = function(type) {
  var isSecret = (type == e2e.openpgp.KeyRingType.SECRET);
  var keyMap = this.keyring_.getAllKeys(isSecret);
  var keyObjects = [];
  keyMap.forEach(function(keysForUid, uid) {
    goog.array.forEach(keysForUid, function(key) {
      if (!isSecret && key instanceof e2e.openpgp.block.TransferableSecretKey) {
        // KeyRing.getAllKeys always returns the private keys.
        return;
      }
      keyObjects.push(e2e.openpgp.KeyringKeyProvider.keyToKeyObject_(key));
    }, this);
  }, this);
  return goog.Promise.resolve(keyObjects);
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.getAllKeysByEmail = function(email) {
  return goog.Promise.resolve(undefined).then(function() {
    return this.keyring_.searchKeysByUidMatcher(function(uid) {
      return e2e.openpgp.KeyringKeyProvider.extractValidEmail_(uid) == email;
    }, e2e.openpgp.KeyRing.Type.ALL);
  },
  null, this).
      then(e2e.openpgp.KeyringKeyProvider.keysToKeyObjects_);
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.getKeyByFingerprint = function(
    fingerprint) {
  return goog.Promise.resolve(this.keyring_.getPublicKeyBlockByFingerprint(
      fingerprint)).then(
      function(key) {
        return key ? e2e.openpgp.KeyringKeyProvider.keyToKeyObject_(key) : null;
      });
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.getKeyringExportOptions = function(
    keyringType) {
  // TODO(koto): Implement keyring export and keyring backup code.
  return goog.Promise.resolve(/** @type {e2e.openpgp.KeyringExportOptions} */
      (null));
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.exportKeyring = function(
    exportOptions) {
  return goog.Promise.reject(
      new e2e.openpgp.error.UnsupportedError('Not implemented'));
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.setCredentials = function(
    credentials) {
  // Ignored.
  return goog.Promise.resolve();
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.trustKeys = function(keys, email,
    purpose, opt_trustData) {
  // In the keyring, all keys are trusted.
  return goog.Promise.resolve(keys);
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.removeKeys = function(keys) {
  goog.array.forEach(keys, function(key) {
    var keyringType = e2e.openpgp.KeyRing.Type.PUBLIC;
    if (key.key.secret) {
      keyringType = e2e.openpgp.KeyRing.Type.PRIVATE;
    }
    this.keyring_.deleteKeyByFingerprint(key.key.fingerprint, keyringType);
  }, this);
  return goog.Promise.resolve(undefined);
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.importKeys = function(keySerialization,
    passphraseCallback) {
  return goog.Promise.resolve(undefined).then(function() {
    var blocks = e2e.openpgp.block.factory.parseByteArrayAllTransferableKeys(
        keySerialization, true /* skip keys with errors */);
    if (blocks.length == 0) {
      throw new e2e.openpgp.error.ParseError('No valid key blocks found.');
    }
    return blocks;
  }).then(function(keys) {
    return goog.Promise.all(goog.array.map(keys, function(key) {
      return this.keyring_.importKey(key).addCallback(function(imported) {
        // KeyRing.importKey returns a boolean, but we need a key object of
        // a successfully imported key, or null otherwise.
        return imported ? key : null;
      });
    }, this));
  }, null, this).then(function(importedKeys) {
    var uids = [];
    goog.array.map(importedKeys, function(importedKey) {
      // The key is valid, but it didn't import - e.g. key with the same Key ID
      // already exists for one of its User IDs.
      if (goog.isNull(importedKey)) {
        return;
      }
      goog.array.forEach(importedKey.getUserIds(), function(userId) {
        goog.array.insert(uids, userId);
      });
    });
    return uids;
  });
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.decrypt = function(ciphertext, key) {
  return goog.Promise.reject(
      new e2e.openpgp.error.UnsupportedError('Not implemented'));
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.sign = function(data, key) {
  return goog.Promise.reject(
      new e2e.openpgp.error.UnsupportedError('Not implemented'));
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.generateKeyPair = function(userId,
    generateOptions) {
  return this.validateGenerateOptions_(generateOptions)
      .then(function(options) {
        return this.keyring_.generateKey(userId,
           options['keyAlgo'],
           options['keyLength'],
           options['subkeyAlgo'],
           options['subkeyLength'],
           options['keyLocation']);
      }, null, this)
      .then(function(transferableKeys) {
        var pubKeyBlock = transferableKeys[0];
        var privKeyBlock = transferableKeys[1];
        return /** @type {e2e.openpgp.KeyPair} */ ({
          'public': e2e.openpgp.KeyringKeyProvider.keyToKeyObject_(pubKeyBlock),
          'secret': e2e.openpgp.KeyringKeyProvider.keyToKeyObject_(privKeyBlock)
        });
      }, null, this);
};


/**
 * Validates the key generation options.
 * @param  {!e2e.openpgp.KeyGenerateOptions} generateOptions Keypair generation
 *     options
 * @return {!goog.Thenable<!e2e.openpgp.KeyGenerateOptions>}
 * @private
 */
e2e.openpgp.KeyringKeyProvider.prototype.validateGenerateOptions_ = function(
    generateOptions) {
  return new goog.Promise(function(resolve, reject) {
    if (!goog.isNumber(generateOptions['keyLength']) ||
        generateOptions['keyLength'] <= 0) {
      throw new e2e.openpgp.error.InvalidArgumentsError('Invalid keyLength');
    }
    if (!goog.isNumber(generateOptions['subkeyLength']) ||
        generateOptions['subkeyLength'] <= 0) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Invalid subkeyLength');
    }
    if (!generateOptions['keyAlgo'] in e2e.signer.Algorithm) {
      throw new e2e.openpgp.error.InvalidArgumentsError('Invalid keyAlgo');
    }
    if (!generateOptions['subkeyAlgo'] in e2e.cipher.Algorithm) {
      throw new e2e.openpgp.error.InvalidArgumentsError('Invalid subkeyAlgo');
    }
    if (!generateOptions['keyLocation'] in e2e.algorithm.KeyLocations) {
      throw new e2e.openpgp.error.InvalidArgumentsError('Invalid keyLocation');
    }
    resolve(generateOptions);
  });
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.getKeyGenerateOptions = function() {
  // WebCrypto RSA is no longer possible in Chrome:
  // https://www.chromium.org/blink/webcrypto
  // https://www.w3.org/Bugs/Public/show_bug.cgi?id=25431
  var webCryptoKeyGenerateOptions = {
    keyAlgo: [e2e.signer.Algorithm.RSA],
    keyLength: [4096, 8192],
    subkeyAlgo: [e2e.cipher.Algorithm.RSA],
    subkeyLength: [4096, 8192],
    keyLocation: [e2e.algorithm.KeyLocations.WEB_CRYPTO]
  };
  var javascriptKeyGenerateOptions = {
    keyAlgo: [e2e.signer.Algorithm.ECDSA],
    keyLength: [256],
    subkeyAlgo: [e2e.cipher.Algorithm.ECDH],
    subkeyLength: [256],
    keyLocation: [e2e.algorithm.KeyLocations.JAVASCRIPT]
  };
  return goog.Promise.resolve([javascriptKeyGenerateOptions]);
};


/** @override */
e2e.openpgp.KeyringKeyProvider.prototype.unlockKey = function(key, unlockData) {
  // In the keyring, all keys are unlocked.
  return goog.Promise.resolve(/** @type {e2e.openpgp.Key} */ (key));
};
