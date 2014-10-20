/**
 * @license
 * Copyright 2011 Google Inc. All rights reserved.
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
 *
 * @fileoverview Basic arithmetic operations for big numbers.
 * @author thaidn@google.com (Thai Duong).
 */

goog.provide('e2e.BigNum');

goog.require('e2e');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.fixedtiming');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Non-negative arbitrary-precision integers.
 * @param {(!e2e.ByteArray|!Uint8Array)=} opt_value The value of the BigNum in
 *     big endian.
 * @constructor
 */
e2e.BigNum = function(opt_value) {
  /**
   * The internal representation of this BigNum. It's an array of 24-bit numbers
   * in little endian.
   * @type {!Array.<number>}
   */
  this.n = [];
  if (goog.isDef(opt_value)) {
    if (!(
          goog.isFunction(goog.global.Uint8Array) &&
          opt_value instanceof Uint8Array
        ) && !e2e.isByteArray(/** @type {!e2e.ByteArray} */ (opt_value))) {
      throw new e2e.error.InvalidArgumentsError(
          'Input should be a byte array.');
    }
    this.n = e2e.BigNum.bigEndianToInternal_(opt_value);
  }

  /**
   * The length in bits of this BigNum. Calculate only when needed.
   * @private {number}
   */
  this.bitLength_ = 0;
};


/**
 * @const {number} The length in bits of radix.
 */
e2e.BigNum.BASE_LEN = 24;


/**
 * @const {number} Radix used to calculate multiplications.
 */
e2e.BigNum.BASE = 1 << e2e.BigNum.BASE_LEN;


/**
 * @const {number} Bit mask of the radix.
 */
e2e.BigNum.BASE_MASK = e2e.BigNum.BASE - 1;


/**
 * A factory method to create a BigNum of a predefined size.
 * @param {number} n The size of the BigNum. Must be larger than 0.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.createBigNumOfSize = function(n) {
  var bignum = new e2e.BigNum();
  bignum.n.length = n;
  return bignum;
};


/**
 * For internal use only.  Creates a BigNum from a little-endian array
 * of 24-bit numbers, which is the internal format of a BigNum.
 *
 * @param {Array.<number>} array An array of 24-bit integers
 * @return {!e2e.BigNum} a new bignum.
 */
e2e.BigNum.fromInternalArray = function(array) {
  var bignum = new e2e.BigNum();
  bignum.n = goog.array.clone(array);
  return bignum;
};


/**
 * A factory method to create a BigNum from a 32-bit non-negative integer
 * @param {number} value a non-negative 32-bit integer
 * @return {!e2e.BigNum}
 */
e2e.BigNum.fromInteger = function(value) {
  if (value < 0 || value > 0x1000000000000  /* 2^48 */) {
    throw new e2e.error.InvalidArgumentsError(
        'Argument must be a valid integer.');
  }
  var bignum = new e2e.BigNum();
  do {
    bignum.n.push(value & e2e.BigNum.BASE_MASK);
    value = Math.floor(value / e2e.BigNum.BASE);
  } while (value > 0);
  return bignum;
};


/**
 * Converts big endian byte array to internal format.
 * @param {(!e2e.ByteArray|!Uint8Array)} input The big endian number.
 * @return {!Array.<number>}
 * @private
 */
e2e.BigNum.bigEndianToInternal_ = function(input) {
  var i = input.length;
  var pw = new Array(((i + 2) / 3) | 0);
  var j = 0;
  for (; i >= 0; i -= 3) {
    pw[j++] = (input[i - 1] & 255) |
              ((input[i - 2] & 255) << 8) |
              ((input[i - 3] & 255) << 16);
  }
  return pw;
};


/**
 * Selects conditionally. Returns a if bit is 1, b if bit is 0.
 * @param {!e2e.BigNum} a
 * @param {!e2e.BigNum} b
 * @param {number} bit
 * @return {!e2e.BigNum}
 */
e2e.BigNum.select = function(a, b, bit) {
  var mask = (-bit) | 0;
  var maxLen = e2e.fixedtiming.max(a.n.length, b.n.length);
  var ret = e2e.BigNum.createBigNumOfSize(maxLen);
  for (var i = 0; i < maxLen; ++i) {
    ret.n[i] = mask & (a.n[i] ^ b.n[i]);
  }
  for (var i = 0; i < maxLen; ++i) {
    ret.n[i] = ret.n[i] ^ b.n[i];
  }
  return ret;
};


