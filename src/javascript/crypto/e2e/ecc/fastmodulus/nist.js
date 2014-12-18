/**
 * @license
 * Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview
 *
 * Fast modulus implementations for the two NIST primes P_256 and P_384 that
 * take advantage of special properties of those numbers.
 *
 * @author fy@google.com (Frank Yellin)
 */

goog.provide('e2e.ecc.fastModulus.Nist');
goog.provide('e2e.ecc.fastModulus.Nist.P_256');
goog.provide('e2e.ecc.fastModulus.Nist.P_384');

goog.require('e2e.BigNum');
goog.require('e2e.FastModulus');
goog.require('goog.asserts');



/**
 * An abstract implementation of FastModulus that handles the common code
 * between the two NIST primes P_256 and P_384.
 *
 * @constructor
 * @implements {e2e.FastModulus}
 * @param {!e2e.BigPrimeNum} modulus The large prime number for which
 *     we are building a fast modulus function.
 */
e2e.ecc.fastModulus.Nist = function(modulus) {
  /**
   * The modulus.
   * @private {!e2e.BigPrimeNum }
   */
  this.modulus_ = modulus;
};


/** @override */
e2e.ecc.fastModulus.Nist.prototype.useForMultiplication = true;


/**
 * Number of words in the 2^32 representation of this.modulus_
 * @private {number}
 */
e2e.ecc.fastModulus.Nist.prototype.modulusLength_;


/**
 * A precomputed value such that
 *    this.residue((2^32)^modulus_length_) = sum(small_residue[j] * (2^32)^j)
 * where small_residue_.length <= modulusLength_ and each of elements is a
 * small integer.
 * @private {Int8Array}
 */
e2e.ecc.fastModulus.Nist.prototype.smallResidue_;


/** @override */
e2e.ecc.fastModulus.Nist.prototype.residue = function(value) {
  var modLength = this.modulusLength_;
  var doubleModLength = 2 * modLength;
  var temp = value.toByteArray();
  temp.reverse();
  // Parse the number into 32-bit words
  var words = [];
  for (var i = 0, j = 0; i < doubleModLength || j < temp.length;
       i++, j += 4) {
    words[i] = (temp[j] | 0) + (temp[j + 1] | 0) * 0x100 +
        (temp[j + 2] | 0) * 0x10000 + (temp[j + 3] | 0) * 0x1000000;
  }
  goog.asserts.assert(words.length <= doubleModLength);
  var outs = this.fastModulusSmall(words);
  goog.asserts.assert(outs.length == modLength);

  // Normalize the values so that they are in the range 0 <= out[i] < 2^32 - 1
  this.normalize_(outs);

  // Break 32-bit words into 24-bit words used internally by BigNum, and create
  // the BigNum
  var resultWords = [];
  for (var i = 0; i < modLength; i += 3) {
    var t0 = outs[i];
    var t1 = outs[i + 1] || 0;
    var t2 = outs[i + 2] || 0;
    resultWords.push(t0 & 0xFFFFFF,
        ((t0 >> 24) & 0xFF) | ((t1 & 0xFFFF) << 8),
        ((t1 >> 16) & 0xFFFF) | ((t2 & 0xFF) << 16),
        (t2 >> 8) & 0xFFFFFF);
  }
  var result = e2e.BigNum.fromInternalArray(resultWords);
  // We may still have to do one final subtraction
  return result
      .subtractIfGreaterOrEqual(this.modulus_)
      .setSize(this.modulus_.getSize());
};


/**
 * Converts a number of length 2*modulusLength_ 32-bit words into an
 * equivalent value, mod this.modulus_, whose length is modulusLength_.
 * The elements in the result are not guaranteed to be in the range
 *     0 <= x < 2^32, but will
 * definitely be in the range
 *     -10 * 2^32 <= x < 10 * 10^32.
 *
 * @param {Array.<number>} words input words.  An array whose length is
 *     2 * modulusLength and in which each element is in [0, 2^32 - 1)
 * @return {Array.<number>} An array whose length is modusLength and is
 *     equivalent (mod this.modulus) to the input value.
 * @protected
 */
e2e.ecc.fastModulus.Nist.prototype.fastModulusSmall =
    goog.abstractMethod;


/**
 * Normalizes the array.
 * Each outs[i] is in the range -10 * 2^32 <= out[i] < 10 * 2^32
 * We normalize to get each value in the range 0 <= out[i] < 2^32 - 1 by
 * moving any overflow or underflow up to the next word
 *
 * @param {!Array.<number>} outs The little-endian representation of the
 *        32-bit words of  a BigNum
 * @private
 */
