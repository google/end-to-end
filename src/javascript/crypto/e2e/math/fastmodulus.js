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
 * Fast implementation of a%b for specific values of b that can take advantage
 * of special properties of that number.
 *
 * @author fy@google.com (Frank Yellin)
 */

goog.provide('e2e.FastModulus');
goog.provide('e2e.FastModulus.FFFFFF');
goog.provide('e2e.FastModulus.Ox1000000');


goog.require('e2e.BigNum');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('goog.asserts');



/**
 * Classes that implement FastModulus have a residue(value) method that can
 * quickly calculate value % modulus for a specific modulus.
 *
 * @interface
 */
e2e.FastModulus = function() {};


/**
 * Calculates value % modulus, for some fixed value of modulus.
 *
 * @param {!e2e.BigNum} value The value to take the residue of.
 * @return {!e2e.BigNum}
 */
e2e.FastModulus.prototype.residue = function(value) {};


/**
 * If true, the fastest way to calculate
 *      (a * b) % modulus
 * is to call
 *      this.residue(a.multiply(b)).
 * If false, Montgomery reduction is faster.
 *
 * @type {boolean}
 */
e2e.FastModulus.prototype.useForMultiplication;



/**
 * This class is the common superclass of FastModulus.FFFFFF and
 * FastModulus.Ox1000000, which have almost identical residue() methods.
 *
 * @constructor
 * @implements {e2e.FastModulus}
 * @param {!e2e.BigNum} modulus The modulus.
 * @param {number} shift The amount the modulus and dividend need to be shifted
 *     to be in the correct special form.
 */
e2e.FastModulus.SpecialForm = function(modulus, shift) {
  /** @override */
  this.useForMultiplication = false;

  /**
   * The modulus.
   * @private {!e2e.BigNum}
   */
  this.modulus_ = modulus;

  /**
   * The modulus shifted so that its high word has a special form
   * @private {!e2e.BigNum}
   */
  this.shiftedModulus_ = modulus.shiftLeft(shift);

  /**
   * Amount by which modulus_ is shifted left to get shiftedModulus_ .
   * @private {number}
   */
  this.shift_ = shift;
};


/** @override */
e2e.FastModulus.SpecialForm.prototype.residue = function(value) {
  var divisor = this.shiftedModulus_;
  var dividend = this.shift_ == 0 ?
      value.clone() : value.shiftLeft(this.shift_);
  var length = divisor.n.length;
  dividend.n.push(0);
  for (var delta = dividend.n.length - length - 1; delta >= 0; --delta) {
    // LOOP INVARIANT:  (where base = 2^24)
    //       dividend / (divisor * base^delta) < base.
    // Get the tentative quotient digit.  The actual quotient must either be
    // qhat or qhat - 1.
    var qhat = this.calculateQuotient(dividend, length + delta);
    // Subtract qhat * divisor * b^delta
    var accu = 0;
    for (var i = 0; i <= length; i++) {
      accu += dividend.n[i + delta] - (divisor.n[i] | 0) * qhat;
      dividend.n[i + delta] = accu & e2e.BigNum.BASE_MASK;
      accu = Math.floor(accu / e2e.BigNum.BASE);
    }
    goog.asserts.assert(accu == 0 || accu == -1);
    // Add divisor * b^delta back if the result went negative
    var mask = accu;
    accu = 0;
    for (var i = 0; i <= length; i++) {
      accu += dividend.n[i + delta] + (divisor.n[i] & mask);
      dividend.n[i + delta] = accu & e2e.BigNum.BASE_MASK;
      // accu is sum of two 24-bit values, so >>= is okay
      accu >>= e2e.BigNum.BASE_LEN;
    }
  }
  return dividend.shiftRight(this.shift_).cloneWithSize(
      this.modulus_.getSize());
};