/**
 * Converts this to big endian byte array. Drop leading zeros.
 * @return {!e2e.ByteArray} The big endian representation.
 */
e2e.BigNum.prototype.toByteArray = function() {
  var i = this.n.length;
  var j = 0;
  var r = new Array(3 * i);

  for (; i > 0; --i) {
    r[j++] = (this.n[i - 1] >>> 16) & 255;
    r[j++] = (this.n[i - 1] >>> 8) & 255;
    r[j++] = (this.n[i - 1] & 255);
  }

  // Drops leading zeros.
  var n = 0;
  var z = 0;
  for (var m = 0; m < r.length; ++m) {
    z |= r[m]; // All zeros so far?
    n += !z & (!r[m]);
  }
  return r.slice(n - (1 & !z));
};


/**
 * Converts this to a base 16 little-endian representation in which "digit"
 * is in the range [-7, 8]. Needed to perform scalar multiplications in ECC.
 * @return {!Array.<number>} The little endian signed-nybble representation.
 */
e2e.BigNum.prototype.toSignedNybbleArray = function() {
  var result = [];
  var carry = 0;
  for (var word = 0; word < this.n.length; word++) {
    // We add 0x777777 to the word as a whole, then subtract 7 from each of
    // the resulting nybbles.
    var value = this.n[word] + carry + 0x777777;
    carry = value >> e2e.BigNum.BASE_LEN;
    for (var offset = 0; offset < e2e.BigNum.BASE_LEN; offset += 4) {
      result.push(((value >> offset) & 0xF) - 7);
    }
  }
  result.push(carry);
  return result;
};


/** @override */
e2e.BigNum.prototype.toString = function() {
  var result = [];
  var current = this;
  var divisor = e2e.BigNum.fromInteger(1000 * 1000);
  do {
    var qr = current.divmod(divisor);
    var remainder = qr.remainder;
    result.unshift(remainder.n[0]);
    current = qr.quotient;
    current.dropLeadingZeros();
  } while (!current.isEqual(e2e.BigNum.ZERO));
  return result.map(function(element, index) {
    // pad all but the first element to be six digits
    if (index == 0 || element > 1000 * 1000) {
      return '' + element;
    } else {
      return ('000000' + element).slice(-6);
    }

  }).join('');
};


/**
 * Drops leading zeros.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.dropLeadingZeros = function() {
  // Fixed-timing up to the length of this.
  var j = 0;
  var z = 0;
  for (var i = this.n.length - 1; i > 0; --i) {
    z |= this.n[i]; // All zeros so far?
    j += !z & (!this.n[i]);
  }
  this.n.length -= j;
  return this;
};


/**
 * Returns a copy of this object.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.clone = function() {
  return e2e.BigNum.fromInternalArray(this.n);
};


/**
 * Resets the size of this BigNum by removing or adding leading zeros.
 * @param {number} n The new size.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.cloneWithSize = function(n) {
  var r = e2e.BigNum.createBigNumOfSize(n);
  for (var i = 0; i < n; i++) {
    r.n[i] = this.n[i] | 0;
  }
  return r;
};


/**
 * Resets the size of this BigNum.
 * @param {number} n The new size. Must be smaller than current size.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.setSize = function(n) {
  goog.asserts.assert(n <= this.n.length, 'Wrong size.');
  this.n.length = n;
  return this;
};


/**
 * Gets the size of this BigNum.
 * @return {number}
 */
e2e.BigNum.prototype.getSize = function() {
  return this.n.length;
};


/**
 * Returns the bit length of this.
 * @return {number}
 */
e2e.BigNum.prototype.getBitLength = function() {
  if (this.bitLength_ == 0) {
    return this.getBitLength_();
  }
  return this.bitLength_;
};


/**
 * Calculates the bit length of this.
 * @return {number}
 * @private
 */
e2e.BigNum.prototype.getBitLength_ = function() {
  var j = 0;
  var z = 0;
  for (var i = this.n.length - 1; i > 0; --i) {
    z |= this.n[i]; // All zeros so far?
    j += !z & (!this.n[i]);
  }
  var len = this.n.length - j;
  var nbits = len * e2e.BigNum.BASE_LEN;
  var msw = this.n[len - 1];
  // change [0] to [1], as they have the same length.
  // msw = 1 if msw = 0; otherwise no change.
  msw = msw | (!msw);
  while ((msw & (e2e.BigNum.BASE >> 1)) == 0) {
    msw <<= 1;
    --nbits;
  }
  this.bitLength_ = nbits;
  return nbits;
};


