// Copyright 2012 Google Inc. All Rights Reserved.
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
 * @fileoverview Provides a base class to implement ciphers on top.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.cipher');
goog.provide('e2e.cipher.AsymmetricCipher');
goog.provide('e2e.cipher.Cipher');
goog.provide('e2e.cipher.Error');
goog.provide('e2e.cipher.SymmetricCipher');

goog.require('e2e.Algorithm');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.ciphertext.CipherText');
goog.require('goog.debug.Error');
goog.require('goog.object');


/**
 * Error class used to represent errors in the ciphers.
 * @param {*=} opt_msg Optional message to send.
 * @extends {goog.debug.Error}
 * @constructor
 */
e2e.cipher.Error = function(opt_msg) {
  goog.base(this, opt_msg);
};
goog.inherits(e2e.cipher.Error, goog.debug.Error);



/**
 * @interface
 * @extends {e2e.Algorithm}
 */
e2e.cipher.Cipher = function() {};


/**
 * Representation of a symmetric cipher.
 * @interface
 * @extends {e2e.cipher.Cipher}
 */
e2e.cipher.SymmetricCipher = function() {};


/**
 * The block size for this cipher in bytes.
 * @type {number}
 */
e2e.cipher.SymmetricCipher.prototype.blockSize;


/**
 * Encrypts the given data using the current cipher and key.
 * @param {e2e.ByteArray} data The data to encrypt.
 * @return {!e2e.async.Result.<e2e.cipher.ciphertext.Symmetric>}
 *     The result of encryption.
 */
e2e.cipher.SymmetricCipher.prototype.encrypt = goog.abstractMethod;


/**
 * Decrypts the given data using the current cipher and key.
 * @param {e2e.cipher.ciphertext.Symmetric} data The encrypted data.
 * @return {!e2e.async.Result.<e2e.ByteArray>} The result of
 *     decryption.
 */
e2e.cipher.SymmetricCipher.prototype.decrypt = goog.abstractMethod;


/**
 * Representation of an asymmetric cipher.
 * @interface
 * @extends {e2e.cipher.Cipher}
 */
e2e.cipher.AsymmetricCipher = function() {};


/**
 * Encrypts the given data using the current cipher and key.
 * @param {e2e.ByteArray} data The data to encrypt.
 * @return {e2e.cipher.ciphertext.AsymmetricAsync}
 *     The result of encryption.
 */
e2e.cipher.AsymmetricCipher.prototype.encrypt = goog.abstractMethod;


/**
 * Decrypts the given data using the current cipher and key.
 * @param {e2e.cipher.ciphertext.Asymmetric} data The encrypted
 *     data.
 * @return {!e2e.async.Result.<e2e.ByteArray>} The result of
 *     decryption.
 */
e2e.cipher.AsymmetricCipher.prototype.decrypt = goog.abstractMethod;
