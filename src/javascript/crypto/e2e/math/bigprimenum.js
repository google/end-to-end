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
 * @fileoverview BigNum to be used over a prime field (for DSA/ElGamal).
 */

goog.provide('e2e.BigPrimeNum');

goog.require('e2e.BigNum');
goog.require('e2e.BigNumModulus');
goog.require('e2e.openpgp.error.InvalidArgumentsError');



/**
 * BigPrimeNums are odd prime BigNumModuluses that could be use as the modulus
 * in modular arithmetic operations in crypto schemes such as ECDSA or ECDH.
 * @param {!e2e.ByteArray} modulus The modulus to use.
 * @constructor
 * @extends {e2e.BigNumModulus}
 */
e2e.BigPrimeNum = function(modulus) {
  e2e.BigPrimeNum.base(this, 'constructor', modulus);
};
goog.inherits(e2e.BigPrimeNum, e2e.BigNumModulus);


/**
 * Computes this - 1 - a, thus Vx,
 *     this.mul(this.pow(x, a), this.pow(x, this.negateExponent(a))) == 1.
 * @param {!e2e.ByteArray} input Number to negate.
 * @return {!e2e.ByteArray} Negated number.
 */
e2e.BigPrimeNum.prototype.negateExponent = function(input) {
  return this.negateExponent_(input);
};


/**
 * Compute this - 1 - a, with 0 <= a < this.
 * @param {!e2e.ByteArray} a number to negate.
 * @return {!e2e.ByteArray} The negation of the input.
 * @private
 */
e2e.BigPrimeNum.prototype.negateExponent_ = function(a) {
  return this.subtract(e2e.BigNum.ONE).subtract(
      new e2e.BigNum(a)).toByteArray();
};


/**
 * Calculates x^{-1} mod this using Fermat's Little Theorem. Only works if
 *     this is a prime and x is smaller than q.
 * @param {!e2e.BigNum} x The number to be inversed.
 * @return {!e2e.BigNum}
 */
e2e.BigPrimeNum.prototype.modInverse = function(x) {
  if (!x.isBetween(e2e.BigNum.ZERO, this)) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'The number to be inversed should be in [1, this-1].');
  }
  // x^-1 = x^{q-2} (mod q).
  return this.modPower(x, this.subtract(e2e.BigNum.TWO));
};
