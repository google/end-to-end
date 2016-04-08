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
 * @fileoverview Interface to provide a version 2 of high level API for
 * OpenPGP operations.
 */

goog.provide('e2e.openpgp.Context2');


/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.openpgp.types');



/**
 * Interface for a high level abstraction of OpenPGP key management, encryption
 * and signing services.
 * @interface
 */
e2e.openpgp.Context2 = function() {};


/**
 * Returns trusted keys for a given purpose for a user with given e-mail
 * address. Use this to fetch the keys to use with {@link #verifyDecrypt} and
 * {@link #encryptSign}.
 * @param {!e2e.openpgp.KeyPurposeType} purpose The purpose of the key.
 * @param {!e2e.openpgp.UserEmail} email The email address.
 * @return {!e2e.openpgp.KeysPromise} The resulting trusted keys.
 * @export
 */
e2e.openpgp.Context2.prototype.getTrustedKeys = goog.abstractMethod;


/**
 * Returns all the available secret keys. Use to expose a secret keyring to the
 * user. Returned keys might be untrusted.
 * @param {!e2e.openpgp.KeyProviderId=} opt_providerId If passed, only return
 *     the keys from this KeyProvider.
 * @return {!e2e.openpgp.KeysPromise} The resulting keys, potentially untrusted.
 * @export
 */
e2e.openpgp.Context2.prototype.getAllSecretKeys = goog.abstractMethod;


/**
 * Returns all the available public keys. Use to expose a public keyring to the
 * user. Returned keys might be untrusted.
 * @param {e2e.openpgp.KeyProviderId=} opt_providerId If passed, only return the
 *     keys from this KeyProvider.
 * @return {!e2e.openpgp.KeysPromise} The resulting keys, potentially untrusted.
 * @export
 */
e2e.openpgp.Context2.prototype.getAllPublicKeys = goog.abstractMethod;


/**
 * Returns all public and secret keys with User ID pointing to a given e-mail
 * address from the keyring. Use this to simplify key management when keys are
 * indexed by e-mail address (e.g. in contact list). Returned keys may be
 * untrusted.
 * @param {!e2e.openpgp.UserEmail} email The email address.
 * @return {!e2e.openpgp.KeysPromise} The resulting keys, potentially untrusted.
 * @export
 */
e2e.openpgp.Context2.prototype.getAllKeysByEmail = goog.abstractMethod;


/**
 * Returns a single public key that has a matching OpenPGP fingerprint for the
 * main key packet.
 * @param {!e2e.openpgp.KeyFingerprint} fingerprint The key fingerprint
 * @param {!e2e.openpgp.KeyProviderId=} opt_providerId If passed, only return
 *     the keys from this KeyProvider.
 * @return {!e2e.openpgp.KeyPromise} The resulting key, potentially
 *     untrusted.
 * @export
 */
e2e.openpgp.Context2.prototype.getPublicKeyByFingerprint = goog.abstractMethod;


/**
 * Sets the credentials for subsequent credentials for a given provider.
 * @param {!e2e.openpgp.KeyProviderId} providerId KeyProvider ID
 * @param {e2e.openpgp.KeyProviderCredentials} credentials The credentials.
 * @return {!goog.Thenable}
 * @export
 */
e2e.openpgp.Context2.prototype.setProviderCredentials = goog.abstractMethod;


/**
 * Returns all possible key generation options supported by the KeyProviders.
 * @return {!goog.Thenable<!Array.<!e2e.openpgp.KeyGenerateOptions>>} Available
 *     key generation options.
 * @export
 */
e2e.openpgp.Context2.prototype.getAllKeyGenerateOptions = goog.abstractMethod;


/**
 * Generates a keypair in the keyring. The returned keys are implicitly trusted
 * and will be returned by getKeys().
 * @param {string} userId User ID for the generated keys.
 * @param {!e2e.openpgp.KeyGenerateOptions} generateOptions Key generation
 *     options.
 * @return {!goog.Thenable<!e2e.openpgp.KeyPair>} The generated keypair.
 * @export
 */
e2e.openpgp.Context2.prototype.generateKeyPair = goog.abstractMethod;


/**
 * Returns the keyring export options.
 * @param {!e2e.openpgp.KeyRingType} keyringType The type of the keyring.
 * @return {!goog.Thenable<!Array<!e2e.openpgp.KeyringExportOptions>>} The
 *     available export options.
 * @export
 */
e2e.openpgp.Context2.prototype.getKeyringExportOptions = goog.abstractMethod;


/**
 * Exports the keyring.
 * @param {!e2e.openpgp.KeyRingType} keyringType The type of the keyring.
 * @param {!e2e.openpgp.KeyringExportOptions.<T>} exportOptions The chosen
 *     export options.
 * @return {!goog.Thenable.<T>} The exported keyring.
 * @template T
 * @export
 */
e2e.openpgp.Context2.prototype.exportKeyring = goog.abstractMethod;


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
e2e.openpgp.Context2.prototype.trustKeys = goog.abstractMethod;


/**
 * Checks if key for a given user is trusted for a given purpose.
 * @param {!e2e.openpgp.Key} key The key to check the trustedness of.
 * @param {!e2e.openpgp.UserEmail} email The user email address.
 * @param {!e2e.openpgp.KeyPurposeType} purpose The purposes for which
 *     to check the trustedness.
 * @return {!goog.Thenable<boolean>} True iff the key is trusted.
 * @export
 */
e2e.openpgp.Context2.prototype.isKeyTrusted = goog.abstractMethod;


