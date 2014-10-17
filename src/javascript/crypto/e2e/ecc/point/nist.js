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
 * @fileoverview Representation of a point on the NIST elliptic curve defined
 * over a prime field.  Point arithmetics for NIST curves are performed using
 * explicit formulas provided by
 *     http://hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html.
 *
 * @author thaidn@google.com (Thai Duong).
 * @author fy@google.com (Frank Yellin).
 */

goog.provide('e2e.ecc.point.Nist');

goog.require('e2e.BigNum');
goog.require('e2e.ecc.Element');
goog.require('e2e.ecc.point.Point');
goog.require('e2e.fixedtiming');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Constructs a point on the elliptic curve y^2 = x^3 - 3*x + B defined
 *     over a prime field.
 * @param {!e2e.ecc.curve.Curve} curve The curve.
 * @param {!e2e.ecc.Element} x The x Jacobian coordinate.
 * @param {!e2e.ecc.Element} y The y Jacobian coordinate.
 * @param {!e2e.ecc.Element=} opt_z The optional z Jacobian coordinate.
 * @constructor
 * @extends {e2e.ecc.point.Point}
 */
e2e.ecc.point.Nist = function(curve, x, y, opt_z) {
  e2e.ecc.point.Nist.base(this, 'constructor', curve);

  /**
   * The x Jacobian projective coordinate of this.
   * @type {!e2e.ecc.Element}
   */
  this.x = x;

  /**
   * The y Jacobian projective coordinate of this.
   * @type {!e2e.ecc.Element}
   */
  this.y = y;

  /**
   * The z Jacobian projective coordinate of this.
   * @type {!e2e.ecc.Element}
   */
  this.z = opt_z || this.curve.ONE;

  /**
   * The equivalent affine Point.
   * @type {e2e.ecc.point.Nist}
   */
  this.affine = this.z.isEqual(this.curve.ONE) ? this : null;
};
goog.inherits(e2e.ecc.point.Nist, e2e.ecc.point.Point);


/**
 * @type {Array.<!Array.<!e2e.ecc.point.Nist>>}
 * @private
 */
e2e.ecc.point.Nist.prototype.fastMultiplyTable_;


/**
 * @type {Array.<!e2e.ecc.point.Nist>}
 * @private
 */
e2e.ecc.point.Nist.prototype.smallMultiplyTable_;


/**
 * Returns a copy of this point.
 * @return {!e2e.ecc.point.Nist}
 */
e2e.ecc.point.Nist.prototype.clone = function() {
  return new e2e.ecc.point.Nist(
      this.curve, this.x.clone(), this.y.clone(), this.z.clone());
};


/** @override */
e2e.ecc.point.Nist.prototype.getX = function() {
  // Converts the point to affine form, and then extracts the X coordinate
  goog.asserts.assert(!this.isInfinity(),
      'Cannot obtain the affine coordinate of the point at infinity.');
  var affine = this.getAffine_();
  goog.asserts.assert(goog.isDefAndNotNull(affine.x),
      'Element X of affine must not be null.');
  return affine.x;
};


/** @override */
e2e.ecc.point.Nist.prototype.getY = function() {
  // Converts the point to affine form, and then extracts the Y coordinate
  goog.asserts.assert(!this.isInfinity(),
      'Cannot obtain the affine coordinate of the point at infinity.');
  var affine = this.getAffine_();
  goog.asserts.assert(goog.isDefAndNotNull(affine.y),
      'Element Y of affine must not be null.');
  return affine.y;
};


/**
 * Returns the equivalent affine point.
 * @return {!e2e.ecc.point.Nist}
 * @private
 */
e2e.ecc.point.Nist.prototype.getAffine_ = function() {
  if (this.affine_ == null) {
    var zInv = this.z.inverse();
    var zInv2 = zInv.square();
    var x = this.x.multiply(zInv2);
    var y = this.y.multiply(zInv2.multiply(zInv));
    this.affine_ =
        new e2e.ecc.point.Nist(this.curve, x, y, this.curve.ONE);
  }
  return this.affine_;
};


/**
 * Returns true if this is the point at infinity.
 * @return {boolean}
 */
e2e.ecc.point.Nist.prototype.isInfinity = function() {
  // Infinity is the only Point with z == 0.
  return this.z.isEqual(this.curve.ZERO);
};