/**
 * Calculates this + that.
 * @param {!e2e.BigNum} that The number to add.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.add = function(that) {
  var maxLen = e2e.fixedtiming.max(this.n.length, that.n.length);
  var sum = e2e.BigNum.createBigNumOfSize(maxLen + 1);
  var accu = 0;
  for (var i = 0; i < maxLen; ++i) {
    accu += (this.n[i] | 0) + (that.n[i] | 0);
    sum.n[i] = accu & e2e.BigNum.BASE_MASK;
    accu >>= e2e.BigNum.BASE_LEN;
  }
  sum.n[maxLen] = accu;
  return sum;
};


/**
 * Calculates this - that.
 * @param {!e2e.BigNum} that The number to subtract. It must
 *     be smaller than this.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.subtract = function(that) {
  if (!this.isGreaterOrEqual(that)) {
    throw new e2e.error.InvalidArgumentsError(
        'Cannot subtract to a larger BigNum.');
  }

  var result = this.clone();
  var n = result.n.length;
  var accu = 0;
  for (var i = 0; i < result.n.length; ++i) {
    accu += result.n[i] - (that.n[i] | 0);
    result.n[i] = accu & e2e.BigNum.BASE_MASK;
    accu >>= e2e.BigNum.BASE_LEN;
  }
  return result;
};


/**
 * Subtracts conditionally: return this - that if this >= that.
 * @param {!e2e.BigNum} that Number to subtract.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.subtractIfGreaterOrEqual = function(that) {
  var maxLen = e2e.fixedtiming.max(this.n.length, that.n.length);
  var result = e2e.BigNum.createBigNumOfSize(maxLen);
  var accu = 0;
  for (var i = 0; i < maxLen; ++i) {
    accu += (this.n[i] | 0) - (that.n[i] | 0);
    result.n[i] = accu & e2e.BigNum.BASE_MASK;
    accu >>= e2e.BigNum.BASE_LEN;
  }
  var mask = accu;
  accu = 0;
  for (var i = 0; i < maxLen; ++i) {
    accu += result.n[i] + (that.n[i] & mask);
    result.n[i] = (accu) & e2e.BigNum.BASE_MASK;
    accu >>= e2e.BigNum.BASE_LEN;
  }
  return result;
};


/**
 * Calculates this * that.
 * @param {!e2e.BigNum} that The number to multiply.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.multiply = function(that) {
  var thisLen = this.n.length;
  var thatLen = that.n.length;
  var productLen = thisLen + thatLen;
  var product = e2e.BigNum.createBigNumOfSize(productLen);
  for (var i = 0; i < productLen; i++) {
    product.n[i] = 0;
  }
  for (var i = 0; i < thisLen; i++) {
    var U = 0;
    for (var j = 0; j < thatLen; j++) {
      var accu = product.n[i + j] + this.n[i] * that.n[j] + U;
      U = (accu / e2e.BigNum.BASE) | 0;
      product.n[i + j] = accu & e2e.BigNum.BASE_MASK;
    }
    product.n[i + thatLen] = U;
  }
  return product;
};


/**
 * Calculates this * this.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.square = function() {
  var m = this.n.length;
  var product = e2e.BigNum.createBigNumOfSize(2 * m);
  for (var i = 0; i < 2 * m; i++) {
    product.n[i] = 0;
  }
  for (var i = 0; i < m; i++) {
    var accu = product.n[i + i] + this.n[i] * this.n[i];
    var U = (accu / e2e.BigNum.BASE) | 0;
    product.n[i + i] = accu & e2e.BigNum.BASE_MASK;
    for (var j = i + 1; j < m; j++) {
      accu = product.n[i + j] + 2 * this.n[i] * this.n[j] + U;
      U = (accu / e2e.BigNum.BASE) | 0;
      product.n[i + j] = accu & e2e.BigNum.BASE_MASK;
    }
    product.n[i + m] = U;
  }
  return product;
};


/**
 * Calculates this % that
 * @param {!e2e.BigNum} that
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.mod = function(that) {
  return this.divmod(that).remainder;
};


/**
 * Calculates this / that
 * @param {!e2e.BigNum} that
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.div = function(that) {
  return this.divmod(that).quotient;
};


/**
 * Calculates both quotient and remainder of this / that.
 * @param {!e2e.BigNum} that
 * @return {!{quotient:!e2e.BigNum, remainder:!e2e.BigNum}}
 */
