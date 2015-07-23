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

goog.provide('e2e.openpgp.SecretKeyProvider');


goog.require('e2e.openpgp.PublicKeyProvider');



/**
 * SecretKeyProvider interface.
 * @interface
 * @extends {e2e.openpgp.PublicKeyProvider}
 */
e2e.openpgp.SecretKeyProvider = function() {
};


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
e2e.openpgp.SecretKeyProvider.prototype.unlockKey = goog.abstractMethod;


/**
 * Returns all possible key generation options supported by KeyManager.
 * @return {!goog.Thenable<!Array.<!e2e.openpgp.KeyGenerateOptions>>} Available
 *     key generation options.
 * @export
 */
e2e.openpgp.SecretKeyProvider.prototype.getKeyGenerateOptions =
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
e2e.openpgp.SecretKeyProvider.prototype.generateKeyPair = goog.abstractMethod;


/**
 * Decrypts a ciphertext with an unlocked secret key.
 * @param {!e2e.cipher.ciphertext.CipherText} ciphertext The ciphertext.
 * @param {!e2e.openpgp.Key} key The unlocked key to decrypt with.
 * @return {!goog.Thenable<!e2e.ByteArray>}  The decrypted data.
 * @export
 */
e2e.openpgp.SecretKeyProvider.prototype.decrypt = goog.abstractMethod;


/**
 * Signs a message with an unlocked secret key.
 * @param {!e2e.ByteArray} data The data to sign.
 * @param {!e2e.openpgp.Key} key The unlocked key to sign with.
 * @return {!goog.Thenable<!e2e.signer.signature.Signature>} The signature.
 * @export
 */
e2e.openpgp.SecretKeyProvider.prototype.sign = goog.abstractMethod;
