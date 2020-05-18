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
 * @fileoverview Generic abstract class representing an elliptic curve
 * defined over a prime field.
 *
 * @author thaidn@google.com (Thai Duong).
 * @author fy@google.com (Frank Yellin).
 */

goog.provide('e2e.ecc.curve.Curve');

goog.require('e2e.BigNum');
goog.require('e2e.ecc.Element');



/**
 * Constructs a generic elliptic curve defined over a prime field.
 *
 * @param {!e2e.BigPrimeNum} q The modulus of the prime field.
 * @constructor
 */
e2e.ecc.curve.Curve = function(q) {
  /**
   * The modulus of the prime field. It should be a prime.
   * @type {!e2e.BigPrimeNum}
   */
  this.q = q;

  /**
   * 0 in the underlying prime field
   * @type {!e2e.ecc.Element}
   */
  this.ZERO = this.elementFromByteArray([0]);

  /**
   * 1 in the underlying prime field
   * @type {!e2e.ecc.Element}
   */
  this.ONE = this.elementFromByteArray([1]);

  /**
   * 2 in the underlying prime field
   * @type {!e2e.ecc.Element}
   */
  this.TWO = this.elementFromByteArray([2]);

  /**
   * 3 in the underlying prime field
   * @type {!e2e.ecc.Element}
   */
  this.THREE = this.elementFromByteArray([3]);
};


/**
 * Converts a byte array to a point on the curve.
 * @param {!e2e.ByteArray} p A byte representation of a point.
 * @return {!e2e.ecc.point.Point}
 */
e2e.ecc.curve.Curve.prototype.pointFromByteArray = goog.abstractMethod;


/**
 * Returns the key size for this curve
 * @return {number}
 */
e2e.ecc.curve.Curve.prototype.keySizeInBits = goog.abstractMethod;


/**
 * Constructs a new element from a byte array.
 * @param {!e2e.ByteArray} bytes The value of the new element,
 *     represented in big-endian format.
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.curve.Curve.prototype.elementFromByteArray = function(bytes) {
  return new e2e.ecc.Element(this.q, new e2e.BigNum(bytes));
};


/**
 * Constructs a new element from an integer.  The integer must be in the range
 * accepted by e2e.BigNum.fromInteger
 * @param {number} value
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.curve.Curve.prototype.elementFromInteger = function(value) {
  var bignum = e2e.BigNum.fromInteger(value);
  return new e2e.ecc.Element(this.q, bignum);
};