e2e.BigNum.prototype.divmod = function(that) {
  var bitLength = that.getBitLength();
  // divisor length w/o padding
  var length = ((bitLength + e2e.BigNum.BASE_LEN - 1) /
      e2e.BigNum.BASE_LEN) | 0;
  var shift = length * e2e.BigNum.BASE_LEN - bitLength;
  // Shift the divisor that that its high bit is set.
  // Shift the dividend by the same amount.
  var divisor = that.shiftLeft(shift);
  var dividend = e2e.BigNum.select(
      this.clone(), this.shiftLeft(shift), (shift == 0) | 0);
  var quotient = e2e.BigNum.select(
      e2e.BigNum.ZERO,
      e2e.BigNum.createBigNumOfSize(dividend.n.length + 1),
      (dividend.n.length + 1 - length <= 0) | 0);
  dividend.n.push(0);

  for (var delta = dividend.n.length - length - 1; delta >= 0; delta--) {
    // ASSERT:  dividend / (divisor * b^(delta)) < b, where b = 2^24.
    // Our goal is to find q = floor(dividend / (divisor * b^delta)).
    // We can then subtract q * divisor * b^delta from the dividend and add
    // q * b ^ delta to the quotient.
    //
    // Get q, the tentative quotient digit.  This is either the right answer
    // or one too large.
    var q = this.calculateQuotient_(dividend, divisor, delta);
    // Subtract quotient * divisor
    var accu = 0;
    quotient.n[delta] = q;
    for (var i = 0; i <= length; i++) {
      accu += dividend.n[i + delta] - (divisor.n[i] | 0) * q;
      dividend.n[i + delta] = accu & e2e.BigNum.BASE_MASK;
      accu = Math.floor(accu / e2e.BigNum.BASE);
    }
    goog.asserts.assert(
        dividend.n[delta + length] == e2e.BigNum.BASE_MASK ||
        dividend.n[delta + length] == 0);
    goog.asserts.assert(accu == -1 || accu == 0);

    // If the result is negative, then q was 1 too large, and we add
    // b ^ delta * divisor back, and subtract b ^ delta from the quotient.
    var mask = accu;  //
    accu = 0;
    quotient.n[delta] += mask;
    for (var i = 0; i <= length; i++) {
      accu += dividend.n[i + delta] + (divisor.n[i] & mask);
      dividend.n[i + delta] = accu & e2e.BigNum.BASE_MASK;
      accu >>= e2e.BigNum.BASE_LEN;
    }
    goog.asserts.assert(dividend.n[delta + length] == 0);
  }
  dividend = dividend.shiftRight(shift).cloneWithSize(length);
  quotient.dropLeadingZeros();
  goog.asserts.assert(quotient.multiply(that).add(dividend).isEqual(this));
  return {quotient: quotient, remainder: dividend};
};


/**
 * Calculates the quotient digit for dividend / (divisor << (24 * delta)).
 * The resulting quotient digit is guaranteed to be either the right answer,
 * or one larger than the right answer.
 * @param {e2e.BigNum} dividend
 * @param {e2e.BigNum} divisor
 * @param {number} delta
 * @return {number}
 * @private
 */
