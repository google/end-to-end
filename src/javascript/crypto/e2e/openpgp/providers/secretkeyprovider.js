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

goog.provide('e2e.openpgp.providers.SecretKeyProvider');


goog.require('e2e.openpgp.providers.KeyProvider');



/**
 * SecretKeyProvider interface.
 * @interface
 * @extends {e2e.openpgp.providers.KeyProvider}
 */
e2e.openpgp.providers.SecretKeyProvider = function() {
};


/**
 * Returns trusted secret keys for a given purpose for a user with given e-mail
 * address. Use this to fetch the keys to use with
 * {@link e2e.openpgp.Context2#verifyDecrypt} and
 * {@link e2e.openpgp.Context2#encryptSign}.
 * @param {!e2e.openpgp.KeyPurposeType} purpose The purpose of the key.
 * @param {!e2e.openpgp.UserEmail} email The email address.
 * @return {!e2e.openpgp.KeysPromise} The resulting trusted keys.
 * @export
 */
e2e.openpgp.providers.SecretKeyProvider.prototype.getTrustedSecretKeysByEmail =
    goog.abstractMethod;


/**
 * Returns secret keys that have a key packet with a given OpenPGP Key ID.
 * Used for messages decryption purpose only.
 * If a wildcard key ID is passed, return all keys for that purpose.
 * @see https://tools.ietf.org/html/rfc4880#section-5.1
 * @param {!e2e.openpgp.KeyId} id The key ID.
 * @return {!e2e.openpgp.KeysPromise} The resulting keys, potentially untrusted.
 * @export
 */
e2e.openpgp.providers.SecretKeyProvider.prototype.getDecryptionKeysByKeyId =
    goog.abstractMethod;


/**
 * Returns all secret keys in the storage.
 * @return {!e2e.openpgp.KeysPromise} The resulting keys, potentially untrusted.
 * @export
 */
e2e.openpgp.providers.SecretKeyProvider.prototype.getAllSecretKeys =
    goog.abstractMethod;


/**
 * Returns all secret keys with User ID pointing to a given e-mail address from
 * the storage. Use this to simplify key management when keys are indexed by
 * e-mail address (e.g. in contact list). Returned keys may be untrusted.
 * @param {!e2e.openpgp.UserEmail} email The email address.
 * @return {!e2e.openpgp.KeysPromise} The resulting keys, potentially untrusted.
 * @export
 */
e2e.openpgp.providers.SecretKeyProvider.prototype.getAllSecretKeysByEmail =
    goog.abstractMethod;


/**
 * Returns a single key that has a matching OpenPGP fingerprint for the main
 * key packet.
 * @param {!e2e.openpgp.KeyFingerprint} fingerprint The key fingerprint
 * @return {!e2e.openpgp.KeyPromise} The resulting key, potentially
 *     untrusted (or null if the key was not found).
 * @export
 */
e2e.openpgp.providers.SecretKeyProvider.prototype.getSecretKeyByFingerprint =
    goog.abstractMethod;


/**
 * Removes all secret keys with a given fingerprint for the main key block.
 * @param {!e2e.openpgp.KeyFingerprint} fingerprint
 * @return {!goog.Thenable}
 * @export
 */
e2e.openpgp.providers.SecretKeyProvider.prototype.removeSecretKeyByFingerprint =
    goog.abstractMethod;


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
e2e.openpgp.providers.SecretKeyProvider.prototype.unlockSecretKey =
    goog.abstractMethod;


/**
 * Returns all possible key generation options supported by KeyManager.
 * @return {!goog.Thenable<!Array.<!e2e.openpgp.KeyGenerateOptions>>} Available
 *     key generation options.
 * @export
 */
e2e.openpgp.providers.SecretKeyProvider.prototype.getKeyGenerateOptions =
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
e2e.openpgp.providers.SecretKeyProvider.prototype.generateKeyPair =
    goog.abstractMethod;


/**
 * Decrypts a ciphertext with an unlocked secret key.
 * @param {!e2e.openpgp.Key} key The unlocked key to decrypt with.
 * @param {!e2e.openpgp.KeyId} keyId Key ID hint for choosing the right key
 *     packet.
 * @param {!e2e.cipher.Algorithm} algorithm The declared algorithm to use.
 *     (on algorithm mismatch, an error will be thrown).
 * @param {!e2e.cipher.ciphertext.CipherText} ciphertext The ciphertext.
 * @return {!goog.Thenable<!e2e.ByteArray>}  The decrypted data.
 * @export
 */
e2e.openpgp.providers.SecretKeyProvider.prototype.decrypt = goog.abstractMethod;


/**
 * Signs a message with an unlocked secret key.
 * @param {!e2e.openpgp.Key} key The unlocked key to sign with.
 * @param {!e2e.openpgp.KeyId} keyId Key ID hint for choosing the right key
 *     packet.
 * @param {!e2e.signer.Algorithm} algorithm The declared algorithm to use.
 *     (on algorithm mismatch, an error will be thrown).
 * @param {!e2e.hash.Algorithm} hashAlgorithm The declared hash algorithm to
 *     use (on algorithm mismatch, an error will be thrown).
 * @param {!e2e.ByteArray} data The data to sign.
 * @return {!goog.Thenable<!e2e.signer.signature.Signature>} The signature.
 * @export
 */
e2e.openpgp.providers.SecretKeyProvider.prototype.sign = goog.abstractMethod;
