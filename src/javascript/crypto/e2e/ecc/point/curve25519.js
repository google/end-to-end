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
 * @fileoverview Representation of a point on the elliptic curve Curve25519.
 * Formulas are provided by
 *     http://cr.yp.to/ecdh/curve25519-20051115.pdf
 *
 * @author fy@google.com (Frank Yellin).
 */

goog.provide('e2e.ecc.point.Curve25519');

goog.require('e2e.BigNum');
goog.require('e2e.ecc.point.Point');
goog.require('goog.asserts');



/**
 * Constructs a point on the elliptic curve Curve25519 defined over a
 * prime field.
 * @param {!e2e.ecc.curve.Curve25519} curve The curve.
 * @param {!e2e.ecc.Element} x The x Jacobian coordinate.
 * @param {!e2e.ecc.Element=} opt_z The optional z Jacobian coordinate.
 * @constructor
 * @extends {e2e.ecc.point.Point}
 */
e2e.ecc.point.Curve25519 = function(curve, x, opt_z) {
  e2e.ecc.point.Curve25519.base(
      this, 'constructor', curve);

  /**
   * @type {!e2e.ecc.curve.Curve25519}
   */
  this.curve = curve;

  var z = opt_z || curve.ONE;
  goog.asserts.assert(!x.isEqual(curve.ZERO) || !z.isEqual(curve.ZERO),
      '(0,0) point is undefined');
  /**
   * The x Jacobian projective coordinate of this.
   * @type {!e2e.ecc.Element}
   */
  this.x = x;

  /**
   * The z Jacobian projective coordinate of this.
   * @type {!e2e.ecc.Element}
   */
  this.z = z;

  /**
   * The equivalent affine Point.
   * @private {e2e.ecc.point.Curve25519}
   */
  this.affine_ = this.z.isEqual(curve.ONE) ? this : null;
};
goog.inherits(e2e.ecc.point.Curve25519, e2e.ecc.point.Point);


/** @override */
e2e.ecc.point.Curve25519.prototype.getX = function() {
  goog.asserts.assert(!this.isInfinity(),
      'Cannot obtain the affine coordinate of the point at infinity.');
  return this.getAffine_().x;
};


/**
 * Returns the x affine coordinate of this, with infinity converted to 0.
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.point.Curve25519.prototype.getX0 = function() {
  if (this.isInfinity()) {
    return this.curve.ZERO;
  } else {
    return this.getAffine_().x;
  }
};


/**
 * Returns the equivalent affine point.
 * @return {!e2e.ecc.point.Curve25519}
 * @private
 */
e2e.ecc.point.Curve25519.prototype.getAffine_ = function() {
  if (this.affine_ == null) {
    var x = this.x.multiply(this.z.inverse());
    this.affine_ = new e2e.ecc.point.Curve25519(this.curve, x);
  }
  return this.affine_;
};


/**
 * Returns true if this is the point at infinity.
 * @return {boolean}
 */
e2e.ecc.point.Curve25519.prototype.isInfinity = function() {
  // Infinity is the only Point with z == 0.
  return this.z.isEqual(this.curve.ZERO);
};


/** @override */
e2e.ecc.point.Curve25519.prototype.isIdentity = function() {
  // Infinity is identity point.
  return this.isInfinity();
};


/**
 * Compares another point with this. Return true if they are the same.
 * @param {!e2e.ecc.point.Curve25519} that The point to compare.
 * @return {boolean}
 */
e2e.ecc.point.Curve25519.prototype.isEqual = function(that) {
  if (this.isInfinity()) {
    return that.isInfinity();
  }
  if (that.isInfinity()) {
    return this.isInfinity();
  }
  // x and y coordinates must be equal
  return this.x.multiply(that.z).isEqual(that.x.multiply(this.z));
};


/**
 * @override
 */
e2e.ecc.point.Curve25519.prototype.toByteArray = function(
    opt_compressed) {
  var X = this.getX0().toBigNum().toByteArray().reverse();
  var fieldSize = Math.ceil(this.curve.keySizeInBits() / 8);
  // Pads X if needed.
  while (X.length < fieldSize) {
    X.push(0);
  }
  return X;
};


/** @override */
e2e.ecc.point.Curve25519.prototype.initializeForFastMultiply =
    function() {
};


/**
 * Doubles this, and return the result as a new point.
 * @return {!e2e.ecc.point.Curve25519}
 * @private
 */
e2e.ecc.point.Curve25519.prototype.twice_ = function() {
  var t1 = this.x.add(this.z).square();
  var t2 = this.x.subtract(this.z).square();
  var t3 = t1.subtract(t2);
  var xOut = t1.multiply(t2);
  var zOut = t3.multiply(t1.add(t3.multiply(this.curve.A4)));
  return new e2e.ecc.point.Curve25519(this.curve, xOut, zOut);
};


/**
 * Returns the value of this + that as a new point.  This method must not
 * be called if delta is infinity (i.e. this == that) or if delta is the zero
 * point.
 *
 * @param {!e2e.ecc.point.Curve25519} that
 * @param {!e2e.ecc.point.Curve25519} delta this - that
 * @return {!e2e.ecc.point.Curve25519}
 * @private
 */
e2e.ecc.point.Curve25519.prototype.add_ = function(that, delta) {
  // This formula work only if that - this is neither zero nor infinity
  goog.asserts.assert(!delta.x.isEqual(this.curve.ZERO));
  goog.asserts.assert(!delta.z.isEqual(this.curve.ZERO));
  var t1 = (this.x.subtract(this.z)).multiply(that.x.add(that.z));
  var t2 = (this.x.add(this.z)).multiply(that.x.subtract(that.z));
  var xOut = (t1.add(t2)).square().multiply(delta.z);
  var zOut = (t1.subtract(t2)).square().multiply(delta.x);
  return new e2e.ecc.point.Curve25519(this.curve, xOut, zOut);
};


/**
 * @override
 */
e2e.ecc.point.Curve25519.prototype.multiply = function(k) {
  // Normally, k > 0 and this isn't infinity or the zero point.  They are
  // included here for completeness.
  if (this.isInfinity() || k.isEqual(e2e.BigNum.ZERO)) {
    return this.curve.INFINITY;
  }
  if (this.x.isEqual(this.curve.ZERO)) {
    // The zero point has order 2.  It either returns itself or infinity.
    return k.isOdd() ? this : this.curve.INFINITY;
  }
  var m = [this, this.twice_()];
  for (var i = k.getBitLength() - 2; i >= 0; --i) {
    // Assertion.  Let j = k >>> i;  Then
    // m = j * this and m1 = (j + 1) * this;
    var bit = k.isBitSet(i) | 0;  // force boolean to 0 or 1.
    // Following code is cryptic because it has no branches.
    // If bit = 0, we want
    //      m[0] = old m[0] + old m[0];
    //      m[1] = old m[0] + old m[1];
    // If bit = 1, we want
    //      m[0] = old m[0] + old m[1];
    //      m[1] = old m[1] + old m[1]
    m[1 - bit] = m[0].add_(m[1], this);
    m[bit] = m[bit].twice_();
  }
  return m[0];
};
