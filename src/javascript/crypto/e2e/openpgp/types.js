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
goog.provide('e2e.openpgp.DecryptResult');
goog.provide('e2e.openpgp.EncryptOptions');
goog.provide('e2e.openpgp.EncryptSignResult');
goog.provide('e2e.openpgp.FileOptions');
goog.provide('e2e.openpgp.GenerateKeyResult');
goog.provide('e2e.openpgp.ImportKeyResult');
goog.provide('e2e.openpgp.Key');
goog.provide('e2e.openpgp.KeyFingerprint');
goog.provide('e2e.openpgp.KeyId');
goog.provide('e2e.openpgp.KeyPacketInfo');
goog.provide('e2e.openpgp.KeyResult');
goog.provide('e2e.openpgp.KeyRingMap');
goog.provide('e2e.openpgp.KeyringBackupInfo');
goog.provide('e2e.openpgp.Keys');
goog.provide('e2e.openpgp.SerializedKeyRing');
goog.provide('e2e.openpgp.TransferableKeyMap');
goog.provide('e2e.openpgp.VerifiedDecrypt');
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
 * @typedef {?{data: !e2e.ByteArray,
 *     options: !e2e.openpgp.FileOptions}}
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
 * Single key packet information.
 * @typedef {?{fingerprint: e2e.openpgp.KeyFingerprint, secret: boolean,
 *     algorithm: string, fingerprintHex: string}}
 */
e2e.openpgp.KeyPacketInfo;


/**
 * Key object.
 * @typedef {?{subKeys: !Array.<!e2e.openpgp.KeyPacketInfo>, uids:
 *     !Array.<string>, key: !e2e.openpgp.KeyPacketInfo, serialized:
 *     !e2e.ByteArray}}
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
 * @typedef {{seed: e2e.ByteArray, count: number}}
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
 * @typedef {goog.structs.Map.<string, !Array.<!e2e.openpgp.Key>>}
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
