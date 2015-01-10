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
 * @fileoverview Basic arithmetic operations for big numbers used as modulus
 * in modular arithmetic.
 * @author mschilder@google.com (Marius Schilder).
 */

goog.provide('e2e.BigNumModulus');

goog.require('e2e.BigNum');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('goog.asserts');



/**
 * BigNumModuluses are odd BigNums that could be used as the modulus in modular
 * arithmetic operations in crypto schemes such as RSA.
 * @param {(!e2e.ByteArray|!Uint8Array)} modulus The value of the BigNum in big
 *     endian.
 * @param {!e2e.ByteArray=} opt_RR The precomputed Montgomery constant.
 *     RR is usually (1 << 2|N|) mod N, where N is the modulus and |N| is its
 *     length in bits. Usually |N| is the key size, but this library actually
 *     stores N as a ((key_size / 8 + 2) / 3 * 24)-bit number.
 * @constructor
 * @extends {e2e.BigNum}
 */
e2e.BigNumModulus = function(modulus, opt_RR) {
  e2e.BigNumModulus.base(this, 'constructor', modulus);

  // TODO(thaidn): do we really need to drop leading zeros here?
  this.dropLeadingZeros();
  // Modulus specific initialization.
  this.inverseModulus_ = this.computeInverseModulus_();
  if (goog.isDef(opt_RR)) {
    this.rr_ = new e2e.BigNum(opt_RR);
  } else {
    this.rr_ = this.computeRR_();
  }
  this.R_ = this.montMul1_(this.rr_);

  /**
   * @private
   * @type {e2e.FastModulus}
   */
  this.fastModulus_;
};
goog.inherits(e2e.BigNumModulus, e2e.BigNum);


/**
 * Enable this bignum to perform fast modulus operations by specifying the type
 * of FastModulusType we should create
 *
 * @param {function(new:e2e.FastModulus, !e2e.BigNum)} fastType
 */
e2e.BigNumModulus.prototype.setFastModulusType = function(fastType) {
  goog.asserts.assert(this.fastModulus_ == null, 'Fast modulus already set');
  this.fastModulus_ = new fastType(this);
};


/**
 * Enable this bignum to perform fast modulus operations by specifying the type
 * of FastModulusType we should create
 *
 * @param {e2e.FastModulus} fastModulus
 */
e2e.BigNumModulus.prototype.setFastModulus = function(fastModulus) {
  goog.asserts.assert(this.fastModulus_ == null, 'Fast modulus already set');
  this.fastModulus_ = fastModulus;
};


/**
 * Creates a BigNumModulus from a BigNum
 *
 * @param {!e2e.BigNum} bignum number to clone.
 * @return {!e2e.BigNumModulus} a new object.
 */
e2e.BigNumModulus.fromBigNum = function(bignum) {
  return new e2e.BigNumModulus(bignum.toByteArray());
};


/**
 * Calculates base ^ exp mod this. Input and output are big endian.
 * @param {!e2e.ByteArray|!Uint8Array} base Base.
 * @param {!e2e.ByteArray|!Uint8Array} exp Exponent.
 * @return {!e2e.ByteArray} Result of modular exponentiation.
 */
e2e.BigNumModulus.prototype.pow = function(base, exp) {
  var base_ = new e2e.BigNum(base);
  return this.modPower(base_, exp).toByteArray();
};


/**
 * Calculates base ^ 3 mod this. Input and output are big endian.
 * @param {!e2e.ByteArray} base Base.
 * @return {!e2e.ByteArray} Result of modular exponentiation.
 */
e2e.BigNumModulus.prototype.pow3 = function(base) {
  var base_ = new e2e.BigNum(base);
  return this.modExp3_(base_).toByteArray();
};


/**
 * Calculates a * b mod this. Input and output are big endian.
 * @param {!e2e.ByteArray} a Multiplicand.
 * @param {!e2e.ByteArray} b Multiplicator.
 * @return {!e2e.ByteArray} Result of multiplication mod this.
 */
