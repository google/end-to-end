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
 * @fileoverview OpenPGP PublicKeyProvider implementation that uses an
 * HKP compliant server for the storage.
 */

goog.provide('e2e.openpgp.providers.HkpKeyProvider');

goog.require('e2e');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.error.UnsupportedError');
goog.require('e2e.openpgp.KeyPurposeType');
goog.require('e2e.openpgp.KeyRingType');
goog.require('e2e.openpgp.asciiArmor');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.openpgp.providers.PublicKeyProvider');
goog.require('goog.Promise');
goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.crypt');
goog.require('goog.net.XhrIo');

goog.scope(function() {



/**
 * Public key provider that uses an HKP-compliant server to store keys
 * and retrieve keyrings.
 *
 * Note that (as with all key providers) data returned by any API here
 * is an unverified sequence of bytes.
 *
 * The HKP protocol is defined as an RFC draft,
 * at http://tools.ietf.org/html/draft-shaw-openpgp-hkp-00
 *
 * @param {string} hkpRoot Root URL to the HKP server to be queried.
 * @constructor
 * @implements {e2e.openpgp.providers.PublicKeyProvider}
 */
e2e.openpgp.providers.HkpKeyProvider = function(hkpRoot) {
  /** @private {string} root HKP URL */
  this.hkpRoot_ = hkpRoot;
};

var HkpKeyProvider = e2e.openpgp.providers.HkpKeyProvider;


/** @const {!e2e.openpgp.KeyProviderId} */
HkpKeyProvider.PROVIDER_ID = 'hkp-server';


/** @const {string} */
HkpKeyProvider.HKP_ROOT_KEY = 'hkpRoot';


/** @private @const {string} */
HkpKeyProvider.PATH_LOOKUP_ = '/pks/lookup';


/** @private @const {string} */
HkpKeyProvider.PATH_ADD_ = '/pks/add';


/** @private @const {string} */
HkpKeyProvider.PARAM_SEARCH_ = 'search';


/** @private @const {string} */
HkpKeyProvider.PARAM_OP_ = 'op';


/** @private @const {string} */
HkpKeyProvider.PARAM_OPTIONS_ = 'options';


/** @private @const {string} */
HkpKeyProvider.PARAM_KEYTEXT_ = 'keytext';


/** @private @const {string} */
HkpKeyProvider.VALUE_GET_ = 'get';


/** @private @const {string} */
HkpKeyProvider.VALUE_MR_ = 'mr';


/** @override */
HkpKeyProvider.prototype.getId = function() {
  return goog.Promise.resolve(HkpKeyProvider.PROVIDER_ID);
};


/**
 * Configures the HkpKeyProvider.
 * If the config object contains a string valued property named
 * "hkpRoot", this will replace the existing root URL used by the
 * provider.
 * @override
 */
HkpKeyProvider.prototype.configure = function(config) {
  if (goog.isDefAndNotNull(config) &&
      goog.isString(
          config[HkpKeyProvider.HKP_ROOT_KEY])) {
    this.hkpRoot_ = config[HkpKeyProvider.HKP_ROOT_KEY];
  }
  return this.getState();
};


/** @override */
HkpKeyProvider.prototype.getState = function() {
  return goog.Promise.resolve( /** @type {e2e.openpgp.KeyProviderState} */ ({
    'hkpRoot': this.hkpRoot_
  }));
};


/** @override */
HkpKeyProvider.prototype.getKeyringExportOptions = function(keyringType) {
  HkpKeyProvider.assertKeyringType_(keyringType);
  // We cannot export the contents of the HKP server.
  return goog.Promise.resolve(
      /** @type {!Array<!e2e.openpgp.KeyringExportOptions>} */ ([]));
};


/** @override */
HkpKeyProvider.prototype.exportKeyring = function(keyringType, exportOptions) {
  throw new e2e.error.UnsupportedError('Cannot export keyserver contents');
};


/** @override */
HkpKeyProvider.prototype.setCredentials = function(credentials) {
  throw new e2e.error.UnsupportedError('Cannot set credentials');
};


/** @override */
HkpKeyProvider.prototype.trustKeys = function(
    keys, email, purpose, opt_trustData) {
  HkpKeyProvider.assertPurpose_(purpose);
  throw new e2e.error.UnsupportedError(
      'Cannot set trust on HKP keyserver keys.');
};


/** @override */
HkpKeyProvider.prototype.removePublicKeyByFingerprint = function(fingerprint) {
  throw new e2e.error.UnsupportedError(
      'Cannot remove keys from an HKP keyserver.');
};


/**
 * For the HKP provider, importing a key is the same as uploading
 * the key to the server.
 * @override
 */
HkpKeyProvider.prototype.importKeys = function(
    keySerialization, passphraseCallback) {

  // 1. First validate the keys from the serialization. We also
  // need this to return keyobject results.
  /** @type {!Array<!e2e.async.Result<?e2e.openpgp.block.TransferableKey>>} */
  var pendingValidations = goog.array.map(
      e2e.openpgp.block.factory.parseByteArrayAllTransferableKeys(
          keySerialization, true), function(key) {
            return key.processSignatures().addCallback(function() {
              return key;
            }).addErrback(function(err) {
              // Discard invalid keys.
              return null;
            });
          });

  return goog.Promise.all(pendingValidations).then(
      goog.bind(function(validations) {
        var validatedKeys = validations.filter(goog.isDefAndNotNull);
        // 2. Convert to keyobjects for the return value.
        var result = goog.array.map(validatedKeys, function(key) {
          return key.toKeyObject(true, HkpKeyProvider.PROVIDER_ID);
        });

        // 3. Reserialize the validated transferable keys for upload.
        var validatedSerialization = goog.array.flatten(goog.array.map(
        validatedKeys, function(key) {
          return key.serialize();
        }));

        // 4. Upload content.
        var data = new goog.Uri.QueryData();
        data.add(HkpKeyProvider.PARAM_KEYTEXT_, e2e.openpgp.asciiArmor.encode(
        'PUBLIC KEY BLOCK', validatedSerialization));
        return new goog.Promise(function(resolve, reject) {
          goog.net.XhrIo.send(
          this.hkpRoot_ + HkpKeyProvider.PATH_ADD_,
          function(e) {
            if (e.target.isSuccess()) {
              resolve(result);
            } else {
              resolve([]);
            }
          }, 'POST', data.toString());
        }, this);
      }, this));
};


/** @override */
HkpKeyProvider.prototype.getTrustedPublicKeysByEmail = function(
    purpose, email) {
  HkpKeyProvider.assertPurpose_(purpose);
  throw new e2e.error.UnsupportedError('Cannot identify trusted keys');
};


/** @override */
HkpKeyProvider.prototype.getVerificationKeysByKeyId = function(id) {
  return this.lookup_('0x' + goog.crypt.byteArrayToHex(id));
};


/** @override */
HkpKeyProvider.prototype.getAllPublicKeys = function() {
  throw new e2e.error.UnsupportedError(
      'Cannot retrieve all keys from keyserver');
};


/** @override */
HkpKeyProvider.prototype.getAllPublicKeysByEmail = function(email) {
  return this.lookup_(email);
};


/** @override */
HkpKeyProvider.prototype.getPublicKeyByFingerprint = function(fingerprint) {
  return this.lookup_('0x' + goog.crypt.byteArrayToHex(fingerprint))
      .then(function(keyring) {
        if (keyring.length == 1) {
          return keyring[0];
        } else {
          return null;
        }
      });
};


/**
 * De-ASCII armors the provided string when it is not null and embeds
 * it as a single-element Array, otherwise returns a zero-length Array.
 * @param {?string} ascii The ASCII-armored input string.
 * @return {!Array<!e2e.ByteArray>} The decoded data.
 * @private
 */
HkpKeyProvider.deArmor_ = function(ascii) {
  if (goog.isDefAndNotNull(ascii)) {
    return [e2e.openpgp.asciiArmor.parse(ascii).data];
  } else {
    return [];
  }
};


/**
 * Performs a lookup at the keyserver from the provided search term,
 * and returns a Promise with the result keyring as a (single-element)
 * Array of bytearrays. If there was an error, returns a zero-length
 * Array.
 * @param {string} term The search term to use for the lookup.
 * @return {!goog.Thenable<!Array<!e2e.ByteArray>>} The returned keyring.
 * @private
 */
HkpKeyProvider.prototype.lookup_ = function(term) {
  var data = new goog.Uri.QueryData();
  data.add(HkpKeyProvider.PARAM_SEARCH_, term);
  data.add(HkpKeyProvider.PARAM_OP_, HkpKeyProvider.VALUE_GET_);
  data.add(HkpKeyProvider.PARAM_OPTIONS_, HkpKeyProvider.VALUE_MR_);
  return new goog.Promise(function(resolve, reject) {
    goog.net.XhrIo.send(
        this.hkpRoot_ + HkpKeyProvider.PATH_LOOKUP_ + '?' + data.toString(),
        function(e) {
          if (e.target.isSuccess()) {
            resolve(e.target.getResponseText());
          } else {
            resolve(null);
          }
        });
  }, this).then(HkpKeyProvider.deArmor_);
};


/**
 * Asserts that the keyring type is public, and throws an exception
 * otherwise.
 * @param {!e2e.openpgp.KeyRingType} keyringType
 * @private
 */
HkpKeyProvider.assertKeyringType_ = function(keyringType) {
  if (keyringType != e2e.openpgp.KeyRingType.PUBLIC) {
    throw new e2e.error.InvalidArgumentsError('Invalid keyring type');
  }
};


/**
 * Asserts that the purpose is either is either for encryption, or for
 * verification. (These are the only valid cases for public keys.)
 * @param {!e2e.openpgp.KeyPurposeType} purpose
 * @private
 */
HkpKeyProvider.assertPurpose_ = function(purpose) {
  if ((purpose != e2e.openpgp.KeyPurposeType.ENCRYPTION) &&
      (purpose != e2e.openpgp.KeyPurposeType.VERIFICATION)) {
    throw new e2e.error.InvalidArgumentsError('Invalid purpose');
  }
};

});  // goog.scope
