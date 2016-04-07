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
 * @fileoverview Representation of a point on the Ed25519 elliptic curve defined
 * over a prime field.  Point arithmetics for Ed25519 curves are performed using
 * explicit formulas provided by
 *
 * @author fy@google.com (Frank Yellin).
 */

goog.provide('e2e.ecc.point.Ed25519');
goog.provide('e2e.ecc.point.Ed25519X');

goog.require('e2e.BigNum');
goog.require('e2e.ecc.Element');
goog.require('e2e.ecc.point.Point');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Constructs a point on the elliptic curve y^2 = x^3 - 3*x + B defined
 *     over a prime field.
 * @param {!e2e.ecc.curve.Ed25519} curve The curve.
 * @param {!e2e.ecc.Element} x The x Jacobian coordinate.
 * @param {!e2e.ecc.Element} y The y Jacobian coordinate.
 * @param {!e2e.ecc.Element=} opt_t The optional t Jacobian coordinate.
 * @param {!e2e.ecc.Element=} opt_z The optional z Jacobian coordinate.
 * @constructor
 * @extends {e2e.ecc.point.Point}
 */
e2e.ecc.point.Ed25519 = function(curve, x, y, opt_t, opt_z) {
  e2e.ecc.point.Ed25519.base(this, 'constructor', curve);

  /**
   * @type {!e2e.ecc.curve.Ed25519}
   */
  this.curve = curve;

  var z = opt_z || this.curve.ONE;
  var t;
  if (!opt_t) {
    t = x.multiply(y);
    if (!z.isEqual(this.curve.ONE)) {
      x = x.multiply(z);
      y = y.multiply(z);
      z = z.multiply(z);
    }
  } else {
    t = opt_t;
  }

  /**
   * The x coordinate of this in the extended twisted Edwards curve format.
   * The actual x value is this.x / this.z
   * @type {!e2e.ecc.Element}
   */
  this.x = x;

  /**
   * The y coordinate of this in the extended twisted Edwards curve format.
   * The actual y value is this.y / this.z
   * @type {!e2e.ecc.Element}
   */
  this.y = y;

  /**
   * The t coordinate of this in the extended twisted Edwards curve format.
   * A constant defined such that x * y = z * t;
   * @type {!e2e.ecc.Element}
   */
  this.t = t;

  /**
   * The z coordinate of this in the extended twisted Edwards curve format.
   * @type {!e2e.ecc.Element}
   */
  this.z = z;


  /**
   * The equivalent affine Point.
   * @private {e2e.ecc.point.Ed25519}
   */
  this.affine_ = this.z.isEqual(this.curve.ONE) ? this : null;
};
goog.inherits(e2e.ecc.point.Ed25519, e2e.ecc.point.Point);


/**
 * @type {Array.<!Array.<!e2e.ecc.point.Ed25519|
 *                        e2e.ecc.point.Ed25519X>>}
 * @private
 */
e2e.ecc.point.Ed25519.prototype.fastMultiplyTable_;


/**
 * @type {Array.<!e2e.ecc.point.Ed25519>}
 * @private
 */
e2e.ecc.point.Ed25519.prototype.smallMultiplyTable_;


/** @override */
e2e.ecc.point.Ed25519.prototype.getX = function() {
  // Converts the point to affine form, and then extracts the X coordinate
  return this.getAffine_().x;
};


/** @override */
e2e.ecc.point.Ed25519.prototype.getY = function() {
  return this.getAffine_().y;
};


/**
 * Returns the equivalent affine point.
 * @return {!e2e.ecc.point.Ed25519}
 * @private
 */
e2e.ecc.point.Ed25519.prototype.getAffine_ = function() {
  if (this.affine_ == null) {
    var zInv = this.z.inverse();
    var x = this.x.multiply(zInv);
    var y = this.y.multiply(zInv);
    this.affine_ = new e2e.ecc.point.Ed25519(this.curve, x, y);
  }
  return this.affine_;
};


/**
 * Compares another point with this. Return true if they are the same.
 * @param {!e2e.ecc.point.Ed25519} that The point to compare.
 * @return {boolean}
 */
