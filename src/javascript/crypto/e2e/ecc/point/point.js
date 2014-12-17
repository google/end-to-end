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
 * @fileoverview Abstract representation of a point on a generic elliptic curve
 * defined over a prime field.
 *
 * @author thaidn@google.com (Thai Duong).
 * @author fy@google.com (Frank Yellin).
 */

goog.provide('e2e.ecc.point.Point');



/**
 * Constructs a point on a generic elliptic curve.
 * @param {!e2e.ecc.curve.Curve} curve The curve.
 * @constructor
 */
e2e.ecc.point.Point = function(curve) {
  /**
   * The curve on which this point is defined.
   * @type {!e2e.ecc.curve.Curve}
   */
  this.curve = curve;
};


/**
 * Returns the x coordinate of this point.
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.point.Point.prototype.getX = goog.abstractMethod;


/**
 * Returns the y coordinate of this point.
 * @return {!e2e.ecc.Element}
 */
e2e.ecc.point.Point.prototype.getY = goog.abstractMethod;


/**
 * Converts this point to a byte array.
 * @param {boolean=} opt_compressed Return compressed form if true.
 * @return {!e2e.ByteArray}
 */
e2e.ecc.point.Point.prototype.toByteArray = goog.abstractMethod;


/**
 * Returns true if this is the identity point
 * @return {boolean}
 */
e2e.ecc.point.Point.prototype.isIdentity = goog.abstractMethod;


/**
 * Multiplies this with a scalar, and return the new point. This operation
 *     dominates the running time of most ECC protocols.
 * @param {!e2e.BigNum} k The scalar to multiply this point with.
 * @return {!e2e.ecc.point.Point}
 */
e2e.ecc.point.Point.prototype.multiply = goog.abstractMethod;


/**
 * Create a fast multiply table on-the-fly and attach it to this Point.
 */
e2e.ecc.point.Point.prototype.initializeForFastMultiply = goog.abstractMethod;
