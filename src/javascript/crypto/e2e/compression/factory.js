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
 * @fileoverview Registers and returns implementations of specific algorithms.
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.compression.factory');

goog.require('e2e.compression.Error');


/**
 * Contains a list of all registered implementations for each algorithm.
 * @type {!Object.<e2e.compression.Algorithm,
 *     function(new:e2e.compression.Compression, ...)>}
 * @private
 */
e2e.compression.factory.compressionAlgorithms_ = {};


/**
 * Registers a class for a specific algorithm.
 * @param {function(new:e2e.compression.Compression, ...*)}
 *    compression The constructor of the cipher.
 * @param {e2e.compression.Algorithm=} opt_algorithm The algorithm to
 *     register it to, if different from the prototype name.
 */
e2e.compression.factory.add = function(compression, opt_algorithm) {
  var algorithm = opt_algorithm || compression.prototype.algorithm;
  e2e.compression.factory.compressionAlgorithms_[algorithm] =
      compression;
};


/**
 * Returns an instance of the required compression algorithm, or null if not
 *     available.
 * @param {e2e.compression.Algorithm} algorithm The compression
 *     algorithm.
 * @return {e2e.compression.Compression?} The compression instance
 *     requested or null.
 */
e2e.compression.factory.get = function(algorithm) {
  if (e2e.compression.factory.compressionAlgorithms_.hasOwnProperty(
      algorithm)) {
    var constructor =
        e2e.compression.factory.compressionAlgorithms_[algorithm];
    return new constructor;
  } else {
    return null;
  }
};


/**
 * Returns all available compression algorithms.
 * @return {!Array.<e2e.compression.Algorithm>} Array of available algorithms.
 */
e2e.compression.factory.getAvailable = function() {
  return Object.keys(e2e.compression.factory.compressionAlgorithms_);
};


/**
 * Returns an instance of the required compression algorithm, or throws if not
 *     available.
 * @param {e2e.compression.Algorithm} algorithm The compression
 *     algorithm.
 * @return {!e2e.compression.Compression} The compression instance
 *     requested.
 */
e2e.compression.factory.require = function(algorithm) {
  var ret = e2e.compression.factory.get(algorithm);
  if (goog.isNull(ret)) {
    throw new e2e.compression.Error(
        'Required algorithm not available.');
  }
  return ret;
};