/** @override */
e2e.ecc.point.Nist.prototype.isIdentity = function() {
  // Infinity is identity point.
  return this.isInfinity();
};


/**
 * Compares another point with this. Return true if they are the same.
 * @param {!e2e.ecc.point.Nist} that The point to compare.
 * @return {boolean}
 */
e2e.ecc.point.Nist.prototype.isEqual = function(that) {
  // x and y coordinates must be equal
  var z1z1 = this.z.square();
  var z2z2 = that.z.square();
  return this.x.multiply(z2z2).isEqual(that.x.multiply(z1z1)) &&
         this.y.multiply(z2z2.multiply(that.z)).
             isEqual(that.y.multiply(z1z1.multiply(this.z)));
};


/**
 * Returns a new point which is a negative of this.
 * @return {!e2e.ecc.point.Nist}
 */
e2e.ecc.point.Nist.prototype.negate = function() {
  return new e2e.ecc.point.Nist(this.curve, this.x, this.y.negate(),
      this.z);
};


/** @override */
e2e.ecc.point.Nist.prototype.toByteArray = function(opt_compressed) {
  var X = this.getX().toBigNum().toByteArray();
  var fieldSize = Math.ceil(this.curve.keySizeInBits() / 8);
  // Pads X if needed.
  while (X.length < fieldSize) {
    goog.array.insertAt(X, 0x00, 0);
  }
  if (!opt_compressed) {
    // Pads Y if needed.
    var Y = this.getY().toBigNum().toByteArray();
    while (Y.length < fieldSize) {
      goog.array.insertAt(Y, 0x00, 0);
    }
    var r = [0x4];
    goog.array.extend(r, X);
    goog.array.extend(r, Y);
    return r;
  } else {
    // 0x2 if y is even, 0x3 if y is odd.
    var r = [0x2 + (this.getY().toBigNum().isOdd() & 1)];
    goog.array.extend(r, X);
    return r;
  }
};


/**
 * Adds another point to this, and return the new point. This is the group
 * operation.
 * Note that this function leaks timing side-channel. We use it only to
 * calculate public points.
 * @param {!e2e.ecc.point.Nist} that The point to add.
 * @return {!e2e.ecc.point.Nist}
 */
e2e.ecc.point.Nist.prototype.add = function(that) {
  goog.asserts.assertObject(that, 'Point should be defined.');
  goog.asserts.assert(that.curve.isEqual(this.curve),
      'Cannot add points from different curves.');

  if (this.isInfinity()) {
    return that;
  }
  if (that.isInfinity()) {
    return this;
  }

  var Z1Z1 = this.z.square();
  var Z2Z2 = that.z.square();
  if (this.x.multiply(Z2Z2).isEqual(that.x.multiply(Z1Z1))) {
    // this.getX() == that.getX().  Either this==that or this==-that.
    // Compare the y values to see which is the case.
    if (this.y.multiply(Z2Z2.multiply(that.z)).isEqual(
        that.y.multiply(Z1Z1.multiply(this.z)))) {
      // this.getY() == that.getY().  So same point
      return this.twice_();
    } else {
      // this = -that
      return this.curve.INFINITY;
    }
  }

  // Check for special cases that might have faster formulas.
  if (this.z.isEqual(that.z)) {
    if (this.z.isEqual(this.curve.ONE)) {
      // Add two affine points.
      return this.addAffine_(that);
    }
    return this.addSameZ_(that);
  } else if (that.z.isEqual(this.curve.ONE)) {
    // Add mixed Jacobian and affine coordinates.
    return this.addMixed_(that);
  }

  return this.add_(that);
};


/**
 * Adds another point to this, and return the new point.
 * @param {!e2e.ecc.point.Nist} that The point to add.
 * @return {!e2e.ecc.point.Nist}
 * Note that this function does not handle P+P, infinity+P or P+infinity
 * correctly.
 * @private
 */
