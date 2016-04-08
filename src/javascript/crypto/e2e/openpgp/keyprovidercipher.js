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

/**
 *
 * @fileoverview KeyProviderCipher definition.
 *
 */
goog.provide('e2e.openpgp.KeyProviderCipher');

goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.hash.Algorithm');
goog.require('e2e.openpgp.EncryptedCipher');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.signer.Algorithm');
goog.require('goog.asserts');



/**
 * A cipher that delegates its operation to the provided callbacks. Use in place
 * of {@link e2e.openpgp.EncryptedCipher} when the key material is not
 * available.
 *
 * @param {!e2e.cipher.Algorithm|!e2e.signer.Algorithm} algorithm
 *     The implemented algorithm (type of the algorithm must match the given
 *     operation).
 * @param {function(!e2e.signer.Algorithm,!e2e.hash.Algorithm,!e2e.ByteArray):
 *     !goog.Thenable<!e2e.signer.signature.Signature>=} opt_signCallback
 * @param {function(!e2e.cipher.Algorithm,!e2e.cipher.ciphertext.CipherText):
 *     !goog.Thenable<!e2e.ByteArray>=} opt_decryptCallback Decryption callback.
 * @param {!e2e.hash.Algorithm=} opt_hashAlgorithm Hash algorithm used when
 *     signing.
 * @extends {e2e.openpgp.EncryptedCipher}
 * @constructor
 */
e2e.openpgp.KeyProviderCipher = function(algorithm, opt_signCallback,
    opt_decryptCallback, opt_hashAlgorithm) {
  this.algorithm = algorithm;
  this.signCallback_ = opt_signCallback;
  this.decryptCallback_ = opt_decryptCallback;
  this.hashAlgorithm_ = opt_hashAlgorithm;
  if (goog.isFunction(this.signCallback_)) {
    if (!(this.algorithm in e2e.signer.Algorithm)) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Invalid signing algorithm.');
    }
    if (!(this.hashAlgorithm_ in e2e.hash.Algorithm)) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Invalid hash algorithm.');
    }
  }
  if (goog.isFunction(this.decryptCallback_)) {
    if (!(this.algorithm in e2e.cipher.Algorithm)) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Invalid decryption algorithm.');
    }
  }
};
goog.inherits(e2e.openpgp.KeyProviderCipher,
    e2e.openpgp.EncryptedCipher);


/** @override */
e2e.openpgp.KeyProviderCipher.prototype.decrypt = function(data) {
  goog.asserts.assertFunction(this.decryptCallback_);
  return e2e.async.Result.toResult(undefined).addCallback(function() {
    return this.decryptCallback_(
        /** @type {!e2e.cipher.Algorithm} */ (this.algorithm),
        data);
  }, this);
};


/** @override */
e2e.openpgp.KeyProviderCipher.prototype.sign = function(data) {
  goog.asserts.assertFunction(this.signCallback_);
  return e2e.async.Result.toResult(undefined).addCallback(function() {
    return this.signCallback_(
        /** @type {!e2e.signer.Algorithm} */ (this.algorithm),
        /** @type {!e2e.hash.Algorithm} */ (this.hashAlgorithm_),
        data);
  }, this);
};


/** @override */
e2e.openpgp.KeyProviderCipher.prototype.getHashAlgorithm = function() {
  return goog.asserts.assertString(this.hashAlgorithm_);
};