e2e.ecc.point.Ed25519.prototype.isEqual = function(that) {
  if (this.isInfinity()) {
    return that.isInfinity();
  }
  if (that.isInfinity()) {
    return this.isInfinity();
  }
  // x and y coordinates must be equal
  return this.x.multiply(that.z).isEqual(that.x.multiply(this.z)) &&
         this.y.multiply(that.z).isEqual(that.y.multiply(this.z));
};


/**
 * Compares another point with this. Return true if this is infinity;
 * @return {boolean}
 */
e2e.ecc.point.Ed25519.prototype.isInfinity = function() {
  return this.z.isEqual(this.curve.ZERO);
};


/** @override */
e2e.ecc.point.Ed25519.prototype.isIdentity = function() {
  return this.isEqual(this.curve.IDENTITY);
};


/**
 * Returns a new point which is a negative of this.
 * @return {!e2e.ecc.point.Ed25519}
 */
e2e.ecc.point.Ed25519.prototype.negate = function() {
  return new e2e.ecc.point.Ed25519(this.curve, this.x.negate(), this.y,
      this.t.negate(), this.z);
};


/** @override */
e2e.ecc.point.Ed25519.prototype.toByteArray = function(opt_compressed) {
  var X = this.getX().toBigNum();
  var Y = this.getY().toBigNum();
  var result = this.curve.littleEndianByteArray32FromBigNum(Y);
  if (X.isOdd()) {
    result[result.length - 1] |= 0x80;
  }
  return result;
};


/**
 * Adds another point to this, and return the new point. This is the group
 *     operation.
 * @param {!e2e.ecc.point.Ed25519} that The point to add.
 * @return {!e2e.ecc.point.Ed25519}
 */
e2e.ecc.point.Ed25519.prototype.add = function(that) {
  // http://hyperelliptic.org/EFD/g1p/auto-twisted-extended-1.html
  goog.asserts.assert(!this.isInfinity());
  goog.asserts.assert(!that.isInfinity());
  var A = (this.y.subtract(this.x)).multiply(that.y.subtract(that.x));
  var B = (this.y.add(this.x)).multiply(that.y.add(that.x));
  var C = this.curve.D2.multiply(this.t).multiply(that.t);
  var D = this.z.multiply(that.z).shiftLeft(1);
  var E = B.subtract(A);
  var F = D.subtract(C);
  var G = D.add(C);
  var H = B.add(A);
  return new e2e.ecc.point.Ed25519(this.curve, E.multiply(F),
      G.multiply(H), E.multiply(H), F.multiply(G));
};


/**
 * Doubles this point.
 * @return {!e2e.ecc.point.Ed25519}
 * @private
 */
e2e.ecc.point.Ed25519.prototype.twice_ = function() {
  return this.add(this);
};


/**
 * @override
 */
e2e.ecc.point.Ed25519.prototype.multiply = function(k) {
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
  var acc = this.curve.IDENTITY;
  var nybbles = k.toSignedNybbleArray();
  // Perform a high-end to low-end signed-nybble-at-a-time multiplication.
  for (var i = nybbles.length - 1; i >= 0; --i) {
    // ASSERT:
    //   acc = sum(nybbles[j] * 16**(j - i - 1), i < j < nybbles.length) * this
    acc = acc.twice_().twice_().twice_().twice_();
    // ASSERT:
    //   acc = sum(nybbles[j] * 16**(j - i), i < j < nybbles.length) * this
    var origNybble = nybbles[i] | 0;
    var nybble = origNybble || 1;
    var absNybble = nybble < 0 ? -nybble : nybble;
    // multiplier = (absNybble * (16^i)) * this
    var multiplier = powers[1].selectFromFastMultiplyTable_(powers, absNybble);
    // multiplier = (nybble * (16^i)) * this
    if (nybble < 0) {
      multiplier = multiplier.negate();
    }
    var temp = acc.add(multiplier);
    if (origNybble != 0) {
      acc = temp;
    }
    // ASSERT:
    //   acc = sum(nybbles[j] * 16**(j - i), i <= j < nybbles.length) * this
  }
  return acc;
};