e2e.BigNum.prototype.calculateQuotient_ = function(
    dividend, divisor, delta) {
  var length = divisor.n.length;
  goog.asserts.assert(dividend.n[length + delta] <=
      divisor.n[length - 1]);
  // Let the top three digits of the dividend be s2, s1, s0, and the top two
  // digits of the divisor be v1, v0.  Let the base be b.  Let the correct value
  // for the quotient be q.  Knuth shows that calculating
  //     qhat = floor((s2 * b + s1) / v1)
  // gives an amount such that the true quotient is qhat, qhat - 1, or qhat - 2.
  var numerator = dividend.n[length + delta] * e2e.BigNum.BASE +
      dividend.n[length + delta - 1];
  var denominator = divisor.n[length - 1];
  var qhat = Math.floor(numerator / denominator);
  var rhat = numerator - qhat * denominator;  // remainder
  // Let qtilde = floor((s2 * b^2 + s1 * b + s0) / (v1 * b + v0)
  // Knuth likewise shows that qtilde <= qhat, that the true quotient is qtilde
  // or qtilde - 1, and that the q = qtilde with very high probability.
  // But this code needs to be data-independent, so we bother to distinguish
  // only between the two cases qtilde == qhat and qtilde < qhat. From above:
  //     qhat * v1 + rhat = s2 * b + s1
  //     qhat * v1 * b  + rhat * b = s2 * b^2 + s1 * b
  //     qhat * (v1 + b + v0) + ((rhat * b + s0 - qhat * v0))
  //                   = s2 * b^2 + s1 * b + s0
  // The quantity marked by ((...)) looks like a remainder in calculating
  // qtilde.  So we have
  //             ((...)) >= 0  if  qtilde == qhat
  //             ((...)) < 0   if  qtilde < qhat.
  // NB: HAC points out that the algorithm works fine with non-zero 1-word
  // divisors, as long as negative indices are treated as 0.

  // If this is true, then it has to be the case that qhat is too large,
  // and the real quotient must be qhat - 1 or qhat - 2.
  var decrement1 = (qhat == e2e.BigNum.BASE);
  // If this is true, then per above, qtilde < qhat, so that the real
  // quotient must be qhat - 1 or qhat - 2.
  var decrement2 = qhat * (divisor.n[length - 2] | 0) >
      rhat * e2e.BigNum.BASE + (dividend.n[length + delta - 2] | 0);
  return qhat - (decrement1 | decrement2);
};


/**
 * Divides this by a small, one-word divisor.
 * @param  {number} divisor The one-word divisor.
 * @return {!{quotient:!e2e.BigNum, remainder:number}}
 */
e2e.BigNum.prototype.divmodInt = function(divisor) {
  goog.asserts.assert(0 <= divisor && divisor < e2e.BigNum.BASE);
  var dividend = this.clone();

  var tmp, remainder = 0;
  for (var i = dividend.n.length - 1; i >= 0; --i) {
    tmp = remainder * (e2e.BigNum.BASE) + dividend.n[i];
    dividend.n[i] = (tmp / divisor) | 0;
    remainder = tmp % divisor;
  }
  return {quotient: dividend, remainder: remainder};
};


/**
 * Return true if a < this < b.
 * @param {e2e.BigNum} a The lower bound.
 * @param {e2e.BigNum} b The upper bound.
 * @return {boolean}
 */
e2e.BigNum.prototype.isBetween = function(a, b) {
  return this.compare(a) > 0 && this.compare(b) < 0;
};


/**
 * Returns true if this = that.
 * @param {e2e.BigNum} that The number to compare.
 * @return {boolean}
 */
e2e.BigNum.prototype.isEqual = function(that) {
  return this.compare(that) == 0;
};


/**
 * Returns true if this < that.
 * @param {e2e.BigNum} that The number to compare.
 * @return {boolean}
 */
e2e.BigNum.prototype.isLess = function(that) {
  return this.compare(that) < 0;
};


/**
 * Returns true if this >= that.
 * @param {e2e.BigNum} that The number to compare.
 * @return {boolean}
 */
e2e.BigNum.prototype.isGreaterOrEqual = function(that) {
  return this.compare(that) >= 0;
};


/**
 * Compares this to another number. Return a negative, zero, and a positive
 * number when this is smaller than, equal to, or bigger than the other BigNum
 * respectively.
 * This is fixed-timing, thanks to quannguyen@.
 * @param {e2e.BigNum} that The number to compare.
 * @return {number}
 */
e2e.BigNum.prototype.compare = function(that) {
  var greater = 0;
  var previousLesser = 0;
  var previousGreater = 0;
  var lesser = 0;
  var maxLen = e2e.fixedtiming.max(this.n.length, that.n.length);
  for (var i = maxLen - 1; i >= 0; --i) {
    var x = this.n[i] | 0;
    var y = that.n[i] | 0;
    previousLesser |= (x < y);
    greater |= (x > y) & !previousLesser;
    previousGreater |= (x > y);
    lesser |= (x < y) & !previousGreater;
  }
  return greater - lesser;
};


