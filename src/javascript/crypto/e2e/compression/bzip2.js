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
 * @fileoverview Implementation of bzip2 decompression.
 * There is no official standard for bzip2. For reference, please see
 * https://github.com/golang/go/tree/master/src/compress/bzip2
 * and https://en.wikipedia.org/wiki/Bzip2
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.compression.Bzip2');

goog.require('e2e.async.Result');
goog.require('e2e.compression.Algorithm');
goog.require('e2e.compression.Compression');
goog.require('e2e.compression.Error');
goog.require('e2e.compression.factory');

goog.require('goog.array');



/**
 * Bzip2 implementation.
 * @extends {e2e.compression.Compression}
 * @constructor
 */
e2e.compression.Bzip2 = function() {
  goog.base(this, e2e.compression.Algorithm.BZIP2);

  /**
   * Block size of uncompressed data.
   * @private
   * @type {number}
   */
  this.blockSize_;
};
goog.inherits(e2e.compression.Bzip2,
    e2e.compression.Compression);


/** @inheritDoc */
e2e.compression.Bzip2.prototype.decompress = function(compressedData) {
  var bits = new e2e.compression.Bzip2.Bits_(compressedData);
  this.headerStream_(bits);

  var results = [];
  var blockMagic = bits.read(48);
  while (blockMagic == 0x314159265359) {  // compressed block magic bytes.
    results.push(this.readBlock_(bits));
    blockMagic = bits.read(48);
  }
  if (blockMagic != 0x177245385090) {  // end of stream magic bytes.
    throw new e2e.compression.Error('bad bzip2 block magic bytes.');
  }
  var crc = bits.read(32);  // crc for whole stream.
  // TODO(adhintz) Verify checksum for whole stream.

  // TODO(adhintz) Read concatenated bzip2 streams, such as at
  // https://github.com/kjn/lbzip2/blob/master/tests/concat.bz2

  var data = goog.array.flatten(results);
  return e2e.async.Result.toResult(data);
};


/**
 * Removes and verifies the stream header, sets block size.
 * @private
 * @param {e2e.compression.Bzip2.Bits_} bits Bit stream object.
 */
e2e.compression.Bzip2.prototype.headerStream_ = function(bits) {
  var header = bits.read(24);
  if (header != 4348520) {  // 'BZh' == 66*256*256+90*256+104
    throw new e2e.compression.Error(
        'not a bzip2 stream. Bad magic bytes and/or version.');
  }
  var hundredKBlockSize = bits.read(8) - 0x30;  // '1' == (0x31)
  if (hundredKBlockSize < 1 || hundredKBlockSize > 9) {
    throw new e2e.compression.Error('bad bzip2 block size.');
  }
  this.blockSize_ = hundredKBlockSize * 100 * 1000;
};


/**
 * Reads and decompresses block with magic bytes already removed.
 * @private
 * @param {e2e.compression.Bzip2.Bits_} bits Bit stream object.
 * @return {!e2e.ByteArray} The decompressed data from this block.
 */
