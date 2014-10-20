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
 * @fileoverview Representation of the ED25519 elliptic curve
 *     -x^2 + y^2 = 1 + d x^2 y^2
 * defined over a prime field.
 *
 * These two papers give information on this category of elliptic curve.
 *
 * Twisted Edwards Curves
 *   http://eprint.iacr.org/2008/013.pdf
 * Twisted Edwards Curves Revisited
 *   http://eprint.iacr.org/2008/522.pdf
 *
 * This paper describes ED25519 specifically and describes its use for
 * signatures.
 *
 * High-speed high-security signatures
 *   http://ed25519.cr.yp.to/ed25519-20110926.pdf
 * @author fy@google.com (Frank Yellin).
 */

goog.provide('e2e.ecc.curve.Ed25519');

goog.require('e2e.BigNum');
goog.require('e2e.ecc.Element');
goog.require('e2e.ecc.curve.Curve');
goog.require('e2e.ecc.point.Ed25519');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('goog.asserts');



/**
 * Constructs an Edwards elliptic curve defined over a prime field.
 *
 * @constructor
 * @extends {e2e.ecc.curve.Curve}
 * @param {!e2e.BigPrimeNum} q The modulus of the prime field.
 */
e2e.ecc.curve.Ed25519 = function(q) {
  e2e.ecc.curve.Ed25519.base(this, 'constructor', q);


  /**
   * The D value in the elliptic equation, with value -121665/121666.
   * @type {!e2e.ecc.Element}
   * @const
   */
  this.D = this.elementFromInteger(121665).negate().multiply(
      this.elementFromInteger(121666).inverse());

  /**
   * The 2 * D
   * @type {!e2e.ecc.Element}
   * @const
   */
  this.D2 = this.D.shiftLeft(1);

  /**
   * If an element e has a square root, it must either be e^SQUARE_ROOT_POWER_
   * or (e^SQUARE_ROOT_POWER_) * SQUARE_ROOT_MINUS_ONE_.
   * Its value is (q + 3)/8.
   * This is algorithm 3.37 in the Handbook of Applied Cryptography, which
   * handles q == 5 (mod 8).
   * @const
   * @private {!e2e.BigNum}
   */
  this.SQUARE_ROOT_POWER_ =
      q.add(e2e.BigNum.fromInteger(3)).shiftRight(3);

  /**
   * Calculate 2 ^ ((q - 1)/4).
   * Since 2 is not a square in Fq, this is a square root of -1.
   * @private {!e2e.ecc.Element}
   */
  this.SQUARE_ROOT_MINUS_ONE_ = this.TWO.power(
      q.subtract(e2e.BigNum.ONE).shiftRight(2));

  var four = this.elementFromInteger(4);
  var five = this.elementFromInteger(5);
  /**
   * The point whose y coordinate is 4/5 and whose x coordinate is even
   * @type {!e2e.ecc.point.Ed25519}
   * @const
   */
  this.B = this.pointFromYCoordinate_(four.multiply(five.inverse()), 0);

  /**
   * The point at infinity
   * @type {!e2e.ecc.point.Ed25519}
   * @const
   */
  this.INFINITY = new e2e.ecc.point.Ed25519(this,
      this.ZERO, this.ZERO, this.ZERO, this.ZERO);

  /**
   * The additive identity
   * @type {!e2e.ecc.point.Ed25519}
   * @const
   */
  this.IDENTITY = new e2e.ecc.point.Ed25519(this,
      this.ZERO, this.ONE);


};
goog.inherits(e2e.ecc.curve.Ed25519, e2e.ecc.curve.Curve);


/** @override */
e2e.ecc.curve.Ed25519.prototype.pointFromByteArray = function(p) {
  goog.asserts.assert(p.length == 32, 'Point length must be 32 bytes');
  // Comes in little endian.  Reverse it to be big endian
  p = p.slice(0).reverse();
  // Bit 255 is actually the parity bit, and not part of the point
  var parity = (p[0] & 0x80) >> 7;
  p[0] &= 0x7F;
  var y = new e2e.ecc.Element(this.q, new e2e.BigNum(p));
  // Calculate and return the point, based on y and the parity
  return this.pointFromYCoordinate_(y, parity);
};


/** @override */
e2e.ecc.curve.Ed25519.prototype.keySizeInBits = function() {
  return 256;
};


/**
 * Returns a 32-byte little-endian byte array representing the value of the
 * bignum.
 * @param {!e2e.BigNum} bignum
 *
 * @return {!e2e.ByteArray}
 */
e2e.ecc.curve.Ed25519.prototype.littleEndianByteArray32FromBigNum =
    function(bignum) {
  var result = bignum.toByteArray().reverse();
  while (result.length < 32) {
    result.push(0);
  }
  return result;
};


/**
 * Returns true if this curve is equal to another curve.
 * @param {!e2e.ecc.curve.Ed25519} that The curve to compare.
 * @return {boolean}
 */
e2e.ecc.curve.Ed25519.prototype.isEqual = function(that) {
  if (this === that) {
    return true;
  }
  return this.q.isEqual(that.q);
};


/**
 * Returns the point with the specified y coordinate. The resulting x must
 * have the same parity (odd or even) as the "parity" argument.
 *
 * @param {!e2e.ecc.Element} y the y coordinate
 * @param {number} parity
 * @return {!e2e.ecc.point.Ed25519} the point with the specified x
 *     coordinate.
 * @private
 */
e2e.ecc.curve.Ed25519.prototype.pointFromYCoordinate_ = function(
    y, parity) {
  var yy = y.square();
  // y^2 - 1 == x^2(d y^2 + 1) is an equivalent equation
  var xx = yy.subtract(this.ONE).multiply(
      yy.multiply(this.D).add(this.ONE).inverse());
  var x = xx.power(this.SQUARE_ROOT_POWER_);
  if (!x.multiply(x).isEqual(xx)) {
    x = x.multiply(this.SQUARE_ROOT_MINUS_ONE_);
    if (!x.multiply(x).isEqual(xx)) {
      throw new e2e.error.InvalidArgumentsError('Bad argument');
    }
  }
  if ((x.toBigNum().isOdd() ^ parity) & 1) {
    // We got the odd x, but wanted even, or vice versa.
    if (x.isEqual(this.ZERO)) {
      throw new e2e.error.InvalidArgumentsError(
          'No odd point with this y coordinate exists');
    }
    x = x.negate();
  }
  return new e2e.ecc.point.Ed25519(this, x, y);
};
