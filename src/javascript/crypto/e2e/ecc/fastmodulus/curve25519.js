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
 * @fileoverview
 *
 * Fast modulus implementation for the Curve25519 prime 2^255 - 19
 *
 * @author fy@google.com (Frank Yellin)
 */

goog.provide('e2e.ecc.fastModulus.Curve25519');

goog.require('e2e.FastModulus');



/**
 * A concrete subclass of FastModulus that handles the case the special case
 * of the prime modulus 2^255 - 19.
 *
 * @constructor
 * @implements {e2e.FastModulus}
 * @param {!e2e.BigPrimeNum} modulus The large prime number for which
 *     we are building a fast modulus function.
 */
e2e.ecc.fastModulus.Curve25519 = function(modulus) {
  /**
   * The modulus.
   * @private {!e2e.BigPrimeNum }
   */
  this.modulus_ = modulus;

  /** @override */
  this.useForMultiplication = true;
};


/** @override */
e2e.ecc.fastModulus.Curve25519.prototype.residue = function(value) {
  value = value.clone();
  // Loop while bitLength(n) > 255
  while (value.n.length > 11 || (value.n[10] | 0) >= (1 << 15)) {
    for (var i = value.n.length - 1; i >= 11; --i) {
      // Note that 2^255 == 19 (mod modulus_).
      // So value[i] * 2^(24 * i) = 19 * value[i] * 2^(24 * i - 255)
      //                          = 19 * value[i] * 2^(24 * (i - 11) + 9)
      //                          = 19 * value[i] * 2^9 * 2^(24 * (i - 11));
      var temp = value.n[i] * 19;
      // Rather than just adding temp<<9 to value[i-11], we break it into
      // its low and high pieces.
      value.n[i - 11] += (temp & 0x7FFF) << 9;
      value.n[i - 10] += (temp >> 15);
    }
    // We also want all to remove all but the low 15 bits of n[10] (representing
    // bits >= 2^255) by multiplying them by 19 and adding them to n[0].
    // (since a * 2^255 == 19 * a, mod modulus_)
    // The low 15 bits are left alone.
    value.n[0] += (value.n[10] >> 15) * 19;
    value.n[10] &= 0x7FFF;
    value.n.length = 11;
    // Normalize our result.
    var U = 0;
    for (var i = 0; i < 10; i++) {
      U += value.n[i];
      value.n[i] = U & 0xFFFFFF;
      U >>>= 24;
    }
    value.n[10] += U;
    value.dropLeadingZeros();
  }
  // At this point bitlength(value) <= 255.
  if (value.compare(this.modulus_) >= 0) {
    // bitlength(value) <= 255, but value >= modulus.  The value must be one of
    // the nineteen numbers in the range [2^255 - 19, 2^225 - 1].
    // Rather than subtracting modulus_, we just subtract the low 24 bits of
    // modulus_, and force the result of the pieces to be zero.
    value.n.length = 1;
    value.n[0] -= this.modulus_.n[0];
  }
  return value;
};
