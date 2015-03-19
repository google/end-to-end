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
 * @fileoverview Implementation of bzip2.
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.compression.Bzip2');

goog.require('e2e.compression.Algorithm');
goog.require('e2e.compression.Compression');



/**
 * Bzip2 implementation.
 * @extends {e2e.compression.Compression}
 * @constructor
 */
e2e.compression.Bzip2 = function() {
  goog.base(this, e2e.compression.Algorithm.BZIP2);
};
goog.inherits(e2e.compression.Bzip2,
    e2e.compression.Compression);


/** @inheritDoc */
e2e.compression.Bzip2.prototype.decompress = function(compressedData) {
  throw new Error('bzip2 decompression not implemented.');
};


/** @inheritDoc */
e2e.compression.Bzip2.prototype.compress = function(data) {
  throw new Error('bzip2 compression not implemented.');
};



/**
 * Reads a ByteArray bit by bit.
 * @param {!e2e.ByteArray} data Input to read bits from.
 * @private
 * @constructor
 */
e2e.compression.Bzip2.Bits_ = function(data) {
  /**
   * @private
   * @type {!e2e.ByteArray}
   */
  this.data_ = data;

  /**
   * Offset in bits into the data ByteArray.
   * @private
   * @type {number}
   */
  this.offset_ = 0;
};


/**
 * @param {number} bits Number of bits to read, between 1 and 32 inclusive.
 * @return {number} Bits stored in a number.
 */
e2e.compression.Bzip2.Bits_.prototype.read = function(bits) {
  if (bits < 1 || bits > 32 || this.offset_ + bits > this.data_.length * 8) {
    throw new RangeError('invalid number of bits to read from data array');
  }
  var byte_offset = this.offset_ >>> 3;
  var bit_offset = this.offset_ % 8;
  this.offset_ += bits;

  var result = 0;
  while (bits > 0) {
    var bits_read_count = Math.min(8 - bit_offset, bits);
    result <<= bits_read_count;
    result |= this.data_[byte_offset] >>> (8 - bits_read_count);

    byte_offset++;
    bit_offset = 0;
    bits -= bits_read_count;
  }

  return result;
};

// TODO(adhintz) Uncomment after bzip2 is implemented.
// e2e.compression.factory.add(e2e.compression.Bzip2,
//    e2e.compression.Algorithm.BZIP2);
