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
 *
 * @fileoverview Representation of the NIST elliptic curve y^2 = x^3 - 3*x + B
 * defined over a prime field.
 *
 * @author thaidn@google.com (Thai Duong).
 */

goog.provide('e2e.ecc.curve.Nist');

goog.require('e2e.BigNum');
goog.require('e2e.ecc.Element');
goog.require('e2e.ecc.curve.Curve');
goog.require('e2e.ecc.point.Nist');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('goog.asserts');



/**
 * Constructs a NIST elliptic curve defined over a prime field.
 *
 * @constructor
 * @extends {e2e.ecc.curve.Curve}
 * @param {!e2e.BigPrimeNum} q The modulus of the prime field.
 * @param {!e2e.BigNum} b The B coefficient in the elliptic equation,
 *     represented as an array of bytes in little-endian order.
 */
e2e.ecc.curve.Nist = function(q, b) {
  e2e.ecc.curve.Nist.base(this, 'constructor', q);

  /**
   * The B value in the elliptic equation. It's an element in Fq.
   * @type {!e2e.ecc.Element}
   * @const
   */
  this.B = new e2e.ecc.Element(q, b);


  /**
   * The INFINITE point on the curve
   * @type {!e2e.ecc.point.Nist}
   * @const
   */
  this.INFINITY = new e2e.ecc.point.Nist(this,
      this.ONE, this.ZERO, this.ZERO);

  /**
   * If an element e has a square root, it must be e**SQUARE_ROOT_POWER_.
   * This is algorithm 3.36 in the Handbook of Applied Cryptography, which
   * handles q == 3 (mod 4).
   * @private {!e2e.BigNum}
   * const
   */
  this.SQUARE_ROOT_POWER_ = this.q.add(e2e.BigNum.ONE).shiftRight(2);
};
goog.inherits(e2e.ecc.curve.Nist, e2e.ecc.curve.Curve);


/** @override */
e2e.ecc.curve.Nist.prototype.pointFromByteArray = function(p) {
  goog.asserts.assertArray(p, 'Point should be defined.');
  if (p[0] == 0x04) {
    goog.asserts.assert(p.length % 2 == 1,
        'Point in uncompressed form should have an odd number of bytes.');

    var l = p.length - 1;
    var x = this.elementFromByteArray(p.slice(1, l / 2 + 1));
    var y = this.elementFromByteArray(p.slice(l / 2 + 1));
    var point = new e2e.ecc.point.Nist(this, x, y);
    if (!point.isOnCurve()) {
      throw new e2e.error.InvalidArgumentsError(
          'Point should lie on this curve.');
    }
    return point;
  } else if (p[0] == 0x02 || p[0] == 0x03) {
    // compressed notation
    var x = this.elementFromByteArray(p.slice(1));
    return this.pointFromXCoordinate_(x, p[0]);
  } else {
    throw new e2e.error.InvalidArgumentsError('Bad argument');
  }
};


/** @override */
e2e.ecc.curve.Nist.prototype.keySizeInBits = function() {
  return this.q.getBitLength();
};


/**
 * Returns true if this curve is equal to another curve.
 * @param {!e2e.ecc.curve.Nist} that The curve to compare.
 * @return {boolean}
 */
e2e.ecc.curve.Nist.prototype.isEqual = function(that) {
  if (this === that) {
    return true;
  }
  return this.q.isEqual(that.q) && this.B.isEqual(that.B);
};


/**
 * Returns the point with the specified x coordinate. The resulting y must
 * have the same parity (odd or even) as the "parity" argument.
 *
 * @param {!e2e.ecc.Element} x the x coordinate
 * @param {number} parity
 * @return {!e2e.ecc.point.Point} the point with the specified x coordinate.
 * @private
 */
e2e.ecc.curve.Nist.prototype.pointFromXCoordinate_ = function(
    x, parity) {
  goog.asserts.assert(this.q.n[0] & 3 == 3,
      'Do not know how to take square root in this prime number field.');
  // y*2 = x*3 - 3*x + b;
  var yy = x.square().multiply(x).
      subtract(x.add(x).add(x)).
      add(this.B);
  // If a square root exists, one of them has the value
  //     yy ^ ((q + 1) / 4)
  var y = yy.power(this.SQUARE_ROOT_POWER_);
  if (!y.square().isEqual(yy)) {
    throw new e2e.error.InvalidArgumentsError(
        'No point with this x coordinate exists');
  }
  if ((y.toBigNum().n[0] ^ parity) & 1) {
    // We got the odd y, but wanted even, or vice versa.
    if (y.isEqual(this.ZERO)) {
      // I think this is impossible.  But just in case.
      throw new e2e.error.InvalidArgumentsError(
          'No odd point with this x coordinate exists');
    }
    y = y.negate();
  }
  var point = new e2e.ecc.point.Nist(this, x, y);
  goog.asserts.assert(point.isOnCurve(), 'pointFromXCoordinate_ broken');
  return point;
};
