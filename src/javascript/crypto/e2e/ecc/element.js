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
 * @fileoverview A representation of an element in a prime field.
 * @author thaidn@google.com (Thai Duong)
 */

goog.provide('e2e.ecc.Element');

goog.require('e2e.BigNum');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.fixedtiming');
goog.require('goog.asserts');



/**
 * Representation of an element in a prime field. Throws
 *     e2e.error.InvalidArgumentsError if the element is
 *     larger than or equal to the field modulus.
 * @param {!e2e.BigPrimeNum} q The modulus of the prime field.
 * @param {!e2e.BigNum} x The value of this element.
 * @constructor
 */
e2e.ecc.Element = function(q, x) {
  if (x.isGreaterOrEqual(q)) {
    throw new e2e.error.InvalidArgumentsError(
        'Field element should be smaller than modulus.');
  }
  // This doesn't check that modulus is actually a prime, but let's assume that
  // that has been taken care by the caller.
  this.q = q;
  this.x = x.cloneWithSize(q.getSize());
};


/**
 * The value of this element. It should be in [0, modulus - 1].
 * @type {!e2e.BigNum}
 */
e2e.ecc.Element.prototype.x;


/**
 * The modulus of the prime field. It should be a prime.
 * @type {!e2e.BigPrimeNum}
 */
e2e.ecc.Element.prototype.q;


/**
 * Returns a copy of this element.
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.Element.prototype.clone = function() {
  return new e2e.ecc.Element(this.q,
      this.x.clone());
};


/**
 * Copies conditionally.
 * @param {!e2e.ecc.Element} a
 * @param {number} mask
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.Element.prototype.copyConditionally = function(a, mask) {
  goog.asserts.assert(mask === 0 || mask === -1);
  mask = mask | 0;
  var maxLen = e2e.fixedtiming.max(this.x.n.length, a.x.n.length);
  var tmp;
  for (var i = 0; i < maxLen; ++i) {
    tmp = mask & (this.x.n[i] ^ a.x.n[i]);
    this.x.n[i] ^= tmp;
  }
  return this;
};


/**
 * Returns a new element that is the inverse of this.
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.Element.prototype.inverse = function() {
  return new e2e.ecc.Element(this.q,
      this.q.modInverse(this.x));
};


/**
 * Returns a new element that is the negative of this.
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.Element.prototype.negate = function() {
  return new e2e.ecc.Element(this.q,
      this.q.modSubtract(e2e.BigNum.ZERO, this.x));
};


/**
 * Adds another element to this, and returns the sum.
 * @param {!e2e.ecc.Element} that The element to add.
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.Element.prototype.add = function(that) {
  goog.asserts.assert(that.q.isEqual(this.q),
      'Cannot add: invalid field element.');
  return new e2e.ecc.Element(this.q,
      this.q.modAdd(this.x, that.x));
};


/**
 * Subtracts this by another element, and returns the result.
 * @param {!e2e.ecc.Element} that The element to subtract.
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.Element.prototype.subtract = function(that) {
  goog.asserts.assert(that.q.isEqual(this.q),
      'Cannot subtract: invalid field element.');
  return new e2e.ecc.Element(this.q,
      this.q.modSubtract(this.x, that.x));
};


/**
 * Multiplies an element with this, and returns the product.
 * @param {!e2e.ecc.Element} that The element to multiply.
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.Element.prototype.multiply = function(that) {
  goog.asserts.assert(that.q.isEqual(this.q),
      'Cannot add: invalid field element.');
  return new e2e.ecc.Element(this.q,
      this.q.modMultiply(this.x, that.x));
};


/**
 * Calculates this ^ power (mod this.q)
 * @param {!e2e.BigNum} power
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.Element.prototype.power = function(power) {
  return new e2e.ecc.Element(this.q,
      this.q.modPower(this.x, power));
};


/**
 * Squares this and return the result.
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.Element.prototype.square = function() {
  return new e2e.ecc.Element(this.q,
      this.q.modMultiply(this.x, this.x));
};


/**
 * Compares another element with this. Returns true if equal.
 * @param {!e2e.ecc.Element} that The element to compare.
 * @return {boolean}
 */
e2e.ecc.Element.prototype.isEqual = function(that) {
  return this.x.isEqual(that.x) && this.q.isEqual(that.q);
};


/**
 * Shifts right and return the new element.
 * @param {number} n Number of bits to shift.
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.Element.prototype.shiftRight = function(n) {
  var a = this.x;
  for (var i = 0; i < n; i++) {
    if (a.isOdd()) {
      a = a.add(this.q);
    }
    a = a.shiftRight(1);
  }
  return new e2e.ecc.Element(this.q, a);
};


/**
 * Shifts left and return the new element.
 * @param {number} n Number of bits to shift.
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.Element.prototype.shiftLeft = function(n) {
  var a = this.x;
  for (var i = 0; i < n; i++) {
    a = this.q.modAdd(a, a);
  }
  return new e2e.ecc.Element(this.q, a);
};


/**
 * Returns the value of this element.
 * @return {!e2e.BigNum}
 */
e2e.ecc.Element.prototype.toBigNum = function() {
  return this.x;
};