e2e.ecc.point.Nist.prototype.add_ = function(that) {
  var Z1Z1 = this.z.square();
  var Z2Z2 = that.z.square();

  var U1 = this.x.multiply(Z2Z2);
  var U2 = that.x.multiply(Z1Z1);
  var S1 = this.y.multiply(that.z).multiply(Z2Z2);
  var S2 = that.y.multiply(this.z).multiply(Z1Z1);
  var H = U2.subtract(U1);
  var I = H.shiftLeft(1).square();
  var J = H.multiply(I);
  var V = U1.multiply(I);
  var r = S2.subtract(S1).shiftLeft(1);
  var X3 = r.square().subtract(J).subtract(V.shiftLeft(1));
  var Y3 = r.multiply(V.subtract(X3)).subtract(S1.multiply(J).shiftLeft(1));
  var Z3 =
      this.z.add(that.z).square().subtract(Z1Z1).subtract(Z2Z2).multiply(H);
  return new e2e.ecc.point.Nist(this.curve, X3, Y3, Z3);
};


/**
 * Doubles this, and return the new point.
 * @return {!e2e.ecc.point.Nist}
 * @private
 */
e2e.ecc.point.Nist.prototype.twice_ = function() {
  if (this.affine_ != null) {
    // Either this affine (Z == 1) or we have already calculated the
    // this's affine equivalent.
    return this.affine_.doubleAffine_();
  }
  // Cost: 3M + 5S.
  var delta = this.z.square();
  var alpha = this.curve.THREE
      .multiply(this.x.subtract(delta))
      .multiply(this.x.add(delta));
  var gamma = this.y.square();
  var beta = this.x.multiply(gamma);
  var X3 = alpha.square().subtract(beta.shiftLeft(3));
  var Y3 = alpha.multiply(beta.shiftLeft(2).subtract(X3)).subtract(
      gamma.square().shiftLeft(3));
  var Z3 = this.y.add(this.z).square().subtract(gamma).subtract(delta);
  return new e2e.ecc.point.Nist(this.curve, X3, Y3, Z3);
};


/**
 * @override
 */
e2e.ecc.point.Nist.prototype.multiply = function(k) {
  if (this.fastMultiplyTable_) {
    return this.fastMultiply_(k);
  }

  // In every non-test occurrence of .multiply(), "this" is either
  // the generator or another user's public key. It make sense to cache
  // the small multiplication table, since these points will likely have
  // further multiplies applied to them.
  var powers = this.smallMultiplyTable_;
  if (!powers) {
    // Create a table consisting of 1 * this through 8 * this
    powers = new Array(9);
    powers[1] = this;
    for (var i = 2; i < 9; i++) {
      powers[i] = powers[i - 1].add(this);
    }
    this.smallMultiplyTable_ = powers;
  }
  var acc = this.curve.INFINITY.clone();
  var accIsInfinityMask = -1;
  var multiplierIsInfinityMask;
  var mask;
  // k should have the same size as the order of the group, which isn't easily
  // accessible from here. Fortunately in NIST curves the order of the group
  // has the same length as the modulus.
  var nybbles = k.cloneWithSize(this.curve.q.getSize()).toSignedNybbleArray();
  // Perform a high-end to low-end signed-nybble-at-a-time multiplication.
  for (var i = nybbles.length - 1; i >= 0; --i) {
    // ASSERT:
    //   acc = sum(nybbles[j] * 16**(j - i - 1), i < j < nybbles.length) * this
    acc = acc.twice_().twice_().twice_().twice_();
    // ASSERT:
    //   acc = sum(nybbles[j] * 16**(j - i), i < j < nybbles.length) * this
    // multiplier = (nybble[i] * (16^i)) * this
    var multiplier = this.selectFromFastMultiplyTable_(powers, nybbles[i] | 0);
    var temp = acc.add_(multiplier);
    acc.x.copyConditionally(multiplier.x, accIsInfinityMask);
    acc.y.copyConditionally(multiplier.y, accIsInfinityMask);
    acc.z.copyConditionally(multiplier.z, accIsInfinityMask);
    multiplierIsInfinityMask = e2e.fixedtiming.select(
        -1, 0, ((nybbles[i] | 0) === 0) | 0);
    mask = ~multiplierIsInfinityMask & ~accIsInfinityMask;
    acc.x.copyConditionally(temp.x, mask);
    acc.y.copyConditionally(temp.y, mask);
    acc.z.copyConditionally(temp.z, mask);
    accIsInfinityMask &= multiplierIsInfinityMask;

    // ASSERT:
    //   acc = sum(nybbles[j] * 16**(j - i), i <= j < nybbles.length) * this
  }
  return acc;
};