e2e.compression.Bzip2.prototype.readBlock_ = function(bits) {
  // Magic bytes already removed.
  var crc = bits.read(32);
  // TODO(adhintz) Verify crc for this block;
  var randomised = bits.read(1);
  if (randomised != 0) {
    throw new e2e.compression.Error(
        'unsupported bzip2 block randomised value.');
  }
  var origPtr = bits.read(24);  // starting point into BWT for after untransform
  if (origPtr > this.blockSize_) {
    throw new e2e.compression.Error('bad bzip2 starting pointer for block.');
  }
  // bitmap, of ranges of 16 bytes, present/not present:
  var usedMap = bits.read(16);
  var symbolTable = new Uint8Array(256);
  var numSymbols = 0;
  for (var i = 0; i < 16; i++) {
    if (usedMap & (0x8000 >> i)) {
      var highNibble = i << 4;
      // bitmap, of symbols used, present/not present (multiples of 16):
      var usedBitMap = bits.read(16);
      for (var j = 0; j < 16; j++) {
        if (usedBitMap & (0x8000 >> j)) {
          symbolTable[numSymbols] = highNibble + j;
          numSymbols++;
        }
      }
    }
  }

  // 2..6 number of different Huffman tables in use:
  var numHuffmanTrees = bits.read(3);
  if (numHuffmanTrees < 2 || numHuffmanTrees > 6) {
    throw new e2e.compression.Error('bzip2 bad number of Huffman tables.');
  }

  // Number of times that the Huffman tables are swapped (each 50 bytes):
  var numSelectors = bits.read(15);

  var huffTable = new Uint8Array(256);  // AKA mtfTreeDecoder
  for (var i = 0; i < numHuffmanTrees; i++) {
    huffTable[i] = i;
  }
  var treeIndexes = new Uint8Array(numSelectors);

  // *.selector_list:1..6
  // zero-terminated bit runs (0..62) of MTF'ed Huffman table (*selectors_used)
  for (var i = 0; i < numSelectors; i++) {
    var value = bits.read(1);
    var index = 0;
    while (value == 1) {
      index++;
      value = bits.read(1);
    }
    treeIndexes[i] = huffTable[index];
    // move huffTable[index] to front
    for (var gap = index; gap > 0; gap--) {
      huffTable[gap] = huffTable[gap - 1];
    }
    huffTable[0] = treeIndexes[i];
  }

  numSymbols += 2;  // + 2 for RUNA and RUNB symbols.
  var huffmanTrees = []; // up to numHuffmanTrees
  for (var i = 0; i < numHuffmanTrees; i++) {
    var lengths = new Uint8Array(numSymbols);
    var length = bits.read(5);  // 0..20 starting bit length for Huffman deltas
    var lengthIndex = 0;
    // *.delta_bit_length:1..40 = 0=>next symbol; 1=>alter length
    //                               { 1=>decrement length;  0=>increment length
    while (lengthIndex < numSymbols) {
      if (bits.read(1) == 0) {
        // save length and go to next symbol
        if (length < 1 || length > 20) {
          throw new e2e.compression.Error('Huffman code length out of range.');
        }
        lengths[lengthIndex] = length;
        lengthIndex++;
      } else {
        if (bits.read(1) == 0) {
          length++;
        } else {
          length--;
        }
      }
    }

    huffmanTrees[i] = new e2e.compression.Bzip2.Huffman_(lengths);
  }

  var selectorIndex = 0;
  var currentHuffmanTree = huffmanTrees[treeIndexes[selectorIndex]];
  var repeat = 0;
  var repeatPower = 0;
  var decoded = 0;
  var decodedData = [];  // Also referred to as T[T[...]]
  while (true) {  // breaks on EOF symbol
    if (decoded == 50) {
      decoded = 0;
      selectorIndex++;
      if (selectorIndex >= treeIndexes.length) {
        throw new e2e.compression.Error('not enough huffman trees');
      }
      currentHuffmanTree = huffmanTrees[treeIndexes[selectorIndex]];
    }

    var v = currentHuffmanTree.decode(bits);  // correct bits passing?
    decoded++;

    if (v < 2) {  // RUN symbol.
      if (repeat == 0) {  // New run-length encoding, so start at 2**0.
        repeatPower = 1;
      }
      if (v == 0) {  // RUNA
        repeat += repeatPower;
      } else if (v == 1) {  // RUNB
        repeat += repeatPower * 2;
      }
      repeatPower <<= 1;
      continue; // Loop until we've read all of the RUN symbols.
    }

    if (repeat > 0) {
      if (repeat + decodedData.length > this.blockSize_) {
        throw new e2e.compression.Error('repeat is too large for block size.');
      }
      for (var i = 0; i < repeat; i++) {
        decodedData.push(decodedData[decodedData.length - 1]);
      }
      repeat = 0;
    }

    if (v == numSymbols - 1) {  // EOF symbol.
      break;
    }

    decodedData.push(symbolTable[v - 1]);
    var index = v - 1;
    var temp = symbolTable[index];
    // TODO(adhintz) Extract move-to-front (MTF) code into a common function.
    // move symbolTable[index] to front.
    for (var gap = index; gap > 0; gap--) {
      symbolTable[gap] = symbolTable[gap - 1];
    }
    symbolTable[0] = temp;
  }

  // Now do inverse BWT.
  var sum = 0;
  var c = new Uint32Array(256);  // Initialized with zero.
  for (var i = 0; i < decodedData.length; i++) {
    c[decodedData[i]]++;
  }
  for (var i = 0; i < 256; i++) {
    sum += c[i];
    c[i] = sum - c[i];
  }
  for (var i = 0; i < decodedData.length; i++) {
    var b = decodedData[i] & 0xff;
    decodedData[c[b]] |= (i << 8);
    c[b]++;
  }
  var tPos = decodedData[origPtr] >>> 8;  // first byte index

  // Now do RLE decoding.
  // 4 equal bytes followed by 1 byte that's the number of repeats.
  var lastByte = -1;
  var byteRepeats = 0;
  var finalData = [];
  for (var i = 0; i < decodedData.length; i++) {
    tPos = decodedData[tPos];
    var b = tPos & 0xff;
    tPos >>>= 8;

    if (byteRepeats == 3) {  // Hit the 4 equal bytes, so repeating time.
      for (var j = 0; j < b; j++) {
        finalData.push(lastByte);
      }
      byteRepeats = 0;
      lastByte = -1;
      continue;
    }

    if (lastByte == b) {
      byteRepeats++;
    } else {
      byteRepeats = 0;
    }

    finalData.push(b);
    lastByte = b;
  }

  return finalData;
};


/** @inheritDoc */
e2e.compression.Bzip2.prototype.compress = function(data) {
  throw new e2e.compression.Error('bzip2 compression not implemented.');
};



/**
 * Huffman tree.
 * @param {Uint8Array} lengths Array of code length for each symbol.
 * @private
 * @constructor
 */
