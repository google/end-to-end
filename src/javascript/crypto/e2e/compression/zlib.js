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
 * @fileoverview Wraps the original ZLIB implementation to conform to e2e.
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.compression.Zlib');

goog.require('Zlib');
goog.require('Zlib.Deflate');
goog.require('Zlib.Inflate');
goog.require('e2e.async.Result');
goog.require('e2e.compression.Algorithm');
goog.require('e2e.compression.Compression');
goog.require('e2e.compression.factory');
goog.require('goog.array');



/**
 * Wrapper around the external zlib implementation.
 * @extends {e2e.compression.Compression}
 * @constructor
 */
e2e.compression.Zlib = function() {
  goog.base(this, e2e.compression.Algorithm.ZLIB);
};
goog.inherits(e2e.compression.Zlib,
    e2e.compression.Compression);


/** @inheritDoc */
e2e.compression.Zlib.prototype.decompress = function(compressedData) {
  var data = (new Zlib.Inflate(compressedData)).decompress();
  data = goog.array.clone(data);
  return e2e.async.Result.toResult(data);
};


/** @inheritDoc */
e2e.compression.Zlib.prototype.compress = function(data) {
  var compressedData = (new Zlib.Deflate(data)).compress();
  compressedData = goog.array.clone(compressedData);
  return e2e.async.Result.toResult(compressedData);
};


e2e.compression.factory.add(e2e.compression.Zlib,
    e2e.compression.Algorithm.ZLIB);