/**
 * Determines if this point is on this elliptic curve.
 * @return {boolean}
 */
e2e.ecc.point.Nist.prototype.isOnCurve = function() {
  if (this.isInfinity()) {
    return true;
  }
  var affine = this.getAffine_();
  // Y^2 = X^3 - 3 X + B
  var left = affine.y.square();
  var X = affine.x;
  var right = X.square().multiply(X)
      .subtract(X.add(X).add(X))
      .add(this.curve.B);
  return left.isEqual(right);
};


/**
 * Create a table
 * @return {!Array.<!Array.<!e2e.ecc.point.Nist>>}
 */
e2e.ecc.point.Nist.prototype.createFastMultiplyTable = function() {
  var bits = this.curve.keySizeInBits();
  var nybbleCount = Math.ceil((bits + 1) / 4);  // sign can add one more bit
  var unsignedNybbleCount = Math.ceil(bits / 4);
  var table = [];
  for (var power = 0; power < nybbleCount; power++) {
    // table[power][i] = (i * (16^power)) * this
    table[power] = [];
    table[power][0] = this.curve.INFINITY;
    if (power == 0) {
      table[power][1] = this;
    } else {
      table[power][1] = table[power - 1][8].twice_();
    }
    if (power == unsignedNybbleCount) {
      // This extra nybble is the result of an overflow that can happen when
      // going from unsigned digit to signed digit representation.
      // Its value can only be 0 or 1.
      continue;
    }
    for (var i = 2; i <= 8; i++) {
      table[power][i] = table[power][i - 1].add(table[power][1]);
    }
  }
  table.isConverted = true;
  table.isAffine = false;
  return table;
};


/**
 * @override
 */
e2e.ecc.point.Nist.prototype.initializeForFastMultiply = function() {
  var table = this.createFastMultiplyTable();
  goog.asserts.assert(this.isEqual(table[0][1]),
      'Fast Multiply table is being attached to the wrong point');
  this.fastMultiplyTable_ = table;
};


/**
 * Take a pre-constructed fast multiply table and convert it into a form so
 * that it can be attached to this point.
 * @param {!Array.<!Array.<
 *           (Array.<Array.<number>> | e2e.ecc.point.Nist)>>} table
 */
e2e.ecc.point.Nist.prototype.setFastMultiplyTable = function(table) {
  if (!table.isConverted) {
    var curve = this.curve;
    var newTable = goog.array.map(table, function(row) {
      return goog.array.map(row, function(encodedPoint) {
        if (encodedPoint == null) {
          return curve.INFINITY;
        }
        var x = e2e.BigNum.fromInternalArray(encodedPoint[0]);
        var y = e2e.BigNum.fromInternalArray(encodedPoint[1]);
        return new e2e.ecc.point.Nist(curve,
            new e2e.ecc.Element(curve.q, x),
            new e2e.ecc.Element(curve.q, y));
      });
    });
    // Splice the new table into the array where the old table was.
    goog.array.clear(table);
    goog.array.extend(table, newTable);
    table.isConverted = true;
    table.isAffine = true;  // Maybe we can use this fact in the future.
  }
  goog.asserts.assert(this.isEqual(
      /** @type {!e2e.ecc.point.Nist} */ (table[0][1])),
      'Fast Multiply table is being attached to wrong point');
  this.fastMultiplyTable_ = table;
};


/**
 * Calculate k * this, when this has a fast multiply table attached to it.
 *
 * @param {!e2e.BigNum} k
 * @return {!e2e.ecc.point.Nist} k * this
 * @private
 */
