/**
 * @license
 * Copyright 2012 Google Inc. All rights reserved.
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
 * @fileoverview Provides a base class to implement Modes of Operation.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.ciphermode.CipherMode');

/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.ByteArray');
/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.cipher.ciphertext');



/**
 * Constructor for all modes of operation.
 * @param {e2e.cipher.SymmetricCipher} cipher The cipher to use.
 * @constructor
 */
e2e.ciphermode.CipherMode = function(cipher) {
  /**
   * The cipher to use in this mode of operation.
   * @type {e2e.cipher.SymmetricCipher}
   * @protected
   */
  this.cipher = cipher;
};


/**
 * Synchronous call to encrypt the data with a given iv.
 * @param {!e2e.ByteArray} data The data to encrypt.
 * @param {!e2e.ByteArray} iv The initialization vector.
 * @return {!e2e.cipher.ciphertext.Symmetric} The
 *     encrypted data.
 */
e2e.ciphermode.CipherMode.prototype.encryptSync = goog.abstractMethod;


/**
 * Synchronous call to decrypt the data with the given iv.
 * @param {!e2e.ByteArray} data The data to decrypt.
 * @param {!e2e.ByteArray} iv The initialization vector.
 * @return {!e2e.ByteArray} The decrypted data.
 */
e2e.ciphermode.CipherMode.prototype.decryptSync = goog.abstractMethod;


/**
 * Asynchronous call to encrypt the data with a given iv.
 * @param {!e2e.ByteArray} data The data to encrypt.
 * @param {!e2e.ByteArray} iv The initialization vector.
 * @return {!e2e.async.Result.<!e2e.cipher.ciphertext.Symmetric>} The
 *     encrypted data.
 */
e2e.ciphermode.CipherMode.prototype.encrypt = goog.abstractMethod;


/**
 * Asynchronous call to decrypt the data with the given iv.
 * @param {!e2e.ByteArray} data The data to decrypt.
 * @param {!e2e.ByteArray} iv The initialization vector.
 * @return {!e2e.async.Result.<!e2e.ByteArray>} The decrypted data.
 */
e2e.ciphermode.CipherMode.prototype.decrypt = goog.abstractMethod;
