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
 * @fileoverview Provides a base class to implement ciphers on top. Registers
 *     and returns implementations of specific algorithms.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.cipher.Algorithm');
goog.provide('e2e.cipher.AsymmetricCipher');
goog.provide('e2e.cipher.Cipher');
goog.provide('e2e.cipher.Error');
goog.provide('e2e.cipher.SymmetricCipher');
goog.provide('e2e.cipher.factory');

goog.require('e2e.Algorithm');
/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.ByteArray');
/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.cipher.ciphertext');
goog.require('goog.debug.Error');


/**
 * Algorithms (used to define which algorithm is defined).
 * @enum {string}
 */
e2e.cipher.Algorithm = {
  // Symmetric Ciphers
  'PLAINTEXT': 'PLAINTEXT',
  'IDEA': 'IDEA',
  'TRIPLE_DES': 'TRIPLE_DES',
  'CAST5': 'CAST5',
  'BLOWFISH': 'BLOWFISH',
  'AES128': 'AES128',
  'AES192': 'AES192',
  'AES256': 'AES256',
  'TWOFISH': 'TWOFISH',
  // Asymmetric Ciphers
  'RSA': 'RSA',
  'RSA_ENCRYPT': 'RSA_ENCRYPT',
  'ELGAMAL': 'ELGAMAL',
  'ECDH': 'ECDH'
};



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
 * @param {!e2e.ByteArray} data The data to encrypt.
 * @return {!e2e.async.Result.<!e2e.cipher.ciphertext.Symmetric>}
 *     The result of encryption.
 */
e2e.cipher.SymmetricCipher.prototype.encrypt = goog.abstractMethod;


/**
 * @type {number} The cipher block size.
 */
e2e.cipher.SymmetricCipher.prototype.blockSize;


/**
 * Decrypts the given data using the current cipher and key.
 * @param {!e2e.cipher.ciphertext.Symmetric} data The encrypted data.
 * @return {!e2e.async.Result.<!e2e.ByteArray>} The result of
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
 * @param {!e2e.ByteArray} data The data to encrypt.
 * @return {!e2e.cipher.ciphertext.AsymmetricAsync}
 *     The result of encryption.
 */
e2e.cipher.AsymmetricCipher.prototype.encrypt = goog.abstractMethod;


/**
 * Decrypts the given data using the current cipher and key.
 * @param {!e2e.cipher.ciphertext.Asymmetric} data The encrypted
 *     data.
 * @return {!e2e.async.Result.<!e2e.ByteArray>} The result of
 *     decryption.
 */
e2e.cipher.AsymmetricCipher.prototype.decrypt = goog.abstractMethod;


/**
 * @define {string} List of ciphers to register asynchronously.
 */
e2e.cipher.factory.WORKER_CIPHERS = '';


/**
 * Initializes cipher factory.
 */
e2e.cipher.factory.init = function() {};


/**
 * Contains a list of all registered implementations for each algorithm.
 * @type {!Object.<e2e.cipher.Algorithm,
 *     function(new:e2e.Algorithm, !e2e.cipher.Algorithm,
 *     e2e.cipher.key.Key=)>}
 * @private
 */
e2e.cipher.factory.ciphers_ = {};


/**
 * Registers a class for a specific algorithm.
 * @param {function(new:e2e.Algorithm, !e2e.cipher.Algorithm,
 *     e2e.cipher.key.Key=)} cipher The implementation.
 * @param {e2e.cipher.Algorithm=} opt_algorithm The name to register
 *     the cipher to if different from the cipher's prototype algorithm.
 */
e2e.cipher.factory.add = function(cipher, opt_algorithm) {
  var algorithm = opt_algorithm || cipher.prototype.algorithm;
  var current = e2e.cipher.factory.ciphers_[algorithm];
  if (!goog.isDef(current)) {
    e2e.cipher.factory.ciphers_[algorithm] = cipher;
  }
};


/**
 * Returns whether the algorithm is present in the factory.
 * @param {!e2e.cipher.Algorithm} algorithm The cipher algorithm.
 * @return {boolean} Whether the algorithm is present in the factory.
 */
e2e.cipher.factory.has = function(algorithm) {
  return e2e.cipher.factory.ciphers_.hasOwnProperty(algorithm);
};


/**
 * Returns an instance of the required cipher, or null if not available.
 * @param {!e2e.cipher.Algorithm} algorithm The algorithm to retrieve.
 * @param {e2e.cipher.key.Key=} opt_keyData The key to use (public or
 *     private).
 * @return {?e2e.cipher.Cipher} The cipher instance requested.
 */
e2e.cipher.factory.get = function(algorithm, opt_keyData) {
  if (e2e.cipher.factory.ciphers_.hasOwnProperty(algorithm)) {
    var constructor = e2e.cipher.factory.ciphers_[algorithm];
    return /** @type {e2e.cipher.Cipher}*/ (
        new constructor(algorithm, opt_keyData));
  } else {
    return null;
  }
};


/**
 * Returns all available cipher algorithms.
 * @return {!Array.<e2e.cipher.Algorithm>} Array of available algorithms.
 */
e2e.cipher.factory.getAvailable = function() {
  return Object.keys(e2e.cipher.factory.ciphers_);
};


/**
 * Returns an instance of the required cipher, or throws if not available.
 * @param {!e2e.cipher.Algorithm} algorithm The algorithm to retrieve.
 * @param {e2e.cipher.key.Key=} opt_keyData The key to use (public or
 *     private).
 * @return {!e2e.cipher.Cipher} The cipher instance requested.
 */
e2e.cipher.factory.require = function(algorithm, opt_keyData) {
  var ret = e2e.cipher.factory.get(algorithm, opt_keyData);
  if (goog.isNull(ret)) {
    throw new e2e.cipher.Error('Required algorithm not available: ' +
        algorithm);
  }
  return ret;
};

e2e.cipher.factory.init();