e2e.ecc.point.Nist.prototype.fastMultiply_ = function(k) {
  var table = this.fastMultiplyTable_;
  var nybbles = k.toSignedNybbleArray();
  // The definition of nybbles[] is:
  //    k = sum(nybbles[i] * 16**i) 0 <= i < nybbles.length
  // where each -8 <= nybbles[i] <= 8
  // So we also have
  //    k * this = (sum(nybbles[i] * 16**i)) * this
  //             = sum(nybbles[i] * 16**i * k)
  // The value in parentheses is a precomputed quantity.
  //     nybbles[i] > 0:    table[i][nybbles[i]]
  //     nybbles[i] < 0:    table[i][-nybbles[i]].negate();
  //     nybbles[i] = 0:    Infinity
  var acc = this.curve.INFINITY.clone();
  var accIsInfinityMask = -1;
  var multiplierIsInfinityMask;
  var mask;
  // We avoid timing attacks by always performing table.length additions,
  // even if nybbles.length is shorter
  for (var i = 0; i < table.length; i++) {
    // Don't let side-channel information leak regarding the index
    // that we are accessing.
    // multiplier = (nybbles[i] * (16^i)) * this
    var multiplier = this.selectFromFastMultiplyTable_(
        table[i], nybbles[i] | 0);
    // Because k is less than the order of the group, we know that
    // acc != multiplier, unless both are zero, which we handle below.
    var temp = acc.addMixed_(multiplier);
    // The result of addMixed is incorrect if acc is INFINITY. We handle that
    // situation by copying the point from the table.
    acc.x.copyConditionally(multiplier.x, accIsInfinityMask);
    acc.y.copyConditionally(multiplier.y, accIsInfinityMask);
    acc.z.copyConditionally(multiplier.z, accIsInfinityMask);
    // Equally, the result is also wrong if the point from the table is
    // INFINITY, which happens when the index is zero. We handle that by
    // only copying from temp to accu if index != 0.
    multiplierIsInfinityMask = e2e.fixedtiming.select(
        -1, 0, ((nybbles[i] | 0) === 0) | 0);
    // Only copy if multiplier != INFINITY && acc != INFINITY.
    mask = ~multiplierIsInfinityMask & ~accIsInfinityMask;
    acc.x.copyConditionally(temp.x, mask);
    acc.y.copyConditionally(temp.y, mask);
    acc.z.copyConditionally(temp.z, mask);
    // If multiplier != INFINITY, acc is now != INFINITY.
    accIsInfinityMask &= multiplierIsInfinityMask;
  }
  return acc;
};


/**
 * Returns the row[|index|] of the fast multiplication table as a Point.
 * This code is careful to touch every entry in the row in the exact same
 * order, independent of the value of we are fetching.
 *
 * @param {!Array.<e2e.ecc.point.Nist>} row
 *     A row of the fast multiply table
 * @param {number} index The index of the entry to fetch.
 * @return {!e2e.ecc.point.Nist} corresponding point.
 * @private
 */
e2e.ecc.point.Nist.prototype.selectFromFastMultiplyTable_ = function(
    row, index) {
  var absIndex = e2e.fixedtiming.select(index, -index, (index > 0) | 0);
  goog.asserts.assert(
      absIndex >= 0 && absIndex < row.length, 'Argument sanity');

  var length = this.curve.q.n.length;
  var x = e2e.BigNum.createBigNumOfSize(length);
  var y = e2e.BigNum.createBigNumOfSize(length);
  var z = e2e.BigNum.createBigNumOfSize(length);
  for (var i = 1; i < row.length; i++) {
    var mask = -(absIndex == i);    // index == i ? -1 : 0
    var element = row[i];
    for (var word = 0; word < length; word++) {
      x.n[word] |= element.x.toBigNum().n[word] & mask;
      y.n[word] |= element.y.toBigNum().n[word] & mask;
      z.n[word] |= element.z.toBigNum().n[word] & mask;
    }
  }
  var minusY = this.curve.q.modSubtract(e2e.BigNum.ZERO, y);
  var point = new e2e.ecc.point.Nist(this.curve,
      new e2e.ecc.Element(this.curve.q, x),
      new e2e.ecc.Element(this.curve.q,
          e2e.BigNum.select(y, minusY, (index > 0) | 0)),
      new e2e.ecc.Element(this.curve.q, z));
  return point;
};


/**
 * Doubles this, which has affine coordinates (e.g., Z = 1), and return the new
 *     point. This should cost 1M + 5S.
 * @return {!e2e.ecc.point.Nist}
 * @private
 */
e2e.ecc.point.Nist.prototype.doubleAffine_ = function() {
  goog.asserts.assert(this.z.isEqual(this.curve.ONE),
      'Point should have affine coordinates.');
  var XX = this.x.square();
  var YY = this.y.square();
  var YYYY = YY.square();
  var S = this.curve.TWO.multiply(
      this.x.add(YY).square().subtract(XX).subtract(YYYY));
  var M = this.curve.THREE.multiply(XX.subtract(
      this.curve.ONE));
  var T = M.square().subtract(this.curve.TWO.multiply(S));
  var X3 = T;
  var Y3 = M.multiply(S.subtract(T)).subtract(YYYY.shiftLeft(3));
  var Z3 = this.y.shiftLeft(1);
  return new e2e.ecc.point.Nist(this.curve, X3, Y3, Z3);
};