e2e.BigNumModulus.prototype.mul = function(a, b) {
  var a_ = new e2e.BigNum(a);
  var b_ = new e2e.BigNum(b);
  return this.modMul_(a_, b_).toByteArray();
};


/**
 * Calculates a + b mod this.
 * @param {!e2e.BigNum} a First addend. Must be less than this.
 * @param {!e2e.BigNum} b Second addend. Must be less than this.
 * @return {!e2e.BigNum} Result of addition mod this.
 */
e2e.BigNumModulus.prototype.modAdd = function(a, b) {
  if (!(a.compare(this) < 0 && b.compare(this) < 0)) {
    throw new e2e.error.InvalidArgumentsError(
        'Arguments must be in valid range.');
  }

  var sum = a.add(b);
  return sum.subtractIfGreaterOrEqual(this).setSize(this.n.length);
};


/**
 * Calculates a - b mod this.
 * @param {!e2e.BigNum} a Minuend.  Must be less than this.
 * @param {!e2e.BigNum} b Subtrahend.  Must be less than this.
 * @return {!e2e.BigNum} Result of subtraction mod this.
 */
e2e.BigNumModulus.prototype.modSubtract = function(a, b) {
  if (!(a.compare(this) < 0 && b.compare(this) < 0)) {
    throw new e2e.error.InvalidArgumentsError(
        'Arguments must be in valid range.');
  }

  var result = a.add(this).subtract(b);
  return result.subtractIfGreaterOrEqual(this).setSize(this.n.length);
};


/**
 * Calculates base ^ exp mod this.
 * @param {!e2e.BigNum} base Base.
 * @param {(!e2e.ByteArray|!e2e.BigNum|!Uint8Array)} exp Exponent.
 * @return {!e2e.BigNum} Result of modular exponentiation.
 */
e2e.BigNumModulus.prototype.modPower = function(base, exp) {
  if (exp instanceof e2e.BigNum) {
    exp = exp.toByteArray();
  }
  return this.modExp_(base, exp);
};


/**
 * Calculates a * b mod this. Input and output are big endian.
 * @param {!e2e.BigNum} a Multiplicand.
 * @param {!e2e.BigNum} b Multiplicator.
 * @return {!e2e.BigNum} Result of multiplication mod this.
 */
e2e.BigNumModulus.prototype.modMultiply = function(a, b) {
  if (!(a.compare(this) < 0 && b.compare(this) < 0)) {
    throw new e2e.error.InvalidArgumentsError(
        'Arguments must be in valid range.');
  }

  // Perform the multiply using Montgomery reduction.
  return this.modMul_(a, b);
};


/**
 * Calculates value mod this.
 * @param {!e2e.BigNum} value .
 * @return {!e2e.BigNum} value % this.
 */
e2e.BigNumModulus.prototype.residue = function(value) {
  if (this.fastModulus_) {
    return this.fastModulus_.residue(value);
  }
  return value.mod(this);
};


/**
 * Calculates a * b mod this.
 * @param {!e2e.BigNum} a Multiplicand.
 * @param {!e2e.BigNum} b Multiplicator.
 * @return {!e2e.BigNum} The result of the multiplication.
 * @private
 */
e2e.BigNumModulus.prototype.modMul_ = function(a, b) {
  var bR = this.montMul_(b, this.rr_);
  var r = this.montMul_(a, bR);
  return r;
};


/**
 * Calculates base^3 mod this.
 * @param {!e2e.BigNum} base The base.
 * @return {!e2e.BigNum} Result.
 * @private
 */
e2e.BigNumModulus.prototype.modExp3_ = function(base) {
  // accu = base * RR * 1/R = base * R mod this.
  var accu = this.montMul_(base, this.rr_);
  // result = accu * accu * 1/R = base^2 * R mod this.
  var square = this.montMul_(accu, accu);
  // result = square * base * 1/R = base^3 mod this.
  this.montMul_(square, base, accu);
  return accu;
};