e2e.compression.Bzip2.Huffman_ = function(lengths) {
  /**
   * Nodes in the tree. Each node is {left, right, leftValue, rightValue}
   * @private
   * @type {Array<Object>}
   */
  this.nodes_ = [];

  for (var i = 0; i < lengths.length; i++) {
    this.nodes_[i] = {left: 0, right: 0, leftValue: 0, rightValue: 0};
  }

  /**
   * Index into this.nodes_ for the next node of the tree.
   * @private
   * @type {number}
   */
  this.nextNode_ = 0;

  var pairs = [];  // each pair element is {length, value}
  for (var i = 0; i < lengths.length; i++) {
    pairs[i] = {length: lengths[i], value: i};
  }
  pairs.sort(function(a, b) {
    if (a.length > b.length) {
      return 1;
    } else if (b.length > a.length) {
      return -1;
    } else {  // equal length
      return (a.value > b.value ? 1 : -1);
    }
  });

  var code = 0;
  var length = 32;

  var codes = []; // each code is {code, codeLen, value}
  for (var i = pairs.length - 1; i >= 0; i--) {
    if (length > pairs[i].length) {
      length >>>= (32 - pairs[i].length);
      length <<= (32 - pairs[i].length);
      length = pairs[i].length;
    }
    codes[i] = {code: code, codeLen: length, value: pairs[i].value};
    code += (1 << (32 - length));
  }
  codes.sort(function(a, b) {return (a.code > b.code ? 1 : -1);});

  this.buildHuffmanNode(codes, 0);

};


/**
 * Consumes bits from stream and returns the decoded symbol from the tree.
 * @param {e2e.compression.Bzip2.Bits_} bits Bit stream object.
 * @return {number} The decoded symbol.
 */
e2e.compression.Bzip2.Huffman_.prototype.decode = function(bits) {
  var nodeIndex = 0;
  while (true) {
    var node = this.nodes_[nodeIndex];
    var bit = bits.read(1);
    // TODO(adhintz) Handle out of bits?
    if (bit != 0) {
      if (node.left == 0xffff) {
        return node.leftValue;
      }
      nodeIndex = node.left;
    } else {
      if (node.right == 0xffff) {
        return node.rightValue;
      }
      nodeIndex = node.right;
    }
  }
};


/**
 * Builds a Huffman Tree by recursively building nodes.
 * @param {Array<Object>} codes Each code is {code, codeLen, value}.
 * @param {number} level Current level in the tree.
 * @return {number} nodeIndex of the new node. Used in recursive calls.
 */
e2e.compression.Bzip2.Huffman_.prototype.buildHuffmanNode =
    function(codes, level) {

  var test = 1 << (31 - level);
  var firstRightIndex = codes.length;
  for (var i = 0; i < codes.length; i++) {
    if ((codes[i].code & test) != 0) {
      firstRightIndex = i;
      break;
    }
  }

  var left = codes.slice(0, firstRightIndex);
  var right = codes.slice(firstRightIndex);

  // TODO(adhintz) Deal with case when (left.length == 0 || right.length == 0)

  var nodeIndex = this.nextNode_;
  var node = this.nodes_[nodeIndex];
  this.nextNode_++;

  if (left.length == 1) { // leaf node
    node.left = 0xffff;
    node.leftValue = left[0].value;
  } else {
    node.left = this.buildHuffmanNode(left, level + 1);
  }

  // TODO(adhintz) return on error in previous buildHuffmanNode recursive call.

  if (right.length == 1) { // leaf node
    node.right = 0xffff;
    node.rightValue = right[0].value;
  } else {
    node.right = this.buildHuffmanNode(right, level + 1);
  }

  return nodeIndex;
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
 * Precomputed table for Math.pow(2, X) to improve performance.
 * @private
 * @type {!e2e.ByteArray}
 * @const
 */
e2e.compression.Bzip2.POW2_ = [1, 2, 4, 8, 16, 32, 64, 128, 256];


/**
 * @param {number} bits Number of bits to read, between 1 and 52 inclusive.
 * @return {number} Bits stored in a number.
 */
e2e.compression.Bzip2.Bits_.prototype.read = function(bits) {
  if (bits < 1 ||
      bits > 52 ||  // based on Number.MAX_SAFE_INTEGER
      this.offset_ + bits > this.data_.length * 8) {
    throw new RangeError('invalid number of bits to read from data array.');
  }
  var byte_offset = this.offset_ >>> 3;
  var bit_offset = this.offset_ % 8;
  this.offset_ += bits;

  var result = 0;
  while (bits > 0) {
    var bits_read_count = Math.min(8 - bit_offset, bits);
    // Shift left without using << to support numbers > 32 bits.
    result *= e2e.compression.Bzip2.POW2_[bits_read_count];
    // Bitmask off the high bits we've already read and accumulate.
    var to_add = this.data_[byte_offset] & (
        e2e.compression.Bzip2.POW2_[8 - bit_offset] - 1);
    // If only reading part of a byte, shift down the bits we're reading.
    to_add = to_add >>> (8 - bits_read_count - bit_offset);
    result += to_add;

    byte_offset++;
    bit_offset = 0;
    bits -= bits_read_count;
  }

  return result;
};

e2e.compression.factory.add(e2e.compression.Bzip2,
    e2e.compression.Algorithm.BZIP2);
