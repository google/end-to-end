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
 * @fileoverview Interface to provide a OpenPGP Public Key Provider.
 */

goog.provide('e2e.openpgp.PublicKeyProvider');



/**
 * PublicKeyProvider interface.
 * @interface
 */
e2e.openpgp.PublicKeyProvider = function() {};


/**
 * Returns trusted keys for a given purpose for a user with given e-mail
 * address. Use this to fetch the keys to use with
 * {@link Context2#verifyDecrypt} and {@link Context2#encryptSign}.
 * @param {!e2e.openpgp.KeyPurposeType} purpose The purpose of the key.
 * @param {!e2e.openpgp.UserEmail} email The email address.
 * @return {!e2e.openpgp.KeysPromise} The resulting trusted keys.
 * @export
 */
e2e.openpgp.PublicKeyProvider.prototype.getTrustedKeysByEmail =
    goog.abstractMethod;


/**
 * Returns keys for a given purpose that match a given OpenPGP Key ID. If a
 * wildcard key ID is passed, return all keys for that purpose.
 * @see https://tools.ietf.org/html/rfc4880#section-5.1
 * @param {!e2e.openpgp.KeyPurposeType} purpose The purpose of the key. Only
 *     verification and decryption purpose should be accepted.
 * @param {!e2e.openpgp.KeyId} id The key ID.
 * @return {!e2e.openpgp.KeysPromise} The resulting keys, potentially untrusted.
 * @export
 */
e2e.openpgp.PublicKeyProvider.prototype.getKeysByKeyId = goog.abstractMethod;


/**
 * Returns all keys in the storage.
 * @param {!e2e.openpgp.KeyRingType} keyringType
 * @return {!e2e.openpgp.KeysPromise} The resulting keys, potentially untrusted.
 * @export
 */
e2e.openpgp.PublicKeyProvider.prototype.getAllKeys = goog.abstractMethod;


/**
 * Returns all keys with User ID pointing to a given e-mail address from the
 * storage. Use this to simplify key management when keys are indexed by e-mail
 * address (e.g. in contact list). Returned keys may be untrusted.
 * @param {!e2e.openpgp.UserEmail} email The email address.
 * @return {!e2e.openpgp.KeysPromise} The resulting keys, potentially untrusted.
 * @export
 */
e2e.openpgp.PublicKeyProvider.prototype.getAllKeysByEmail = goog.abstractMethod;


/**
 * Returns a single key that has a matching OpenPGP fingerprint.
 * @param {!e2e.openpgp.KeyFingerprint} fingerprint The key fingerprint
 * @return {!e2e.openpgp.KeyPromise} The resulting key, potentially
 *     untrusted.
 * @export
 */
e2e.openpgp.PublicKeyProvider.prototype.getKeyByFingerprint =
    goog.abstractMethod;


/**
 * Returns the available keyring export options.
 * @param {!e2e.openpgp.KeyRingType} keyringType The type of the keyring.
 * @return {!goog.Thenable<e2e.openpgp.KeyringExportOptions>} The available
 *     export options.
 * @export
 */
e2e.openpgp.PublicKeyProvider.prototype.getKeyringExportOptions =
    goog.abstractMethod;


/**
 * Exports the keyring.
 * @param {!e2e.openpgp.KeyRingType} keyringType The type of the keyring.
 * @param {!e2e.openpgp.KeyringExportOptions.<T>} exportOptions The chosen
 *     export options.
 * @return {!goog.Thenable.<T>} The exported keyring.
 * @template T
 * @export
 */
e2e.openpgp.PublicKeyProvider.prototype.exportKeyring = goog.abstractMethod;


/**
 * Sets the credentials to use by a given KeyProvider in future calls.
 * @param {e2e.openpgp.KeyProviderCredentials} credentials The credentials.
 * @return {!goog.Thenable}
 * @export
 */
e2e.openpgp.PublicKeyProvider.prototype.setCredentials = goog.abstractMethod;


/**
 * Marks the key(s) as trusted for a given email address. These keys will be
 * then returned in getTrustedByEmailKeys() calls for that user and the selected
 * purpose(s).
 *
 * Other keys for that email address are implicitly marked as not trusted.
 * The policy for trusting the keys is implemented in the PublicKeyProvider of
 * the application.
 *
 * Calling this method might cause UI interaction that lets the KeyProvider
 * manage the trusting process for the keys (e.g. entering a PIN code,
 * confirming an action).
 *
 * The application may optionally pass additional data consumed by the
 * PublicKeyProvider / KeyProvider that contain parameters for trusting keys.
 * @param {!e2e.openpgp.Keys} keys The keys to trust.
 * @param {!e2e.openpgp.UserEmail} email The Email address.
 * @param {!e2e.openpgp.KeyPurposeType} purpose The purpose for which
 *     to trust the keys. Invalid purpose for a given key will be ignored.
 * @param {e2e.openpgp.KeyTrustData=} opt_trustData Extra key trust data
 *     containing information for the PublicKeyProvider/KeyProviders.
 * @return {!e2e.openpgp.KeysPromise} The keys.
 * @export
 */
e2e.openpgp.PublicKeyProvider.prototype.trustKeys = goog.abstractMethod;


/**
 * Removes given keys.
 * @param {!Array<!e2e.openpgp.Key>} keys
 * @return {!goog.Thenable}
 * @export
 */
e2e.openpgp.PublicKeyProvider.prototype.removeKeys = goog.abstractMethod;


/**
 * Imports a binary serialization of OpenPGP key(s) into the Context.
 * All keys from the serialization should be processed.
 * @param {!e2e.ByteArray} keySerialization The key(s) to import.
 * @param {!function(string):!goog.Thenable<string>} passphraseCallback This
 *     callback is used for requesting an action-specific passphrase from the
 *     user (if the key material is encrypted to a passprase).
 * @return {!e2e.openpgp.UserIdsPromise} List of user IDs that were
 *     successfully imported.
 * @export
 */
e2e.openpgp.PublicKeyProvider.prototype.importKeys = goog.abstractMethod;