/**
 * Returns a tentative quotient digit.  The correct quotient digit is either the
 * value returned by this method, or one less than the value returned.
 *
 * When this method is called, the loop invariant guarantees that
 *     dividend / (divisor * base ^ delta) < base    [base = 2^24]
 * and the correct quotient digit we seek is
 *     q = floor(dividend / (divisor * base ^ delta))
 * This method returns either q or q + 1, and always returns a value less
 * than base.
 *
 * @param {!e2e.BigNum} dividend The current dividend
 * @param {number} deltaPlusLength delta + length, where delta is the amount by
 *     which we are currently shifting the divisor, and length is the length, in
 *     base 2^24 words, of the divisor.
 */
e2e.FastModulus.SpecialForm.prototype.calculateQuotient =
    goog.abstractMethod;



/**
 * An implementation of FastModulus that handles the case in which the high
 * 24 bits of the modulus are all 1s.
 *
 * This is useful for the modulus and size of the NIST elliptic curves.
 *
 * We find the residue by repeatedly subtracting multiples of the divisor from
 * the dividend.  Since the first digit of the divisor is base - 1, the first
 * digit of the quotient must either be the first digit of the dividend, or one
 * greater.  We use one greater than the first digit as a tentative multiplier
 * and subtract the multiplier times the divisor from the dividend.  If the
 * result is negative, we add the divisor back in.
 *
 * Here is a base 100 example of 57998823 % 9963
 *   57 99 88 23
 *  -57 78 54            subtract divisor * 5800
 *   ===========
 *      21 34 23
 *     -21 91 86         subtract divisor * 22
 *         99 63         result went negative, add divisor back in
 *  ============
 *         42 00
 *
 * @constructor
 * @extends {e2e.FastModulus.SpecialForm}
 * @param {!e2e.BigNum} modulus The value of the BigNum for which we are
 *     building a fast modulus function.  Its 24 high order bits must be 1.
 */
e2e.FastModulus.FFFFFF = function(modulus) {
  var n = modulus.getBitLength();
  for (var i = n - e2e.BigNum.BASE_LEN; i < n; i++) {
    if (!modulus.isBitSet(i)) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Bignum must start with 0xFFFFFF.');
    }
  }
  var shift = (((n + e2e.BigNum.BASE_LEN - 1) /
      e2e.BigNum.BASE_LEN) | 0) * e2e.BigNum.BASE_LEN - n;
  e2e.FastModulus.FFFFFF.base(this, 'constructor', modulus, shift);
};
goog.inherits(e2e.FastModulus.FFFFFF,
    e2e.FastModulus.SpecialForm);


/** @override */
e2e.FastModulus.FFFFFF.prototype.calculateQuotient =
    function(dividend, deltaPlusLength) {
  // Nomenclature: b = 2^24,  Δ = delta, u = dividend, v = divisor, L = length
  // We are trying to find the next quotient digit q < b such that
  //     q = floor(u / (v b^Δ))
  // Since the high digit of the v is b-1,
  //     (1 - 1/b) b^L ≤ v < b^L.
  // Let t be the digit in the b^(L + Δ) place of u, so that
  //     t b^(L + Δ) ≤ u ≤ (t + 1) b^(L + Δ)
  // We know that t is a plausible quotient digit, because
  //     t v b^Δ < t b^L b^Δ = t^(L + Δ) ≤ u
  // We that that t + 2 is not a plausible quotient digit
  // because either t ≥ b - 2 (from the loop invariant q < b) or
  //     (t + 2) v b^Δ ≥ (t + 2)(1 - 1/b) b^(L + Δ)
  //                   = (t + 1 + (b - t - 2)/b) b^(L + Δ)
  //                   ≥ (t + 1) b^(L + Δ) > u
  return Math.min(
      dividend.n[deltaPlusLength] + 1, e2e.BigNum.BASE_MASK);
};



