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
 * @fileoverview Wraps the original deflate implementation to conform to e2e.
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.compression.Zip');

goog.require('Zlib.RawDeflate');
goog.require('Zlib.RawInflate');
goog.require('e2e.async.Result');
goog.require('e2e.compression.Algorithm');
goog.require('e2e.compression.Compression');
goog.require('e2e.compression.factory');
goog.require('goog.array');



/**
 * Wrapper around the external zip raw deflate implementation.
 * @extends {e2e.compression.Compression}
 * @constructor
 */
e2e.compression.Zip = function() {
  goog.base(this, e2e.compression.Algorithm.ZIP);
};
goog.inherits(e2e.compression.Zip,
    e2e.compression.Compression);


/** @inheritDoc */
e2e.compression.Zip.prototype.decompress = function(compressedData) {
  var data = (new Zlib.RawInflate(compressedData, null)).decompress();
  data = goog.array.clone(data);
  return e2e.async.Result.toResult(data);
};


/** @inheritDoc */
e2e.compression.Zip.prototype.compress = function(data) {
  var compressedData = (new Zlib.RawDeflate(data)).compress();
  compressedData = goog.array.clone(compressedData);
  return e2e.async.Result.toResult(compressedData);
};


e2e.compression.factory.add(e2e.compression.Zip,
    e2e.compression.Algorithm.ZIP);
