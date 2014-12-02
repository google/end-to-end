/**
 * @license
 * Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Base class to provide a high level API for PGP operations.
 */

goog.provide('e2e.openpgp.Context');

/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.openpgp.types');



/**
 * Interface for a high level abstraction of encryption and signing services.
 * @interface
 */
e2e.openpgp.Context = function() {};


/**
 * Specifies whether the output should be ASCII armored or not.
 * @type {boolean}
 */
e2e.openpgp.Context.prototype.armorOutput;


/**
 * Specifies whether the error messages generated should be verbose.
 * Verbose error messages might leak information about the secret
 * keys and secret messages.
 * @type {boolean}
 */
e2e.openpgp.Context.prototype.verboseErrors;


/**
 * Specifies the value of an armor header.
 * @param {string} name The name of the header.
 * @param {string} version The value of the header.
 */
e2e.openpgp.Context.prototype.setArmorHeader;


/**
 * The URL of the key server.
 * @type {string}
 * @protected
 */
e2e.openpgp.Context.prototype.keyServerUrl;


/**
 * The types of keys used for search.
 * @enum {string}
 */
e2e.openpgp.Context.KeyType = {
  'PUBLIC': 'PUBLIC',
  'PRIVATE': 'PRIVATE',
  'ALL': 'ALL'
};


/**
 * @param {string} passphrase The passphrase for encrypting the KeyRing
 *     when stored locally.
 * @expose
 */
e2e.openpgp.Context.prototype.setKeyRingPassphrase;


/**
 * @param {string} passphrase Change the passphrase for encrypting the KeyRing
 *     when stored locally. Empty string for unencrypted.
 * @expose
 */
e2e.openpgp.Context.prototype.changeKeyRingPassphrase;


/**
 * @return {boolean} True if there is a correct keyring passphrase set.
 * @expose
 */
e2e.openpgp.Context.prototype.hasPassphrase;


/**
 * @return {boolean} True if the keyring is encrypted in LocalStorage.
 * @expose
 */
e2e.openpgp.Context.prototype.isKeyRingEncrypted;


/**
 * Parses key blocks and returns a structured description of the keys.
 * @param {!e2e.ByteArray|string} key Key(s) to get the description of.
 * @return {!e2e.openpgp.KeyResult} Description of the keys.
 * @expose
 */
e2e.openpgp.Context.prototype.getKeyDescription;


/**
 * Imports an armor encoded, or pure PGP key into the Context.
 * @param {function(string, function(string))} passphraseCallback This callback
 *     is used for requesting an action-specific passphrase from the user.
 * @param {!e2e.ByteArray|string} key The key to import.
 * @return {!e2e.openpgp.ImportKeyResult} List of user IDs that were
 *     successfully imported.
 * @expose
 */
e2e.openpgp.Context.prototype.importKey;


/**
 * Generates a key, encrypts it, and imports it into the Context.
 * @param {!e2e.signer.Algorithm} keyAlgo Algorithm of the key.
 * @param {number} keyLength Key length to generate a key.
 * @param {!e2e.cipher.Algorithm} subkeyAlgo Algorithm of the subkey.
 * @param {number} subkeyLength Subkey length to generate a key.
 * @param {string} name The name to associate the key to.
 * @param {string} comment A comment to note the key with.
 * @param {string} email The email to associate the key to.
 * @param {number} expirationDate Timestamp in seconds to expire the key.
 * @return {!e2e.openpgp.GenerateKeyResult} The generated key.
 * @expose
 */
e2e.openpgp.Context.prototype.generateKey;


/**
 * Encrypts and signs a given plaintext with a set of keys.
 * @param {string|!e2e.ByteArray} plaintext The plaintext.
 * @param {!e2e.openpgp.EncryptOptions} options Metadata to add.
 * @param {!Array.<!e2e.openpgp.Key>} encryptionKeys The keys to
 *     encrypt the message with.
 * @param {!Array.<string>} passphrases Passphrases to use for symmetric
 *     key encryption of the message.
 * @param {e2e.openpgp.Key=} opt_signatureKey The key to sign
 *     the message with.
 * @return {!e2e.openpgp.EncryptSignResult} The result of the encrypt/sign
 *     operation.
 * @expose
 */
e2e.openpgp.Context.prototype.encryptSign;


/**
 * Verifies and decrypts signatures. It will also verify a cleartext message
 * @param {function(string, function(string))} passphraseCallback This callback
 *     is used for requesting an action-specific passphrase from the user.
 * @param {!e2e.ByteArray|string} encryptedMessage The encrypted data (or
 *     a cleartext message).
 * @return {!e2e.openpgp.VerifyDecryptResult} The result of the
 *     verify/decrypt operation.
 * @expose
 */
e2e.openpgp.Context.prototype.verifyDecrypt;


/**
 * Searches a public key from a user identifier.
 * @param {string} uid The user id to search for.
 * @return {!e2e.openpgp.KeyResult} The result of the key search.
 * @expose
 */
e2e.openpgp.Context.prototype.searchPublicKey;


/**
 * Searches a private key from a user identifier.
 * @param {string} uid The user id to search for.
 * @return {!e2e.openpgp.KeyResult} The result of the key search.
 * @expose
 */
e2e.openpgp.Context.prototype.searchPrivateKey;


/**
 * Searches a public and private key from a user identifier.
 * @param {string} uid The user id to search for.
 * @return {!e2e.openpgp.KeyResult} The result of the key search.
 * @expose
 */
e2e.openpgp.Context.prototype.searchKey;


/**
 * Gets all of the keys in the keyring.
 * @param {boolean=} opt_priv Whether to return the private keyring.
 * @return {!e2e.async.Result.<!e2e.openpgp.KeyRingMap>} A clone of the key ring
 *     map.
 * @expose
 */
e2e.openpgp.Context.prototype.getAllKeys;


/**
 * Deletes all keys for a user identifier.
 * @param {string} uid The user id to delete all keys.
 * @expose
 */
e2e.openpgp.Context.prototype.deleteKey;


/**
 * Exports the secret keyring.
 * @param {boolean} armored Whether to export the keyring in radix64 armor.
 * @return {!e2e.async.Result.<!e2e.ByteArray|string>}
 * @expose
 */
e2e.openpgp.Context.prototype.exportKeyring;


/**
 * Provides serialized data needed to back up generated EC keys.
 * @return {!e2e.async.Result.<e2e.openpgp.KeyringBackupInfo>}
 * @expose
 */
e2e.openpgp.Context.prototype.getKeyringBackupData;


/**
 * Restores serialized data from ECC key backup
 * @param {e2e.openpgp.KeyringBackupInfo} data Serialized data to restore
 * @param {string} email The email to associate with restored keys.
 * @return {e2e.async.Result.<undefined>}
 * @expose
 */
e2e.openpgp.Context.prototype.restoreKeyring;

