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
 * @fileoverview Registers and returns implementations of specific algorithms.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.cipher.factory');

goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.Error');
goog.require('e2e.cipher.WorkerCipher');



/**
 * @define {string} List of ciphers to register asynchronously.
 */
e2e.cipher.factory.WORKER_CIPHERS = '';


/**
 * Initializes cipher factory.
 */
e2e.cipher.factory.init = function() {
  var ciphers = e2e.cipher.factory.WORKER_CIPHERS.split(',');
  for (var i = 0; i < ciphers.length; i++) {
    if (e2e.cipher.Algorithm.hasOwnProperty(ciphers[i])) {
      e2e.cipher.factory.add(e2e.cipher.WorkerCipher,
                                     e2e.cipher.Algorithm[ciphers[i]]);
    }
  }
};

/**
 * Contains a list of all registered implementations for each algorithm.
 * @type {!Object.<e2e.cipher.Algorithm,
 *     function(new:e2e.Algorithm, e2e.cipher.Algorithm,
 *     e2e.cipher.key.Key=)>}
 * @private
 */
e2e.cipher.factory.ciphers_ = {};


/**
 * Registers a class for a specific algorithm.
 * @param {function(new:e2e.Algorithm, e2e.cipher.Algorithm,
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
 * @param {e2e.cipher.Algorithm} algorithm The cipher algorithm.
 * @return {boolean} Whether the algorithm is present in the factory.
 */
e2e.cipher.factory.has = function(algorithm) {
  return e2e.cipher.factory.ciphers_.hasOwnProperty(algorithm);
};


/**
 * Returns an instance of the required cipher, or null if not available.
 * @param {e2e.cipher.Algorithm} algorithm The algorithm to retrieve.
 * @param {e2e.cipher.key.Key=} opt_keyData The key to use (public or
 *     private).
 * @return {e2e.cipher.Cipher?} The cipher instance requested.
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
 * Returns an instance of the required cipher, or throws if not available.
 * @param {e2e.cipher.Algorithm} algorithm The algorithm to retrieve.
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
