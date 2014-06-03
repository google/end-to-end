// Copyright 2013 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * @fileoverview Exposes the types used for the public API.
 */


goog.provide('e2e.openpgp.ClearSignMessage');
goog.provide('e2e.openpgp.DecryptResult');
goog.provide('e2e.openpgp.EncryptOptions');
goog.provide('e2e.openpgp.EncryptSignResult');
goog.provide('e2e.openpgp.FileOptions');
goog.provide('e2e.openpgp.GenerateKeyResult');
goog.provide('e2e.openpgp.ImportKeyResult');
goog.provide('e2e.openpgp.Key');
goog.provide('e2e.openpgp.KeyInfo');
goog.provide('e2e.openpgp.KeyResult');
goog.provide('e2e.openpgp.VerifyClearSignResult');
goog.provide('e2e.openpgp.VerifyDecryptResult');
goog.provide('e2e.openpgp.VerifyResult');

goog.require('e2e.async.Result');


/**
 * File information for encrypting and decrypting files.
 * @typedef {{filename: string, creationTime: number,
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
 * @typedef {{data: e2e.ByteArray,
 *     options: !e2e.openpgp.FileOptions}}
 */
e2e.openpgp.DecryptResult;


/**
 * Result of a decrypt operation.
 * @typedef {!e2e.async.Result.<!Array.<e2e.openpgp.Key>>}
 */
e2e.openpgp.GenerateKeyResult;

/**
 * Result of an import key operation.
 * @typedef {!e2e.async.Result.<!Array.<string>>}
 */
e2e.openpgp.ImportKeyResult;


/**
 * Result of a clearsign verification operation. Verification can fail if
 *   cleartext signature has no signer key ID information, keyring has no such
 *   key or the message was tampered with.
 * @typedef {!e2e.async.Result.<boolean>}
 */
e2e.openpgp.VerifyClearSignResult;


/**
 * Result of a verification operation. Includes keys that successfully verified
 * a signature, keys for which signature verification failed (indicating
 * message tampering). Signatures for which keys could not be found are not
 * included in VerifyResults.
 * @typedef {{
 *   success: !Array.<!e2e.openpgp.Key>,
 *   failure: !Array.<!e2e.openpgp.Key>
 * }}
 */
e2e.openpgp.VerifyResult;


/**
 * Result of a verification and decryption operation.
 * @typedef {!e2e.async.Result.<{
 *    decrypt: !e2e.openpgp.DecryptResult,
 *    verify: ?e2e.openpgp.VerifyResult
 * }>}
 */
e2e.openpgp.VerifyDecryptResult;


/**
 * The result of the encryption and signing operation.
 * @typedef {!e2e.async.Result.<e2e.ByteArray>}
 */
e2e.openpgp.EncryptSignResult;


/**
 * The result of a key search operation.
 * @typedef {!e2e.async.Result.<!Array.<e2e.openpgp.Key>>}
 */
e2e.openpgp.KeyResult;

/**
 * Key information.
 * @typedef {{fingerprint: e2e.ByteArray, secret: boolean,
 *     algorithm: string}}
 */
e2e.openpgp.KeyInfo;


/**
 * Key object.
 * @typedef {{subKeys: !Array.<e2e.openpgp.KeyInfo>, uids: !Array.<string>,
 *     key: e2e.openpgp.KeyInfo, serialized: e2e.ByteArray}}
 */
e2e.openpgp.Key;


/**
 * Armored OpenPGP message.
 * @typedef {{data: e2e.ByteArray, charset: (string|undefined)}}
 */
e2e.openpgp.ArmoredMessage;


/**
 * Clear sign message.
 * @typedef {{body: string, signature: e2e.ByteArray, hash: string}}
 */
e2e.openpgp.ClearSignMessage;
