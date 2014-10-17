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
 * @fileoverview Representation of the DJB elliptic curve y^2 = x^3 + A x^2 + x
 * defined over a prime field.
 *
 * @author fy@google.com (Frank Yellin).
 */
goog.provide('e2e.ecc.curve.Curve25519');

goog.require('e2e.ecc.curve.Curve');
goog.require('e2e.ecc.point.Curve25519');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Constructs a DJB elliptic curve defined over a prime field.
 *
 * @constructor
 * @extends {e2e.ecc.curve.Curve}
 * @param {!e2e.BigPrimeNum} q The modulus of the prime field.
 */
e2e.ecc.curve.Curve25519 = function(q) {
  e2e.ecc.curve.Curve25519.base(this, 'constructor', q);

  // The A constant for Curve25519
  var a = 486662;

  /**
   * The A value in the elliptic equation. It's an element in Fq.
   * @type {!e2e.ecc.Element}
   * @const
   */
  this.A = this.elementFromInteger(a);

  /**
   * (A - 2)/4
   * @type {!e2e.ecc.Element}
   * @const
   */
  this.A4 = this.elementFromInteger((a - 2) / 4);

  /**
   * The Point with X coordinate 9.
   * Used as a base point in some calculations.
   * @type {!e2e.ecc.point.Curve25519}
   * @const
   */
  this.POINT_AT_NINE = new e2e.ecc.point.Curve25519(this,
      this.elementFromInteger(9));

  /**
   * The INFINITY point on the curve
   * @type {!e2e.ecc.point.Curve25519}
   * @const
   */
  this.INFINITY = new e2e.ecc.point.Curve25519(
      this, this.ONE, this.ZERO);
};
goog.inherits(e2e.ecc.curve.Curve25519, e2e.ecc.curve.Curve);


/** @override */
e2e.ecc.curve.Curve25519.prototype.pointFromByteArray = function(p) {
  // TODO(fy): Apparently DJB's reference implementation accepted
  // any 256-bit representation of an integer, and just used its value mod q.
  // The following code will give an error if value >= q, and in particular if
  // the high bit of p[31] is set.
  goog.asserts.assert(p.length == 32, 'Point length must be 32 bytes');
  p = goog.array.slice(p, 0).reverse();
  var x = this.elementFromByteArray(p);
  return new e2e.ecc.point.Curve25519(this, x);
};


/** @override */
e2e.ecc.curve.Curve25519.prototype.keySizeInBits = function() {
  return 256;
};


/**
 * Returns true if this curve is equal to another curve.
 * @param {!e2e.ecc.curve.Curve25519} that The curve to compare.
 * @return {boolean}
 */
e2e.ecc.curve.Curve25519.prototype.isEqual = function(that) {
  if (this === that) {
    return true;
  }
  return this.q.isEqual(that.q) && this.A.isEqual(that.A);
};