/**
 * Internal modular exponentiation implementation.
 * @param {!e2e.BigNum} input Input.
 * @param {!e2e.ByteArray|!Uint8Array} exp Exponent.
 * @return {!e2e.BigNum}
 * @private
 */
e2e.BigNumModulus.prototype.modExp_ = function(input, exp) {
  // base = input * RR * 1/R = input * R mod M
  var base = this.montMul_(input, this.rr_);
  // Compute exponent window, 4 bits wide.
  var lookup = new Array(16);
  // lookup[0] = 1 * R mod M
  lookup[0] = this.R_;
  for (var i = 1; i < 16; ++i) {
    // lookup[i] = lookup[i-1] * base = base ^ i
    lookup[i] = this.montMul_(base, lookup[i - 1]);
  }

  var tmp = e2e.BigNum.createBigNumOfSize(this.n.length);
  // accu =  R mod M
  var accu = this.R_.clone();
  var n = exp.length;
  // We calculate (input * R) ^ exp byte by byte.
  for (var e = 0; e < n; ++e) {
    // The base of exp is 256 (8 bits), so multiply by accu ^ 256.
    // accu = ((input * R) ^ exp[e]) * (accu ^ 256)
    // We precalculate first 16 powers of input * R, so we do it in two steps.
    this.montMul_(accu, accu, tmp);
    this.montMul_(tmp, tmp, accu);
    this.montMul_(accu, accu, tmp);
    this.montMul_(tmp, tmp, accu);
    this.montMul_(accu, lookup[(exp[e] >> 4) & 15], tmp);
    this.montMul_(tmp, tmp, accu);
    this.montMul_(accu, accu, tmp);
    this.montMul_(tmp, tmp, accu);
    this.montMul_(accu, accu, tmp);
    this.montMul_(tmp, lookup[exp[e] & 15], accu);
  }

  // We are finished, let's calculate result = accu * R * 1 / R = accu mod M
  this.montMul1_(accu, tmp);
  return tmp;
};


/**
 * Demontgomerize a number.  To divide the number by R = (2^24)^(this.n.length),
 * we repeatedly divide it by 2^24.
 * @param {e2e.BigNum} b Number to multiply.
 * @param {e2e.BigNum=} opt_c Output.
 * @return {!e2e.BigNum} Result of multiplication.
 * @private
 */
e2e.BigNumModulus.prototype.montMul1_ = function(b, opt_c) {
  var n = this.n.length;
  var c = opt_c || e2e.BigNum.createBigNumOfSize(n);
  for (var i = 0; i < n; ++i) {
    c.n[i] = b.n[i];
  }
  for (var i = 0; i < n; ++i) {
    this.montMulReduce_(c);
  }
  this.montMulNormalize_(c, n);
  return c;
};


/**
 * Montgomery multiplication (see HAC 14.36).
 * Compute c[] = a[] * b[] / R mod this
 * Note that c cannot be a or b. a can be small.
 * @param {e2e.BigNum} a Multiplicand.
 * @param {e2e.BigNum} b Multiplicator.
 * @param {e2e.BigNum=} opt_c Result.
 * @return {!e2e.BigNum} Multiplication.
 * @private
 */
e2e.BigNumModulus.prototype.montMul_ = function(a, b, opt_c) {
  var n = this.n.length;
  var c = opt_c || e2e.BigNum.createBigNumOfSize(n);
  for (var i = 0; i < n; ++i) {
    c.n[i] = 0;
  }

  for (var i = 0; i < n; ++i) {
    this.montMulAdd_(a.n[i] | 0, b, c);
  }
  this.montMulNormalize_(c, n);
  return c;
};


/**
 * Calculates (a * b[] + c[])/ 2^24 mod this.
 * @param {!number} a Multiplicand.
 * @param {e2e.BigNum} b Multiplicator.
 * @param {e2e.BigNum} c Accumulator.
 * @private
 */
