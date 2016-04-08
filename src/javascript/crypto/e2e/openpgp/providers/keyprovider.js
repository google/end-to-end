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

goog.provide('e2e.openpgp.providers.KeyProvider');



/**
 * KeyProvider interface.
 * @interface
 */
e2e.openpgp.providers.KeyProvider = function() {};


/**
 * Returns the provider ID (unique within the Key Manager).
 * @return {!goog.Thenable<!e2e.openpgp.KeyProviderId>}
 * @export
 */
e2e.openpgp.providers.KeyProvider.prototype.getId = goog.abstractMethod;


/**
 * Configures the Key Provider with a given configuration (opaque to End-To-End
 * library).
 * @param {!e2e.openpgp.KeyProviderConfig} config The configuration.
 * @return {!goog.Thenable<!e2e.openpgp.KeyProviderState>} The state after
 * reconfiguration.
 * @export
 */
e2e.openpgp.providers.KeyProvider.prototype.configure = goog.abstractMethod;


/**
 * Returns the current state of the provider. State can be null if the provider
 * does not expose any options to reconfigure it.
 * @return {!goog.Thenable<e2e.openpgp.KeyProviderState>} The state.
 * @export
 */
e2e.openpgp.providers.KeyProvider.prototype.getState = goog.abstractMethod;


/**
 * Returns the available keyring export options.
 * @param {!e2e.openpgp.KeyRingType} keyringType The type of the keyring.
 * @return {!goog.Thenable<!Array<!e2e.openpgp.KeyringExportOptions>>} The
 *     available export options.
 * @export
 */
e2e.openpgp.providers.KeyProvider.prototype.getKeyringExportOptions =
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
e2e.openpgp.providers.KeyProvider.prototype.exportKeyring = goog.abstractMethod;


/**
 * Sets the credentials to use by a given KeyProvider in future calls.
 * @param {e2e.openpgp.KeyProviderCredentials} credentials The credentials.
 * @return {!goog.Thenable}
 * @export
 */
e2e.openpgp.providers.KeyProvider.prototype.setCredentials =
    goog.abstractMethod;


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
e2e.openpgp.providers.KeyProvider.prototype.trustKeys = goog.abstractMethod;


/**
 * Imports a binary serialization of OpenPGP key(s) into the Context.
 * All keys from the serialization should be processed.
 * @param {!e2e.ByteArray} serializedKeys Serialization of all the key blocks
 *     to import.
 * @param {!function(string):!goog.Thenable<string>} passphraseCallback This
 *     callback is used for requesting an action-specific passphrase from the
 *     user (if the key material is encrypted to a passprase).
 * @return {!e2e.openpgp.KeysPromise} List keys that were successfully imported.
 * @export
 */
e2e.openpgp.providers.KeyProvider.prototype.importKeys = goog.abstractMethod;