/**
 * Determines if this point is on this elliptic curve.
 * @return {boolean}
 */
e2e.ecc.point.Ed25519.prototype.isOnCurve = function() {
  if (this.isInfinity()) {
    return true;
  }
  var temp = this.getAffine_();
  //  -x^2 + y^2 = 1 + d x^2 y^2
  var x2 = temp.x.square();
  var y2 = temp.y.square();
  var left = y2.subtract(x2);
  var right = this.curve.D.multiply(x2).multiply(y2).add(this.curve.ONE);
  return left.isEqual(right);
};


/**
 * Create a table
 * @return {!Array.<!Array.<!e2e.ecc.point.Ed25519>>}
 */
e2e.ecc.point.Ed25519.prototype.createFastMultiplyTable = function() {
  var bits = 256;
  var nybbleCount = Math.ceil((bits + 1) / 4);  // sign can add one more bit
  var unsignedNybbleCount = Math.ceil(bits / 4);
  var table = [];
  for (var power = 0; power < nybbleCount; power++) {
    // table[power][i] = (i * (16^power)) * this
    table[power] = [];
    table[power][0] = this.curve.IDENTITY;
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
e2e.ecc.point.Ed25519.prototype.initializeForFastMultiply = function() {
  var table = this.createFastMultiplyTable();
  goog.asserts.assert(this.isEqual(table[0][1].toPoint()),
      'Fast Multiply table is being attached to the wrong point');
  this.fastMultiplyTable_ = table;
};


/**
 * Take a pre-constructed fast multiply table and convert it into a form so
 * that it can be attached to this point.
 * @param {{
 *  data: !Array.<!Array.<Array.<!Array.<!number>>|!e2e.ecc.point.Ed25519X>>,
 *  isConverted: boolean,
 *  isAffine: boolean,
 * }} table
 */
e2e.ecc.point.Ed25519.prototype.setFastMultiplyTable = function(table) {
  var identityX = this.curve.IDENTITY.toPointX();
  if (!table.isConverted) {
    var curve = this.curve;
    var newTable = goog.array.map(table.data, function(row) {
      return goog.array.map(row, function(encodedPoint) {
        if (encodedPoint == null) {
          return identityX;
        }
        var delta = e2e.BigNum.fromInternalArray(encodedPoint[0]);
        var sum = e2e.BigNum.fromInternalArray(encodedPoint[1]);
        var d2xy = e2e.BigNum.fromInternalArray(encodedPoint[2]);
        return new e2e.ecc.point.Ed25519X(curve,
            new e2e.ecc.Element(curve.q, delta),
            new e2e.ecc.Element(curve.q, sum),
            new e2e.ecc.Element(curve.q, d2xy));
      });
    });
    // Splice the new table into the array where the old table was.
    goog.array.clear(table.data);
    goog.array.extend(table.data, newTable);
    table.isConverted = true;
  }
  goog.asserts.assert(this.isEqual(table.data[0][1].toPoint()),
      'Fast Multiply table is being attached to the wrong point');
  this.fastMultiplyTable_ =
      /** @type {Array.<!Array.<!e2e.ecc.point.Ed25519X>>} */ (table.data);
};


/**
 * Calculate k * this, when this has a fast multiply table attached to it.
 *
 * @param {!e2e.BigNum} k
 * @return {!e2e.ecc.point.Ed25519} k * this
 * @private
 */
e2e.ecc.point.Ed25519.prototype.fastMultiply_ = function(k) {
  var table = this.fastMultiplyTable_;
  var base = table[0][1];
  var nybbles = k.toSignedNybbleArray();
  // The definition of nybbles[] is:
  //    k = sum(nybbles[i] * 16**i) 0 <= i < nybbles.length
  // where each -8 <= nybbles[i] <= 8
  // So we also have
  //    k * this = (sum(nybbles[i] * 16**i)) * this
  //             = sum(nybbles[i] * 16**i * k)
  // The value is parentheses is a precomputed quantity.
  //     nybbles[i] > 0:    table[i][nybbles[i]]
  //     nybbles[i] < 0:    table[i][-nybbles[i]].negate();
  //     nybbles[i] = 0:    Identity
  var acc = this.curve.IDENTITY;
  // We avoid timing attacks by always performing table.length additions,
  // even if nybbles.length is shorter
  for (var i = 0; i < table.length; i++) {
    var origNybble = nybbles[i] | 0;
    var nybble = origNybble || 1;
    var absNybble = nybble < 0 ? -nybble : nybble;
    // Don't let side-channel information leak regarding the index
    // that we are accessing.
    // multiplier = (absNybble * (16^i)) * this
    var multiplier = base.selectFromFastMultiplyTable_(table[i], absNybble);
    // multiplier = (nybble * (16^i)) * this
    if (nybble < 0) {
      multiplier = multiplier.negate();
    }
    // multiplier can be either a point or an extended point, so
    // it needs to be on the left.  acc is always a point.
    var temp = multiplier.add(acc);
    if (origNybble != 0) {
      acc = temp;
    }
  }
  return acc;
};


/**
 * Returns the row[index] of the fast multiplication table as a Point.
 * This code is careful to touch every entry in the row in the exact same
 * order, independent of the value of we are fetching.
 *
 * @param {!Array.<e2e.ecc.point.Ed25519>} row
 *     A row of the fast multiply table
 * @param {number} index The index of the entry to fetch.
 * @return {!e2e.ecc.point.Ed25519} corresponding point.
 * @private
 */
e2e.ecc.point.Ed25519.prototype.selectFromFastMultiplyTable_ = function(
    row, index) {
  goog.asserts.assert(index >= 1 && index < row.length, 'Argument sanity');
  var length = this.curve.q.n.length;
  var x = e2e.BigNum.createBigNumOfSize(length);
  var y = e2e.BigNum.createBigNumOfSize(length);
  var t = e2e.BigNum.createBigNumOfSize(length);
  var z = e2e.BigNum.createBigNumOfSize(length);
  for (var i = 1; i < row.length; i++) {
    var mask = -(index == i);    // index == i ? -1 : 0
    var element = row[i];
    for (var word = 0; word < length; word++) {
      x.n[word] |= element.x.toBigNum().n[word] & mask;
      y.n[word] |= element.y.toBigNum().n[word] & mask;
      t.n[word] |= element.t.toBigNum().n[word] & mask;
      z.n[word] |= element.z.toBigNum().n[word] & mask;
    }
  }
  var point = new e2e.ecc.point.Ed25519(this.curve,
      new e2e.ecc.Element(this.curve.q, x),
      new e2e.ecc.Element(this.curve.q, y),
      new e2e.ecc.Element(this.curve.q, t),
      new e2e.ecc.Element(this.curve.q, z));
  return point;
};


/**
 * Converts to an extended point.
 * @return {!e2e.ecc.point.Ed25519X}
 */
e2e.ecc.point.Ed25519.prototype.toPointX = function() {
  var x = this.getX();
  var y = this.getY();
  return new e2e.ecc.point.Ed25519X(this.curve, y.subtract(x), y.add(x),
      x.multiply(y).multiply(this.curve.D2));
};


/**
 * Converts to a point.
 * @return {!e2e.ecc.point.Ed25519}
 */
e2e.ecc.point.Ed25519.prototype.toPoint = function() {
  return this;
};



/**
 * Consturcts a precomputed point on the Elliptic curve.
 *
 * Section 4 of http://ed25519.cr.yp.to/ed25519-20110926.pdf recommends
 * representing pre-computed points in the format (y-x, y+x, 2dxy).  Doing
 * so saves 2 additions and two multiplications when calculating an addition.
 * When performing calculations, we ensure that these precomputed points are
 * always "this" rather than the argument, and only permit multiply() and
 * negate()
 *
 * @param {!e2e.ecc.curve.Curve} curve
 * @param {!e2e.ecc.Element} delta  y - x
 * @param {!e2e.ecc.Element} sum   y + x
 * @param {!e2e.ecc.Element} d2xy   d * x * y
 * @constructor
 * @extends {e2e.ecc.point.Point}
 */
e2e.ecc.point.Ed25519X = function(curve, delta, sum, d2xy) {
  e2e.ecc.point.Ed25519X.base(this, 'constructor', curve);

  /** @type {!e2e.ecc.Element} */
  this.delta = delta;

  /** @type {!e2e.ecc.Element} */
  this.sum = sum;

  /** @type {!e2e.ecc.Element} */
  this.d2xy = d2xy;
};
goog.inherits(e2e.ecc.point.Ed25519X, e2e.ecc.point.Point);


/**
 * Converts to a point.
 * @return {!e2e.ecc.point.Ed25519}
 */
e2e.ecc.point.Ed25519X.prototype.toPoint = function() {
  var x = this.sum.subtract(this.delta).shiftRight(1);
  var y = this.sum.add(this.delta).shiftRight(1);
  return new e2e.ecc.point.Ed25519(
      /** @type {!e2e.ecc.curve.Ed25519} */ (this.curve), x, y);
};


/**
 * Converts to an extended point
 * @return {!e2e.ecc.point.Ed25519X}
 */
e2e.ecc.point.Ed25519X.prototype.toPointX = function() {
  return this;
};


/**
 * Negates an extended point.
 * @return {!e2e.ecc.point.Ed25519X}
 */
e2e.ecc.point.Ed25519X.prototype.negate = function() {
  // Negation swaps sum and delta, and negates dyx;
  return new e2e.ecc.point.Ed25519X(this.curve,
      this.sum, this.delta, this.d2xy.negate());
};


/**
 * Adds another point to this, and return the new point. This is the group
 *     operation.
 * @param {!e2e.ecc.point.Ed25519} that The point to add.
 * @return {!e2e.ecc.point.Ed25519}
 */
e2e.ecc.point.Ed25519X.prototype.add = function(that) {
  // A rewrite of Ed25519.prototype.add, using the values available here
  // "Z" is implicitly 1.  T * D2 has already been pre-calculated.
  goog.asserts.assert(!that.isInfinity());
  var A = (this.delta).multiply(that.y.subtract(that.x));
  var B = (this.sum).multiply(that.y.add(that.x));
  var C = this.d2xy.multiply(that.t);
  var D = that.z.shiftLeft(1);
  var E = B.subtract(A);
  var F = D.subtract(C);
  var G = D.add(C);
  var H = B.add(A);
  return new e2e.ecc.point.Ed25519(
      /** @type {!e2e.ecc.curve.Ed25519} */ (this.curve), E.multiply(F),
      G.multiply(H), E.multiply(H), F.multiply(G));
};


/**
 * Returns the row[index] of the fast multiplication table as a Point.
 * This code is careful to touch every entry in the row in the exact same
 * order, independent of the value of we are fetching.
 *
 * @param {!Array.<e2e.ecc.point.Ed25519X>} row
 *     A row of the fast multiply table
 * @param {number} index The index of the entry to fetch.
 * @return {!e2e.ecc.point.Ed25519X} corresponding point.
 * @private
 */
e2e.ecc.point.Ed25519X.prototype.selectFromFastMultiplyTable_ =
    function(row, index) {
  goog.asserts.assert(index >= 1 && index < row.length, 'Argument sanity');
  var length = this.curve.q.n.length;
  var delta = e2e.BigNum.createBigNumOfSize(length);
  var sum = e2e.BigNum.createBigNumOfSize(length);
  var d2xy = e2e.BigNum.createBigNumOfSize(length);
  for (var i = 1; i < row.length; i++) {
    var mask = -(index == i);    // index == i ? -1 : 0
    var element = row[i];
    for (var word = 0; word < length; word++) {
      delta.n[word] |= element.delta.toBigNum().n[word] & mask;
      sum.n[word] |= element.sum.toBigNum().n[word] & mask;
      d2xy.n[word] |= element.d2xy.toBigNum().n[word] & mask;
    }
  }
  var point = new e2e.ecc.point.Ed25519X(this.curve,
      new e2e.ecc.Element(this.curve.q, delta),
      new e2e.ecc.Element(this.curve.q, sum),
      new e2e.ecc.Element(this.curve.q, d2xy));
  return point;
};