/**
 * An implementation of FastModulus that handles the case in which the high
 * bits of the modulus are a 1 followed by 24 zeros.
 *
 * This is useful for the order of the base point of Curve25519 and Ed25519.
 *
 * We find the residue by repeatedly subtracting multiples of the divisor from
 * the dividend.  Since the first digit of the divisor is 1, the first digit
 * of the quotient must either be the first digit of the dividend or one less
 * than that.  We use the the dividend digit as the multiplier and subtract
 * the multiplier times the divisor from the dividend.  If the result is
 * negative, we add the divisor back in.  [In rare cases, we end up with a
 * uncleared "1" from the previous digit, always followed by a 0.  The divisor
 * is base - 1 when that happens.  See example below.]
 *
 * Here is a base 100 example of 7647508816 % 10063
 *   76 47 50 88 16
 *  -76 47 88            subtract 760000 * 10063
 *    1 00 63            result went negatve, add back 10000 * 10063
 *  ===============
 *    1 00 25 88 16
 *     -99 62 37         hanging 100; subtract 99.00 * 1.00.63
 *  ===============
 *         63 51 16
 *        -63 39 69      subtract 63 * 1.00.63
 *  ===============
 *            11 47
 *
 * @constructor
 * @extends {e2e.FastModulus.SpecialForm}
 * @param {!e2e.BigNum} modulus The value of the BigNum for which we are
 *     building a fast modulus function.  Its 24 high order bits must be 1.
 */
e2e.FastModulus.Ox1000000 = function(modulus) {
  var n = modulus.getBitLength();
  for (var i = n - e2e.BigNum.BASE_LEN - 1; i < n - 1; i++) {
    if (modulus.isBitSet(i)) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Bignum must start with e2e.BigNum.BASE .');
    }
  }
  // expectedBitLength is the smallest value >= bitLength such that
  // expectedBitLength % e2e.BigNum.BASE_LEN == 1
  var expectedBitLength = (((n + e2e.BigNum.BASE_LEN - 2) /
      e2e.BigNum.BASE_LEN) | 0) * e2e.BigNum.BASE_LEN + 1;
  var shift = expectedBitLength - n;
  e2e.FastModulus.Ox1000000.base(this, 'constructor', modulus, shift);
};
goog.inherits(e2e.FastModulus.Ox1000000,
    e2e.FastModulus.SpecialForm);


/** @override */
e2e.FastModulus.Ox1000000.prototype.calculateQuotient =
    function(dividend, deltaPlusLength) {
  // Nomenclature: b = 2^24,  Δ = delta, u = dividend, v = divisor, L = length
  // We are trying to find the next quotient digit q < b such that
  //     q = floor(u / (v b^Δ))
  // Since the high digit of v is 1, and the next digit is 0:
  //     b^(L - 1) ≤ v < (1 + 1/b) b^(L - 1)
  // If u ≥ b^(L + Δ), the quotient digit q must be b - 1, since q < b and
  //     (b - 1) v b^Δ < (b - 1)(1 + 1/b) b^(L - 1) b^Δ
  //                   = (b - 1 + (b - 1)/b) b^(L - 1) b^Δ
  //                   < b b^(L + Δ - 1) = b^(L + Δ) ≤ v
  // Otherwise, let t be the digit in the b^(length + Δ - 1) place of u, i.e.
  //     t b^(L + Δ - 1) ≤ u < (t + 1) b^(L + Δ - 1)
  // We know that t + 1 is too large to be the quotient digit, because
  //     (t + 1) v b^Δ ≥ (t + 1) b^(L - 1) b^Δ > u
  // We also know that t - 1 is a possible quotient digit, because
  //     (t - 1) v b^Δ < (t - 1)(1 + 1/b) b^(L + Δ - 1)
  //                   = (t - 1 + (t - 1)/b) b^(L + Δ - 1)
  //                   < t b^(L + Δ - 1) ≤ u
  // Hence, the quotient must be t or t - 1.
  goog.asserts.assert(dividend.n[deltaPlusLength] == 0 ||
      dividend.n[deltaPlusLength - 1] == 0,
      'Dividend too large for invariant');
  var qhat = dividend.n[deltaPlusLength] * e2e.BigNum.BASE_MASK +
             dividend.n[deltaPlusLength - 1];
  return qhat;
};
