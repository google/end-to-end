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

goog.provide('e2e.openpgp.providers.PublicKeyProvider');


goog.require('e2e.openpgp.providers.KeyProvider');



/**
 * PublicKeyProvider interface.
 * @interface
 * @extends {e2e.openpgp.providers.KeyProvider}
 */
e2e.openpgp.providers.PublicKeyProvider = function() {};


/**
 * Returns trusted public keys for a given purpose for a user with given e-mail
 * address. Use this to fetch the keys to use with
 * {@link e2e.openpgp.Context2#verifyDecrypt} and
 * {@link e2e.openpgp.Context2#encryptSign}.
 *
 * PublicKeyProvider should return serialization of the key blocks in
 * separate array element. If a PublicKeyProvider doesn't parse the packets,
 * it may return multiple key blocks in one array element (KeyManager will
 * parse all the keys from every array element).
 *
 * @param {!e2e.openpgp.KeyPurposeType} purpose The purpose of the key.
 * @param {!e2e.openpgp.UserEmail} email The email address.
 * @return {!goog.Thenable<!Array<!e2e.ByteArray>>} The resulting serialization
 *     of the trusted keys.
 * @export
 */
e2e.openpgp.providers.PublicKeyProvider.prototype.getTrustedPublicKeysByEmail =
    goog.abstractMethod;


/**
 * Returns public keys that have a key packet with a given OpenPGP key ID.
 * If a wildcard key ID is passed, return all keys. Used for signature
 * verification purposes only.
 *
 * @see https://tools.ietf.org/html/rfc4880#section-5.1
 * @param {!e2e.openpgp.KeyId} id The key ID.
 * @return {!goog.Thenable<!Array<!e2e.ByteArray>>} The resulting serialization
 *     of the (potentially untrusted) keys. See note in
 *     {#getTrustedPublicKeysByEmail}.
 * @export
 */
e2e.openpgp.providers.PublicKeyProvider.prototype.getVerificationKeysByKeyId =
    goog.abstractMethod;


/**
 * Returns all public keys in the storage.
 * @return {!goog.Thenable<!Array<!e2e.ByteArray>>} The resulting serialization
 *     of the (potentially untrusted) keys. See note in
 *     {#getTrustedPublicKeysByEmail}.
 * @export
 */
e2e.openpgp.providers.PublicKeyProvider.prototype.getAllPublicKeys =
    goog.abstractMethod;


/**
 * Returns all public keys with User ID pointing to a given e-mail address from
 * the storage. Use this to simplify key management when keys are indexed by
 * e-mail address (e.g. in contact list). Returned keys may be untrusted.
 * @param {!e2e.openpgp.UserEmail} email The email address.
 * @return {!goog.Thenable<!Array<!e2e.ByteArray>>} The resulting serialization
 *     of the (potentially untrusted) keys.See note in
 *     {#getTrustedPublicKeysByEmail}.
 * @export
 */
e2e.openpgp.providers.PublicKeyProvider.prototype.getAllPublicKeysByEmail =
    goog.abstractMethod;


/**
 * Returns a single public key that has a matching OpenPGP fingerprint for a
 * main key packet.
 * @param {!e2e.openpgp.KeyFingerprint} fingerprint The key fingerprint
 * @return {!goog.Thenable<?e2e.ByteArray>} The resulting serialization
 *     of the (potentially untrusted) key, or null if the key was not found.
 * @export
 */
e2e.openpgp.providers.PublicKeyProvider.prototype.getPublicKeyByFingerprint =
    goog.abstractMethod;


/**
 * Removes all public keys with a given fingerprint for the main key block.
 * @param {!e2e.openpgp.KeyFingerprint} fingerprint
 * @return {!goog.Thenable}
 * @export
 */
e2e.openpgp.providers.PublicKeyProvider.prototype.removePublicKeyByFingerprint =
    goog.abstractMethod;
