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
 * @fileoverview Registers and returns implementations of specific algorithms.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.hash.factory');

goog.require('e2e.hash.Error');


/**
 * Contains a list of all registered implementations for each algorithm.
 * @type {!Object.<e2e.hash.Algorithm,
 *     function(new:e2e.hash.Hash, ...)>}
 * @private
 */
e2e.hash.factory.hashes_ = {};


/**
 * Registers a class for a specific algorithm.
 * @param {function(new:e2e.hash.Hash, ...*)} hash The constructor of
 *     the cipher.
 * @param {e2e.hash.Algorithm=} opt_algorithm The algorithm to register
 *     it to, if different from the prototype name.
 */
e2e.hash.factory.add = function(hash, opt_algorithm) {
  var algorithm = opt_algorithm || hash.prototype.algorithm;
  e2e.hash.factory.hashes_[algorithm] = hash;
};


/**
 * Returns an instance of the required hash algorithm, or null if not available.
 * @param {e2e.hash.Algorithm} algorithm The hash algorithm.
 * @return {e2e.hash.Hash?} The hash instance requested or null.
 */
e2e.hash.factory.get = function(algorithm) {
  if (e2e.hash.factory.hashes_.hasOwnProperty(algorithm)) {
    var constructor = e2e.hash.factory.hashes_[algorithm];
    return new constructor;
  } else {
    return null;
  }
};


/**
 * Returns all available hash algorithms.
 * @return {!Array.<e2e.hash.Algorithm>} Array of available algorithms.
 */
e2e.hash.factory.getAvailable = function() {
  return Object.keys(e2e.hash.factory.hashes_);
};


/**
 * Returns an instance of the required hash algorithm, or throws if not
 * available.
 * @param {e2e.hash.Algorithm} algorithm The hash algorithm.
 * @return {!e2e.hash.Hash} The hash instance requested.
 */
e2e.hash.factory.require = function(algorithm) {
  var ret = e2e.hash.factory.get(algorithm);
  if (goog.isNull(ret)) {
    throw new e2e.hash.Error('Required algorithm not available.');
  }
  return ret;
};
