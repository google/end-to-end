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
 * @fileoverview Exposes the types used for the public API.
 */

goog.provide('e2e.openpgp.ArmoredMessage');
goog.provide('e2e.openpgp.Ciphertext');
goog.provide('e2e.openpgp.DecryptResult');
goog.provide('e2e.openpgp.EncryptOptions');
goog.provide('e2e.openpgp.EncryptSignPromise');
goog.provide('e2e.openpgp.EncryptSignResult');
goog.provide('e2e.openpgp.FileOptions');
goog.provide('e2e.openpgp.GenerateKeyResult');
goog.provide('e2e.openpgp.ImportKeyResult');
goog.provide('e2e.openpgp.Key');
goog.provide('e2e.openpgp.KeyFingerprint');
goog.provide('e2e.openpgp.KeyGenerateOptions');
goog.provide('e2e.openpgp.KeyId');
goog.provide('e2e.openpgp.KeyPacketInfo');
goog.provide('e2e.openpgp.KeyPair');
goog.provide('e2e.openpgp.KeyPromise');
goog.provide('e2e.openpgp.KeyProviderConfig');
goog.provide('e2e.openpgp.KeyProviderCredentials');
goog.provide('e2e.openpgp.KeyProviderId');
goog.provide('e2e.openpgp.KeyProviderState');
goog.provide('e2e.openpgp.KeyPurposeType');
goog.provide('e2e.openpgp.KeyResult');
goog.provide('e2e.openpgp.KeyRingMap');
goog.provide('e2e.openpgp.KeyRingType');
goog.provide('e2e.openpgp.KeyTrustData');
goog.provide('e2e.openpgp.KeyUnlockData');
goog.provide('e2e.openpgp.KeyringBackupInfo');
goog.provide('e2e.openpgp.KeyringExportFormat');
goog.provide('e2e.openpgp.KeyringExportOptions');
goog.provide('e2e.openpgp.Keys');
goog.provide('e2e.openpgp.KeysPromise');
goog.provide('e2e.openpgp.Plaintext');
goog.provide('e2e.openpgp.SerializedKeyRing');
goog.provide('e2e.openpgp.TransferableKeyMap');
goog.provide('e2e.openpgp.UserEmail');
goog.provide('e2e.openpgp.UserIdsPromise');
goog.provide('e2e.openpgp.VerifiedDecrypt');
goog.provide('e2e.openpgp.VerifyDecryptPromise');
goog.provide('e2e.openpgp.VerifyDecryptResult');
goog.provide('e2e.openpgp.VerifyResult');
/** @suppress {extraProvide} provide the whole namespace for simplicity */
goog.provide('e2e.openpgp.types');

/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.ByteArray');


/**
 * File information for encrypting and decrypting files.
 * @typedef {?{filename: string, creationTime: number,
 *     charset: (string|undefined)}}
 */
e2e.openpgp.FileOptions;


/**
 * Options for encrypting, such as algorithm preferences.
 * @typedef {Object}
 * TODO(adhintz) Make this typedef more specific after we implement it.
 */
e2e.openpgp.EncryptOptions;


/**
 * Result of a decrypt operation.
 * @typedef {?{data: (!e2e.ByteArray|!Uint8Array),
 *     options: !e2e.openpgp.FileOptions, wasEncrypted: boolean}}
 */
e2e.openpgp.DecryptResult;


/**
 * Result of a decrypt operation.
 * @typedef {e2e.async.Result.<!Array.<e2e.openpgp.Key>>}
 */
e2e.openpgp.GenerateKeyResult;


/**
 * Result of an import key operation.
 * @typedef {goog.async.Deferred.<!Array.<string>>}
 */
e2e.openpgp.ImportKeyResult;


/**
 * Promise resolved with an array of user IDs.
 * @typedef {goog.Thenable.<!Array.<string>>}
 */
e2e.openpgp.UserIdsPromise;


/**
 * Result of a verification operation. Includes keys that successfully verified
 * a signature, keys for which signature verification failed (indicating
 * message tampering). Signatures for which keys could not be found are not
 * included in VerifyResults.
 * @typedef {?{
 *   success: !Array.<!e2e.openpgp.Key>,
 *   failure: !Array.<!e2e.openpgp.Key>
 * }}
 */
e2e.openpgp.VerifyResult;


/**
 * Result of a verification and decryption operation.
 * @typedef {{
 *    decrypt: !e2e.openpgp.DecryptResult,
 *    verify: ?e2e.openpgp.VerifyResult
 * }}
 */
e2e.openpgp.VerifiedDecrypt;


/**
 * Result of a verification and decryption operation.
 * @typedef {e2e.async.Result.<!e2e.openpgp.VerifiedDecrypt>}
 */
e2e.openpgp.VerifyDecryptResult;


/**
 * The result of the encryption and signing operation.
 * @typedef {e2e.async.Result.<!e2e.ByteArray>|e2e.async.Result.<string>}
 */
e2e.openpgp.EncryptSignResult;


/**
 * Promise resolved with the result of verification and decryption operation.
 * @typedef {goog.Thenable.<!e2e.openpgp.VerifiedDecrypt>}
 */
e2e.openpgp.VerifyDecryptPromise;


/**
 * Promise resolved with the result of the encryption and signing operation.
 * @typedef {goog.Thenable.<!e2e.ByteArray|string>}
 */
e2e.openpgp.EncryptSignPromise;


/**
 * Single key packet information.
 * @typedef {?{fingerprint: e2e.openpgp.KeyFingerprint, secret: boolean,
 *     algorithm: string, fingerprintHex: string}}
 */