/**
 * Performs a bitwise-AND of this and that.
 * @param {e2e.BigNum} that The number to AND with.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.and = function(that) {
  var maxLen = e2e.fixedtiming.max(this.n.length, that.n.length);
  var result = e2e.BigNum.createBigNumOfSize(maxLen);
  for (var i = maxLen; i >= 0; --i) {
    var x = this.n[i] | 0;
    var y = that.n[i] | 0;
    result.n[i] = x & y;
  }
  return result;
};


/**
 * Performs a bitwise-OR of this and that.
 * @param {e2e.BigNum} that The number to XOR with.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.or = function(that) {
  var maxLen = e2e.fixedtiming.max(this.n.length, that.n.length);
  var result = e2e.BigNum.createBigNumOfSize(maxLen);
  for (var i = maxLen; i >= 0; --i) {
    var x = this.n[i] | 0;
    var y = that.n[i] | 0;
    result.n[i] = x | y;
  }
  return result;
};


/**
 * Performs a bitwise-XOR of this and that.
 * @param {e2e.BigNum} that The number to XOR with.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.xor = function(that) {
  var maxLen = e2e.fixedtiming.max(this.n.length, that.n.length);
  var result = e2e.BigNum.createBigNumOfSize(maxLen);
  for (var i = maxLen; i >= 0; --i) {
    var x = this.n[i] | 0;
    var y = that.n[i] | 0;
    result.n[i] = x ^ y;
  }
  return result;
};


/**
 * Negates this value.
 *
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.negate = function() {
  var length = this.n.length;
  var result = e2e.BigNum.createBigNumOfSize(length);
  for (var i = length - 1; i >= 0; i--) {
    result.n[i] = (~ this.n[i]) & e2e.BigNum.BASE_MASK;
  }
  return result.add(e2e.BigNum.ONE);
};


/**
 * Calculates this << shift.  Shift must be in the range 0 <= shift <= 23.
 *
 * @param {number} shift  The amount by which to shift.  0 <= shift <= 23.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.shiftLeft = function(shift) {
  if (shift < 0 || shift > 23) {
    throw new e2e.error.InvalidArgumentsError(
        'Illegal shift value.');
  }
  var length = this.n.length;
  var result = e2e.BigNum.createBigNumOfSize(length + 1);
  var mask = (1 << shift) - 1;
  var xmask = (1 << (e2e.BigNum.BASE_LEN - shift)) - 1;
  var carry = 0;
  for (var i = 0; i < length; i++) {
    // We purposely mask before shifting to ensure the result stays 32 bits.
    result.n[i] = ((this.n[i] & xmask) << shift) + carry;
    carry = (this.n[i] >> (e2e.BigNum.BASE_LEN - shift)) & mask;
  }
  result.n[length] = carry;
  return result.dropLeadingZeros();
};


/**
 * Calculates this >> shift.  Shift must be in the range 0 <= shift <= 23.
 *
 * @param {number} shift  The amount by which to shift.  0 <= shift <= 23.
 * @return {!e2e.BigNum}
 */
e2e.BigNum.prototype.shiftRight = function(shift) {
  if (shift < 0 || shift > 23) {
    throw new e2e.error.InvalidArgumentsError(
        'Illegal shift value.');
  }
  var length = this.n.length;
  var result = e2e.BigNum.createBigNumOfSize(length);
  var mask = (1 << shift) - 1;
  var carry = 0;
  for (var i = length - 1; i >= 0; i--) {
    result.n[i] = carry + (this.n[i] >> shift);
    carry = (this.n[i] & mask) << (e2e.BigNum.BASE_LEN - shift);
  }
  return result;
};


/**
 * Returns true if bit nth in the little-endian representation of this is set.
 * @param {number} n The bit number to test.
 * @return {boolean}
 */
e2e.BigNum.prototype.isBitSet = function(n) {
  // The digit where the bit lives.
  var i = (n / e2e.BigNum.BASE_LEN) | 0;
  // The position in that digit.
  var j = n % e2e.BigNum.BASE_LEN;
  // When i >= n.length returns 0.
  return (this.n[i] & (1 << j)) != 0;
};


/**
 * Returns true if this is even
 * @return {boolean}
 */
e2e.BigNum.prototype.isEven = function() {
  return (this.n[0] & 1) == 0;
};


/**
 * Returns true if this is odd
 * @return {boolean}
 */
e2e.BigNum.prototype.isOdd = function() {
  return (this.n[0] & 1) != 0;
};


// Public constants.


/**
 * BigNum constant 0.
 */
e2e.BigNum.ZERO = e2e.BigNum.fromInteger(0);


/**
 * BigNum constant 1.
 */
e2e.BigNum.ONE = e2e.BigNum.fromInteger(1);


/**
 * BigNum constant 2.
 */
e2e.BigNum.TWO = e2e.BigNum.fromInteger(2);