e2e.BigNumModulus.prototype.montMulAdd_ = function(a, b, c) {
  // Montgomery Reduction. See HAC 14.29, HAC 14.32 and HAC 14.36.
  var A = a * b.n[0] + c.n[0];
  var U = ((A & e2e.BigNum.BASE_MASK) * this.inverseModulus_) &
      e2e.BigNum.BASE_MASK;
  A = A + U * this.n[0];

  var i = 1;
  var n = this.n.length;
  for (; i < n; ++i) {
    A = ((A / e2e.BigNum.BASE) | 0) + a * (b.n[i] | 0) + c.n[i] +
        U * this.n[i];
    c.n[i - 1] = A & e2e.BigNum.BASE_MASK;
  }
  c.n[i - 1] = ((A / e2e.BigNum.BASE) | 0);
};


/**
 * Calculates c[] / 2^24 mod this.  This is the same code as montMulAdd_, but
 * optimized for a = 0. The incoming accumulator must be the
 * same length as this.
 * @param {e2e.BigNum} c Accumulator.
 *     as this.n.length.
 * @private
 */
e2e.BigNumModulus.prototype.montMulReduce_ = function(c) {
  // Montgomery Reduction. See HAC 14.29, HAC 14.32 and HAC 14.36.
  var A = c.n[0];
  var U = (A * this.inverseModulus_) & e2e.BigNum.BASE_MASK;
  A = A + U * this.n[0];

  var i = 1;
  var n = this.n.length;
  for (; i < n; ++i) {
    A = ((A / e2e.BigNum.BASE) | 0) + c.n[i] + U * this.n[i];
    c.n[i - 1] = A & e2e.BigNum.BASE_MASK;
  }
  c.n[i - 1] = ((A / e2e.BigNum.BASE) | 0);
};


/**
 * Normalize the result of montMul_ or montMulAdd_.  The incoming bignum
 * yas have the same length as this, and is in the range
 * 0 <= c < 2 * this.  c might be a slightly malformed bignum in that its
 * high word will be in the range [0, 2^25).
 * @param {e2e.BigNum} c
 * @param {number} n
 * @private
 */
e2e.BigNumModulus.prototype.montMulNormalize_ = function(c, n) {
  var accu = 0;
  for (var i = 0; i < n; ++i) {
    accu += c.n[i] - this.n[i];
    c.n[i] = accu & e2e.BigNum.BASE_MASK;
    accu >>= 24;
  }
  var mask = accu >> 24;
  accu = 0;
  for (var i = 0; i < n; ++i) {
    accu += c.n[i] + (this.n[i] & mask);
    c.n[i] = accu & e2e.BigNum.BASE_MASK;
    accu >>= 24;
  }
};


/**
 * Computes RR = 1 << (2 * |modulus|), the Montgomery constant.
 * @return {!e2e.BigNum} The computed RR.
 * @private
 */
e2e.BigNumModulus.prototype.computeRR_ = function() {
  var n = this.n.length;
  var tmp = e2e.BigNum.createBigNumOfSize(2 * n + 1);
  for (var i = 0; i < 2 * n; ++i) {
    tmp.n[i] = 0;
  }
  tmp.n[2 * n] = 1;
  return tmp.mod(this);
};


/**
 * Computes the negative inverse of least significant digit of modulus.
 * That is m' = -m ^ -1 mod BASE used in reduction (see HAC 14.32).
 * @return {number} The negative inverse of the least significant digit.
 * @private
 */
e2e.BigNumModulus.prototype.computeInverseModulus_ = function() {
  var b = 1;
  var first = this.n[0];
  for (var c = 1; c < e2e.BigNum.BASE; c <<= 1) {
    if (b * first & c) {
      b |= c;
    }
  }
  return e2e.BigNum.BASE - b;
};