e2e.openpgp.KeyPacketInfo;


/**
 * Key object.
 * @typedef {?{subKeys: !Array.<!e2e.openpgp.KeyPacketInfo>, uids:
 *     !Array.<string>, key: !e2e.openpgp.KeyPacketInfo, serialized:
 *     !e2e.ByteArray, providerId: !e2e.openpgp.KeyProviderId,
 *     signingKeyId: ?e2e.openpgp.KeyId,
 *     signAlgorithm: ?e2e.signer.Algorithm,
 *     signHashAlgorithm: ?e2e.hash.Algorithm,
 *     decryptionKeyId: ?e2e.openpgp.KeyId,
 *     decryptionAlgorithm: ?e2e.cipher.Algorithm
 *     }}
 */
e2e.openpgp.Key;


/**
 * Array of Keys.
 * @typedef {Array.<!e2e.openpgp.Key>}
 */
e2e.openpgp.Keys;


/**
 * The result of a key search operation.
 * @typedef {e2e.async.Result.<!e2e.openpgp.Keys>}
 */
e2e.openpgp.KeyResult;


/**
 * Armored OpenPGP message.
 * @typedef {?{data: !e2e.ByteArray, charset: (string|undefined),
 *     type: string, startOffset: number, endOffset: number}}
 */
e2e.openpgp.ArmoredMessage;


/**
 * Key backup information.
 * @typedef {{seed: ?e2e.ByteArray, count: ?number}}
 */
e2e.openpgp.KeyringBackupInfo;


/**
 * @typedef {Object.<!Array.<string>>}
 */
e2e.openpgp.SerializedKeyRing;


/**
 * The key ring map structure.
 * @typedef {goog.structs.Map.<string,
 *                            !Array.<!e2e.openpgp.block.TransferableKey>>}
 */
e2e.openpgp.TransferableKeyMap;


/**
 * The key ring map structure as used by the context.
 * @typedef {Object.<string, !Array.<!e2e.openpgp.Key>>}
 */
e2e.openpgp.KeyRingMap;


/**
 * OpenPGP fingerprint of the key.
 * @typedef {!e2e.ByteArray}
 */
e2e.openpgp.KeyFingerprint;


/**
 * OpenPGP Key ID, as defined in
 * https://tools.ietf.org/html/rfc4880#section-3.3.
 * @typedef {!e2e.ByteArray}
 */
e2e.openpgp.KeyId;


/**
 * Available purpose for the keys, guiding key discovery process in Context2.
 * @enum {string}
 */
e2e.openpgp.KeyPurposeType = {
  'ENCRYPTION': 'ENCRYPTION',
  'SIGNING': 'SIGNING',
  'VERIFICATION': 'VERIFICATION',
  'DECRYPTION': 'DECRYPTION'
};


/**
 * Types of the KeyRing.
 * @enum {string}
 */
e2e.openpgp.KeyRingType = {
  'PUBLIC': 'PUBLIC',
  'SECRET': 'SECRET'
};


/**
 * Unique ID of the KeyProvider.
 * @typedef {string}
 */
e2e.openpgp.KeyProviderId;


/**
 * E-mail address stored in the User ID field in Key packets.
 * @typedef {string}
 */
e2e.openpgp.UserEmail;


/**
 * Async result with a single key.
 * @typedef {goog.Thenable.<e2e.openpgp.Key>}
 */
e2e.openpgp.KeyPromise;


/**
 * Async result with multiple keys.
 * @typedef {goog.Thenable.<!e2e.openpgp.Keys>}
 */
e2e.openpgp.KeysPromise;


/**
 * Credentials for the KeyProvider
 * @typedef {Object}
 */
e2e.openpgp.KeyProviderCredentials;


/**
 * Key unlock data (opaque to the End-To-End library).
 * @typedef {Object}
 */
e2e.openpgp.KeyUnlockData;


/**
 * Key unlock data (opaque to the End-To-End library).
 * @typedef {{providerId: !e2e.openpgp.KeyProviderId, options: Object}}
 */
e2e.openpgp.KeyGenerateOptions;


/**
 * Keyring export options (opaque to the End-To-End library).
 * @typedef {*}
 */
e2e.openpgp.KeyringExportOptions;


/**
 * Configuration data used to initialize or reconfigure a KeyProvider
 * (opaque to the End-To-End library).
 * @typedef {*}
 */
e2e.openpgp.KeyProviderConfig;


/**
 * State of the KeyProvider (opaque to the End-To-End library). State can
 * indicate what options can be used to reconfigure the KeyProvider.
 * @typedef {*}
 */
e2e.openpgp.KeyProviderState;


/**
 * Key trust data (opaque to the End-to-End library).
 * @typedef {Object}
 */
e2e.openpgp.KeyTrustData;


/**
 * Generated Key pair
 * @typedef {{secret: !e2e.openpgp.Key,
 *     public: !e2e.openpgp.Key}}
 */
e2e.openpgp.KeyPair;


/**
 * Plaintext to be encrypted/signed.
 * @typedef {string|e2e.ByteArray}
 */
e2e.openpgp.Plaintext;


/**
 * Ciphertext to be decrypted/verified.
 * @typedef {string|e2e.ByteArray}
 */
e2e.openpgp.Ciphertext;


/**
 * Common keyring export formats.
 * @enum {string}
 */
e2e.openpgp.KeyringExportFormat = {
  'OPENPGP_PACKETS_ASCII': 'OPENPGP_PACKETS_ASCII',
  'OPENPGP_PACKETS_BINARY': 'OPENPGP_PACKETS_BINARY'
};