/**
 * Adds another point to this, and return the new point. Both should have
 *     affine coordinates, i.e., Z = 1.
 * @param {!e2e.ecc.point.Nist} that The point to add.
 * @return {!e2e.ecc.point.Nist}
 * @private
 */
e2e.ecc.point.Nist.prototype.addAffine_ = function(that) {
  goog.asserts.assert(this.z.isEqual(this.curve.ONE),
      'Point should have affine coordinate.');
  goog.asserts.assert(that.z.isEqual(this.curve.ONE),
      'Point should have affine coordinate.');
  goog.asserts.assert(goog.isDefAndNotNull(this.x),
      'Element X should not be null.');
  goog.asserts.assert(goog.isDefAndNotNull(this.y),
      'Element Y should not be null.');
  // Cost: 4M + 2S.
  var H = that.x.subtract(this.x);
  var HH = H.square();
  var I = HH.shiftLeft(2);
  var J = H.multiply(I);
  var r = that.y.subtract(this.y).shiftLeft(1);
  var V = this.x.multiply(I);
  var X3 = r.square().subtract(J).subtract(V.shiftLeft(1));
  var Y3 = r.multiply(V.subtract(X3)).subtract(
      this.y.multiply(J).shiftLeft(1));
  var Z3 = H.shiftLeft(1);
  return new e2e.ecc.point.Nist(this.curve, X3, Y3, Z3);
};


/**
 * Adds another point to this, and return the new point. Both should have
 *     the same Z coordinate.
 * @param {!e2e.ecc.point.Nist} that The point to add.
 * @return {!e2e.ecc.point.Nist}
 * @private
 */
e2e.ecc.point.Nist.prototype.addSameZ_ = function(that) {
  goog.asserts.assert(this.z.isEqual(that.z),
      'Both points should have the same z.');
  goog.asserts.assert(goog.isDefAndNotNull(this.x),
      'Element X should not be null.');
  goog.asserts.assert(goog.isDefAndNotNull(this.y),
      'Element Y should not be null.');
  // Cost: 5M + 2S.
  var A = that.x.subtract(this.x).square();
  var B = this.x.multiply(A);
  var C = that.x.multiply(A);
  var D = that.y.subtract(this.y).square();
  var X3 = D.subtract(B).subtract(C);
  var Y3 = that.y.subtract(this.y).multiply(B.subtract(X3)).subtract(
      this.y.multiply(C.subtract(B)));
  var Z3 = this.z.multiply(that.x.subtract(this.x));
  return new e2e.ecc.point.Nist(this.curve, X3, Y3, Z3);
};


/**
 * Adds an affine point to this, and return the new point.
 * Note that this function does not handle P+P, infinity+P or P+infinity
 * correctly.
 * @param {!e2e.ecc.point.Nist} that The point to add.
 * @return {!e2e.ecc.point.Nist}
 * @private
 */
e2e.ecc.point.Nist.prototype.addMixed_ = function(that) {
  goog.asserts.assert(goog.isDefAndNotNull(this.x),
      'Element X should not be null.');
  goog.asserts.assert(goog.isDefAndNotNull(this.y),
      'Element Y should not be null.');

  // Cost: 7M + 4S.
  var Z1Z1 = this.z.square();
  var U2 = that.x.multiply(Z1Z1);
  var S2 = that.y.multiply(this.z).multiply(Z1Z1);
  var H = U2.subtract(this.x);
  var HH = H.square();
  var I = HH.shiftLeft(2);
  var J = H.multiply(I);
  var r = S2.subtract(this.y).shiftLeft(1);
  var V = this.x.multiply(I);

  var X3 = r.square().subtract(J).subtract(V.shiftLeft(1));
  var Y3 = r.multiply(V.subtract(X3)).subtract(
      this.y.multiply(J).shiftLeft(1));
  var Z3 = this.z.add(H).square().subtract(Z1Z1).subtract(HH);

  return new e2e.ecc.point.Nist(this.curve, X3, Y3, Z3);
};
