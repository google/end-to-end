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
 * @fileoverview Extension of textbook RSA cipher, but restricted to
 * encryption/decryption operations.
 */

goog.provide('e2e.cipher.RsaEncrypt');

goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.AsymmetricCipher');
goog.require('e2e.cipher.Error');
goog.require('e2e.cipher.Rsa');
goog.require('e2e.cipher.factory');
goog.require('goog.asserts');



/**
 * Representation of an RSA public and/or private key, but
 * restricted to cipher operations.
 * @param {e2e.cipher.Algorithm} algorithm The algorithm to retrieve.
 * @param {e2e.cipher.key.Key=} opt_key The public or private key.
 * @constructor
 * @implements {e2e.cipher.AsymmetricCipher}
 * @extends {e2e.cipher.Rsa}
 */
e2e.cipher.RsaEncrypt = function(algorithm, opt_key) {
  goog.asserts.assert(algorithm == e2e.cipher.Algorithm.RSA_ENCRYPT,
      'Algorithm should be RSA_ENCRYPT.');
  goog.base(this, algorithm, opt_key);
};
goog.inherits(e2e.cipher.RsaEncrypt, e2e.cipher.Rsa);


/** @override */
e2e.cipher.RsaEncrypt.prototype.sign = function(data) {
  throw new e2e.cipher.Error('Cannot sign with this key.');
};


/** @override */
e2e.cipher.RsaEncrypt.prototype.verify = function(data, sig) {
  throw new e2e.cipher.Error('Cannot verify with this key.');
};


e2e.cipher.factory.add(e2e.cipher.RsaEncrypt, e2e.cipher.Algorithm.RSA_ENCRYPT);