e2e.ecc.fastModulus.Nist.prototype.normalize_ = function(outs) {
  var modLength = this.modulusLength_;
  for (;;) {
    var U = 0;
    for (var i = 0; i < modLength; i++) {
      var acc = outs[i] + U;
      // Get the low 32 bits of acc
      var lowBits = (acc ^ 0x80000000) + 0x80000000;
      // U = Math.floor(acc / 0x100000000), where acc may be negative
      U = ((acc - lowBits) / 0x100000000) | 0;
      outs[i] = lowBits;
    }
    // U is the overflow/underflow from outs[modLength -1].
    // Let OUTS be the value represented by outs[]
    // If U == 0, then OUTS is equal to the original argument, (mod modulus_).
    if (U == 0) {
      return;
    }
    var residue = this.smallResidue_;
    // The result we have represented is
    //      U * (2^32)^modLength + OUTS
    // By definition, (all arithmetic is modulo (this.modulus_)
    //      sum(residue[j] * (2^32)^j) = (2^32)^modLength
    // so we can subtract multiples of
    //      (2^32)^modLength - sum(residue[j] * (2^32)^j)
    // Multiplying by U, we have
    //      U * (2^32)^modLength - sum(U * residue[j] * (2^32)^j)
    // So we can subtract this quantity from the actual amount we have
    // represented and get an equivalent value:
    //      OUTS + sum(U * residue[j] * (2^32)^j)
    //
    // For example, with P256, we have that (mod P_256)
    //      U * (2^256) + OUTS
    //   =  U * (2^256) + OUTS - U * (2^256 - 2^224 + 2^192 + 2^96 - 1)
    //   =  OUTS + U * (2^224 - 2^192 - 2^96 + 1)
    var valuesInRange = true;
    for (i = residue.length - 1; i >= 0; i--) {
      var newOut = outs[i] + U * residue[i];
      outs[i] = newOut;
      valuesInRange &= (newOut >= 0 && newOut < 0x100000000);
    }
    if (valuesInRange) {
      // All the values are in the appropriate range, we can can skip another
      // normalization loop.
      return;
    }
    // At least one element of outs[] is out of range, so we repeat the
    // normalization loop
  }
};



/**
 * A concrete subclass of FastModulus that handles the case the special case
 * of the prime modulus P_256.
 *
 * @constructor
 * @extends {e2e.ecc.fastModulus.Nist}
 * @param {!e2e.BigPrimeNum} modulus The large prime number for which
 *     we are building a fast modulus function.  It must be P_256.
 */
e2e.ecc.fastModulus.Nist.P_256 = function(modulus) {
  e2e.ecc.fastModulus.Nist.P_256.base(this, 'constructor', modulus);
  this.modulusLength_ = 8;
  this.smallResidue_ = new Int8Array([1, 0, 0, -1, 0, 0, -1, 1]);
};
goog.inherits(e2e.ecc.fastModulus.Nist.P_256,
    e2e.ecc.fastModulus.Nist);


/** @override */
e2e.ecc.fastModulus.Nist.P_256.prototype.fastModulusSmall = function(
    words) {
  var outs = new Array(8);
  outs[7] = words[7] + 3 * words[15] + words[8] -
      (words[10] + words[11] + words[12] + words[13]);
  outs[6] = words[6] + 3 * words[14] + 2 * words[15] + words[13] -
      (words[8] + words[9]);
  outs[5] = words[5] + 2 * words[13] + 2 * words[14] + words[15] -
      (words[10] + words[11]);
  outs[4] = words[4] + 2 * words[12] + 2 * words[13] + words[14] -
      (words[9] + words[10]);
  outs[3] = words[3] + 2 * words[11] + 2 * words[12] + words[13] -
      (words[15] + words[8] + words[9]);
  outs[2] = words[2] + words[10] + words[11] -
      (words[13] + words[14] + words[15]);
  outs[1] = words[1] + words[9] + words[10] -
      (words[12] + words[13] + words[14] + words[15]);
  outs[0] = words[0] + words[8] + words[9] -
      (words[11] + words[12] + words[13] + words[14]);
  return outs;
};



/**
 * A concrete subclass of FastModulus that handles the case the special case
 * of the prime modulus P_384.
 *
 * @constructor
 * @extends {e2e.ecc.fastModulus.Nist}
 * @param {!e2e.BigPrimeNum} modulus The large prime number for which
 *     we are building a fast modulus function.  It must be P_384.
 */
e2e.ecc.fastModulus.Nist.P_384 = function(modulus) {
  e2e.ecc.fastModulus.Nist.P_384.base(this, 'constructor', modulus);
  this.modulusLength_ = 12;
  // this.residue(2^384)
  this.smallResidue_ = new Int8Array([1, -1, 0, 1, 1]);
};
goog.inherits(e2e.ecc.fastModulus.Nist.P_384,
    e2e.ecc.fastModulus.Nist);


/** @override */
e2e.ecc.fastModulus.Nist.P_384.prototype.fastModulusSmall = function(
    words) {
  // http://www.nsa.gov/ia/_files/nist-routines.pdf,
  var outs = new Array(12);
  outs[11] = words[11] + words[23] + words[20] + words[19] - words[22];
  outs[10] = words[10] + words[22] + words[19] + words[18] - words[21];
  outs[9] = words[9] + words[21] + words[18] + words[17] - words[20];
  outs[8] = words[8] + words[20] + words[17] + words[16] - words[19];
  outs[7] = words[7] + words[19] + words[16] + words[15] + words[23] -
      words[18];
  outs[6] = words[6] + 2 * words[23] + words[18] + words[15] + words[14] +
      words[22] - words[17];
  outs[5] = words[5] + 2 * words[22] + words[17] + words[14] + words[13] +
      words[21] + words[23] - words[16];
  outs[4] = words[4] + 2 * words[21] + words[16] + words[13] + words[12] +
      words[20] + words[22] - (words[15] + 2 * words[23]);
  outs[3] = words[3] + words[15] + words[12] + words[20] + words[21] -
      (words[14] + words[22] + words[23]);
  outs[2] = words[2] + words[14] + words[23] - words[13] - words[21];
  outs[1] = words[1] + words[13] + words[22] + words[23] -
      (words[12] + words[20]);
  outs[0] = words[0] + words[12] + words[21] + words[20] - words[23];
  return outs;
};
