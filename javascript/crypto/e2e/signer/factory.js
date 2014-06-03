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
 * @fileoverview Registers and returns implementations of specific digital
 *     signature algorithms.
 * @author thaidn@google.com (Thai Duong)
 */

goog.provide('e2e.signer.factory');

goog.require('e2e.signer.Error');


/**
 * Contains a list of all registered implementations for each algorithm.
 * @type {!Object.<e2e.signer.Algorithm,
 *     function(new:e2e.signer.Signer, ...)>}
 * @private
 */
e2e.signer.factory.signers_ = {};


/**
 * Registers a class for a specific algorithm.
 * @param {function(new:e2e.signer.Signer,
 *     e2e.signer.Algorithm, e2e.signer.key.Key=)} signer The
 *     implementation.
 * @param {e2e.signer.Algorithm=} opt_algorithm The name to register
 *     the signer to if different from the signer's prototype algorithm.
 */
e2e.signer.factory.add = function(signer, opt_algorithm) {
  var algorithm = opt_algorithm || signer.prototype.algorithm;
  e2e.signer.factory.signers_[algorithm] = signer;
};


/**
 * Returns whether the algorithm is present in the factory.
 * @param {e2e.signer.Algorithm} algorithm The signing algorithm.
 * @return {boolean} Whether the algorithm is present in the factory.
 */
e2e.signer.factory.has = function(algorithm) {
  return e2e.signer.factory.signers_.hasOwnProperty(algorithm);
};


/**
 * Returns an instance of the required digital signature algorithm, or null if
 *     not available.
 * @param {e2e.signer.Algorithm} algorithm The signing algorithm.
 * @param {e2e.cipher.key.Key=} opt_keyData The key to use (public or
 *     private).
 * @return {e2e.signer.Signer?} The signer instance requested or null.
 */
e2e.signer.factory.get = function(algorithm, opt_keyData) {
  if (e2e.signer.factory.signers_.hasOwnProperty(algorithm)) {
    var constructor = e2e.signer.factory.signers_[algorithm];
    return new constructor(algorithm, opt_keyData);
  } else {
    return null;
  }
};


/**
 * Returns an instance of the required digital signature algorithm, or throws
 *     if not available.
 * @param {e2e.signer.Algorithm} algorithm The signing algorithm.
 * @param {e2e.cipher.key.Key=} opt_keyData The key to use (public or
 *     private).
 * @return {!e2e.signer.Signer} The signer instance requested.
 */
e2e.signer.factory.require = function(algorithm, opt_keyData) {
  var ret = e2e.signer.factory.get(algorithm, opt_keyData);
  if (goog.isNull(ret)) {
    throw new e2e.signer.Error('Required algorithm not available.');
  }
  return ret;
};
