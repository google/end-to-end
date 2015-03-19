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
 * @fileoverview Provides a base class for implementing compression algorithms.
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.compression.Algorithm');
goog.provide('e2e.compression.Compression');
goog.provide('e2e.compression.Error');

goog.require('goog.debug.Error');



/**
 * Error class used to represent errors in the compression algorithms.
 * @param {*=} opt_msg Optional message to send.
 * @extends {goog.debug.Error}
 * @constructor
 */
e2e.compression.Error = function(opt_msg) {
  goog.base(this, opt_msg);
};
goog.inherits(e2e.compression.Error, goog.debug.Error);


/**
 * List of Compression algorithms that can be implemented.
 * @enum {string}
 */
e2e.compression.Algorithm = {
  'UNCOMPRESSED': 'UNCOMPRESSED',
  'ZIP': 'ZIP',
  'ZLIB': 'ZLIB',
  'BZIP2': 'BZIP2'
};



/**
 * Constructor for all compression algorithms.
 * @param {!e2e.compression.Algorithm} algorithm The algorithm being
 *     implemented.
 * @constructor
 */
e2e.compression.Compression = function(algorithm) {
  this.algorithm = algorithm;
};


/**
 * The implemented algorithm.
 * @type {!e2e.compression.Algorithm}
 */
e2e.compression.Compression.prototype.algorithm;


/**
 * Compresses the given data.
 * @param {!e2e.ByteArray} data The data to compress.
 * @return {!e2e.async.Result} The compressed data.
 */
e2e.compression.Compression.prototype.compress = goog.abstractMethod;


/**
 * Decompresses the given data.
 * @param {!e2e.ByteArray} compressedData The data to decompress.
 * @return {!e2e.async.Result} The decompressed data.
 */
e2e.compression.Compression.prototype.decompress = goog.abstractMethod;
