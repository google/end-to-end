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
 * @fileoverview Interface to provide a OpenPGP Key Manager.
 */

goog.provide('e2e.openpgp.managers.KeyManager');



/**
 * KeyManager interface.
 * KeyManager is a single per-application object that serves as a high-level
 * resolver for the keys using various {@link e2e.openpgp.PublicKeyProvider}s
 * and {@link e2e.openpgp.SecretKeyProvider}s and implements the application
 * policy in regards to:
 * <ul>
 *   <li>key provider preference
 *   <li>key preference (i.e. which key, if any, should be preferred on
 *       collisions,
 *   <li>key lifetime (how the application should treat the old keys),
 *   <li>error handling (e.g. some provider errors can be resolved in
 *       KeyManager).
 * </ul>
 * @interface
 */
e2e.openpgp.managers.KeyManager = function() {};


/**
 * Returns IDs of all supported KeyProviders.
 * @return {!goog.Thenable<!Array<!e2e.openpgp.KeyProviderId>>} Supported key
 *     provider IDs.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.getKeyProviderIds =
    goog.abstractMethod;


/**
 * Initializes all the key providers.
 * @param {Object<!e2e.openpgp.KeyProviderId,
 *     e2e.openpgp.KeyProviderConfig>} config Configuration for the key
 *     providers.
 * @return {!goog.Thenable<!Object<!e2e.openpgp.KeyProviderId,
 *     e2e.openpgp.KeyProviderState>>} The state of the key providers, after
 *     initialization.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.initializeKeyProviders =
    goog.abstractMethod;


/**
 * Returns the current state of all supported Key Providers.
 * @return {!goog.Thenable<!Object<!e2e.openpgp.KeyProviderId,
 *     e2e.openpgp.KeyProviderState>>} The state of all key providers.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.getKeyProvidersState =
    goog.abstractMethod;


/**
 * Reinitializes the individual Key Provider with different configuration data.
 * Use this function when some provider-specific configuration needs to be
 * changed at runtime (e.g. when the user requests to change the passphrase of
 * the provider's storage).
 * @param {!e2e.openpgp.KeyProviderId} providerId Provider to change the state
 *     of.
 * @param {!e2e.openpgp.KeyProviderConfig} newConfig The new
 *     initialization data.
 * @return {!goog.Thenable<e2e.openpgp.KeyProviderState>}
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.reconfigureKeyProvider =
    goog.abstractMethod;


/**
 * Returns trusted keys for a given purpose for a user with given e-mail
 * address. Use this to fetch the keys to use with
 * {@link e2e.openpgp.Context2#verifyDecrypt} and
 * {@link e2e.openpgp.Context2#encryptSign}.
 * @param {!e2e.openpgp.KeyPurposeType} purpose The purpose of the key.
 * @param {!e2e.openpgp.UserEmail} email The email address.
 * @return {!e2e.openpgp.KeysPromise} The resulting trusted keys.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.getTrustedKeys = goog.abstractMethod;


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
e2e.openpgp.managers.KeyManager.prototype.getKeysByKeyId = goog.abstractMethod;


/**
 * Returns all secret/public keys.
 * @param {!e2e.openpgp.KeyRingType} keyringType
 * @param {e2e.openpgp.KeyProviderId=} opt_providerId If passed, only return the
 *     keys from this KeyProvider.
 * @return {!e2e.openpgp.KeysPromise} The resulting keys, potentially untrusted.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.getAllKeys = goog.abstractMethod;


/**
 * Returns all public and secret keys with User ID pointing to a given e-mail
 * address from the keyring. Use this to simplify key management when keys are
 * indexed by e-mail address (e.g. in contact list). Returned keys may be
 * untrusted.
 * @param {!e2e.openpgp.UserEmail} email The email address.
 * @return {!e2e.openpgp.KeysPromise} The resulting keys, potentially untrusted.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.getAllKeysByEmail =
    goog.abstractMethod;


/**
 * Returns a single public key that has a matching OpenPGP fingerprint for the
 * main key packet.
 * @param {!e2e.openpgp.KeyFingerprint} fingerprint The key fingerprint
 * @param {e2e.openpgp.KeyProviderId=} opt_providerId If passed, only return the
 *     keys from this KeyProvider.
 * @return {!e2e.openpgp.KeyPromise} The resulting key, potentially
 *     untrusted.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.getPublicKeyByFingerprint =
    goog.abstractMethod;


/**
 * Returns all possible key generation options supported by KeyManager.
 * @return {!goog.Thenable<!Array.<!e2e.openpgp.KeyGenerateOptions>>} Available
 *     key generation options.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.getAllKeyGenerateOptions =
    goog.abstractMethod;


/**
 * Generates a keypair. The returned keys are implicitly trusted for appropriate
 * purposes.
 * @param {string} userId User ID for the generated keys.
 * @param {!e2e.openpgp.KeyGenerateOptions} generateOptions Key generation
 *     options.
 * @return {!goog.Thenable<!e2e.openpgp.KeyPair>} The generated keypair.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.generateKeyPair = goog.abstractMethod;


/**
 * Returns the available keyring export options.
 * @param {!e2e.openpgp.KeyRingType} keyringType The type of the keyring.
  * @return {!goog.Thenable<!Array<!e2e.openpgp.KeyringExportOptions>>} The
 *     available export options.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.getKeyringExportOptions =
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
e2e.openpgp.managers.KeyManager.prototype.exportKeyring = goog.abstractMethod;


/**
 * Sets the credentials to use by a given KeyProvider in future calls.
 * @param {!e2e.openpgp.KeyProviderId} providerId Key provider ID.
 * @param {e2e.openpgp.KeyProviderCredentials} credentials The credentials.
 * @return {!goog.Thenable}
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.setProviderCredentials =
    goog.abstractMethod;


/**
 * Marks the key(s) as trusted for a given email address. These keys will be
 * then returned in getKeys() calls for that user and the selected purpose(s).
 * Other keys for that email address are implicitly marked as not trusted.
 * The policy for trusting the keys is implemented in the KeyManager of the
 * application.
 * Calling this method might cause UI interaction that lets the KeyProvider
 * manage the trusting process for the keys (e.g. entering a PIN code,
 * confirming an action).
 * The application may optionally pass additional data consumed by the
 * KeyManager / KeyProvider that contain parameters for trusting keys.
 * @param {!e2e.openpgp.Keys} keys The keys to trust.
 * @param {!e2e.openpgp.UserEmail} email The Email address.
 * @param {!e2e.openpgp.KeyPurposeType} purpose The purpose for which
 *     to trust the keys. Invalid purpose for a given key will be ignored.
 * @param {e2e.openpgp.KeyTrustData=} opt_trustData Extra key trust data
 *     containing information for the KeyManager/KeyProviders.
 * @return {!e2e.openpgp.KeysPromise} The keys.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.trustKeys = goog.abstractMethod;


/**
 * Tries to unlock a given secret key. Noop if the key is already unlocked.
 * Calling this method might cause UI interaction from the KeyProvider.
 * Necessary data for interacting with the user (e.g. MessagePorts,
 * callback functions) should be passed in unlockData.
 * @param {!e2e.openpgp.Key} key The key to unlock
 * @param {!e2e.openpgp.KeyUnlockData} unlockData The key unlock data.
 * @return {!e2e.openpgp.KeyPromise} The unlocked Key.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.unlockSecretKey = goog.abstractMethod;


/**
 * Removes keys from the KeyProviders.
 * @param {!Array<!e2e.openpgp.Key>} keys
 * @return {!goog.Thenable}
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.removeKeys = goog.abstractMethod;


/**
 * Imports a binary-encoded OpenPGP key(s) into the Context.
 * All keys from the serialization will be processed.
 * @param {!e2e.ByteArray} serializedKeys Serialization of all the key blocks
 *     to import.
 * @param {!function(string):!goog.Thenable<string>} passphraseCallback This
 *     callback is used for requesting an action-specific passphrase from the
 *     user (if the key material is encrypted to a passprase).
 * @return {!e2e.openpgp.KeysPromise} List of keys that were successfully
 *     imported.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.importKeys = goog.abstractMethod;


/**
 * Decrypts a ciphertext with an unlocked secret key.
 * @param {!e2e.openpgp.Key} key The unlocked key to decrypt with.
 * @param {!e2e.openpgp.KeyId} keyId Key ID hint for choosing the right key
 *     packet.
 * @param {!e2e.cipher.Algorithm} algorithm The declared algorithm to use
 *     (on algorithm mismatch, an error will be thrown).
 * @param {!e2e.cipher.ciphertext.CipherText} ciphertext The ciphertext.
 * @return {!goog.Thenable<!e2e.ByteArray>}  The decrypted data.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.decrypt = goog.abstractMethod;


/**
 * Signs a message with an unlocked secret key.
 * @param {!e2e.openpgp.Key} key The unlocked key to sign with.
 * @param {!e2e.openpgp.KeyId} keyId Key ID hint for choosing the right key
 *     packet.
 * @param {!e2e.signer.Algorithm} algorithm The declared algorithm to use
 *     (on algorithm mismatch, an error will be thrown).
 * @param {!e2e.hash.Algorithm} hashAlgorithm The declared hash algorithm to
 *     use (on algorithm mismatch, an error will be thrown).
 * @param {!e2e.ByteArray} data The data to sign.
 * @return {!goog.Thenable<!e2e.signer.signature.Signature>} The signature.
 * @export
 */
e2e.openpgp.managers.KeyManager.prototype.sign = goog.abstractMethod;
