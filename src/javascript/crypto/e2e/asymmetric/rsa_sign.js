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
 * sign/verify operations.
 */

goog.provide('e2e.signer.RsaSign');

goog.require('e2e.cipher.Rsa');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.Error');
goog.require('e2e.signer.Signer');
goog.require('e2e.signer.factory');
goog.require('goog.asserts');



/**
 * Representation of an RSA public and/or private key, but
 * restricted to signing operations.
 * @param {e2e.signer.Algorithm} algorithm The algorithm to retrieve.
 * @param {e2e.signer.key.Key=} opt_key The public or private key.
 * @constructor
 * @implements {e2e.signer.Signer}
 * @extends {e2e.cipher.Rsa}
 */
e2e.signer.RsaSign = function(algorithm, opt_key) {
  goog.asserts.assert(algorithm == e2e.signer.Algorithm.RSA_SIGN,
      'Algorithm should be RSA_SIGN.');
  goog.base(this, algorithm, opt_key);
};
goog.inherits(e2e.signer.RsaSign, e2e.cipher.Rsa);


/** @override */
e2e.signer.RsaSign.prototype.encrypt = function(data) {
  throw new e2e.signer.Error('Cannot encrypt with this key.');
};


/** @override */
e2e.signer.RsaSign.prototype.decrypt = function(data) {
  throw new e2e.signer.Error('Cannot decrypt with this key.');
};


e2e.signer.factory.add(e2e.signer.RsaSign, e2e.signer.Algorithm.RSA_SIGN);