/**
 * Tries to unlock a given secret key. Noop if the key is already unlocked.
 * Calling this method might cause UI interaction from the KeyProvider.
 * Neccessary data for interacting with the user (e.g. MessagePorts,
 * callback functions) should be passed in unlockData.
 * @param {!e2e.openpgp.Key} key The key to unlock
 * @param {!e2e.openpgp.KeyUnlockData} unlockData The key unlock data.
 * @return {!e2e.openpgp.KeyPromise} The unlocked Key.
 * @export
 */
e2e.openpgp.Context2.prototype.unlockSecretKey = goog.abstractMethod;


/**
 * Specifies whether the output should be ASCII armored or not.
 * @param {boolean} shouldArmor True if the output should be ASCII armored
 *     (default).
 * @return {!goog.Thenable}
 * @export
 */
e2e.openpgp.Context2.prototype.setArmorOutput = goog.abstractMethod;


/**
 * Specifies the value of an armor header to add when ASCII armoring data.
 * @param {string} name The name of the header.
 * @param {string} value The value of the header.
 * @return {!goog.Thenable}
 * @export
 */
e2e.openpgp.Context2.prototype.setArmorHeader = goog.abstractMethod;


/**
 * Parses key blocks in binary or ASCII armor encoding, and returns a structured
 * description of the keys.
 * All ASCII armors from the string will be processed. Keys are only parsed,
 * and are not imported. Use {@link #importKeys} to import them.
 * @param {!e2e.ByteArray|string} keySerialization Key(s) to get the description
 *     of.
 * @return {!e2e.openpgp.KeysPromise} Description of the keys.
 * @export
 */
e2e.openpgp.Context2.prototype.getKeysDescription = goog.abstractMethod;


/**
 * Imports an armor encoded, or binary OpenPGP key(s) into the Context.
 * All ASCII armors from the string will be processed.
 * @param {!e2e.ByteArray|string} keySerialization The key(s) to import.
 * @param {!function(string):!goog.Thenable<string>} passphraseCallback This
 *     callback is used for requesting an action-specific passphrase from the
 *     user (if the key material is encrypted to a passprase).
 * @return {!e2e.openpgp.KeysPromise} List of keys that were successfully
 *     imported.
 * @export
 */
e2e.openpgp.Context2.prototype.importKeys = goog.abstractMethod;


/**
 * Encrypts and signs a given plaintext with a set of keys.
 * @param {!e2e.openpgp.Plaintext} plaintext The plaintext.
 * @param {!e2e.openpgp.EncryptOptions} options Metadata to add.
 * @param {!Array.<!e2e.openpgp.Key>} encryptionKeys The keys to
 *     encrypt the message with.
 * @param {!Array.<string>} passphrases Passphrases to use for symmetric
 *     key encryption of the message.
 * @param {!Array.<!e2e.openpgp.Key>} signatureKeys The keys to sign
 *     the message with.
 * @return {!e2e.openpgp.EncryptSignPromise} The result of the encrypt/sign
 *     operation.
 * @export
 */
e2e.openpgp.Context2.prototype.encryptSign = goog.abstractMethod;


/**
 * Verifies and decrypts signatures. It will also verify a cleartext message.
 * @param {!e2e.openpgp.Ciphertext} encryptedMessage The encrypted data (or
 *     a cleartext message).
 * @param {!function(string):!goog.Thenable<string>} passphraseCallback This
 *     callback is used for requesting an passphrase from the
 *     user if the ciphertext is encrypted to a passphrase.
 * @param {!Array.<!e2e.openpgp.Key>=} opt_decryptionKeys If present,
 *     only those keys will be used for decryption. Otherwise, Context2 uses
 *     Key ID hints in the message to resolve keys on its own.
 * @param {!Array.<!e2e.openpgp.Key>=} opt_verificationKeys If present,
 *     only those keys will be used for signature verification. Otherwise,
 *     Context2 uses Key ID hints in the message to resolve keys on its own.
 * @return {!e2e.openpgp.VerifyDecryptPromise} The result of the
 *     verify/decrypt operation.
 * @export
 */
e2e.openpgp.Context2.prototype.verifyDecrypt = goog.abstractMethod;


/**
 * Removes keys from the keyring.
 * @param {!Array<!e2e.openpgp.Key>} keys
 * @return {!goog.Thenable}
 * @export
 */
e2e.openpgp.Context2.prototype.removeKeys = goog.abstractMethod;


/**
 * Initializes all the KeyProviders used by the context.
 * @param {Object<!e2e.openpgp.KeyProviderId,
 *     e2e.openpgp.KeyProviderConfig>} config Configuration for the key
 *     providers. Default config will be used, when a KeyProviderId has not been
 *     specified for a given KeyProvider.
 * @return {!goog.Thenable<!Object<!e2e.openpgp.KeyProviderId,
 *     e2e.openpgp.KeyProviderState>>} The state of the key providers, after
 *     initialization.
 * @export
 */
e2e.openpgp.Context2.prototype.initializeKeyProviders = goog.abstractMethod;


/**
 * Returns IDs of all supported KeyProviders.
 * @return {!goog.Thenable<!Array<!e2e.openpgp.KeyProviderId>>} Supported key
 *     provider IDs.
 * @export
 */
e2e.openpgp.Context2.prototype.getKeyProviderIds = goog.abstractMethod;


/**
 * Returns the current state of all supported Key Providers.
 * @return {!goog.Thenable<!Object<!e2e.openpgp.KeyProviderId,
 *     e2e.openpgp.KeyProviderState>>} The state of all key providers.
 * @export
 */
e2e.openpgp.Context2.prototype.getKeyRingState = goog.abstractMethod;


/**
 * Reinitializes the individual key provider with different data.
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
e2e.openpgp.Context2.prototype.reconfigureKeyProvider = goog.abstractMethod;
