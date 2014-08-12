// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * @fileoverview Generator of Diffie-Hellman exchange values.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.cipher.DiffieHellman');


goog.require('e2e');
goog.require('e2e.BigNumModulus');
goog.require('e2e.random');


/**
 * Diffie-Hellman generator.
 * @constructor
 * @param {!e2e.ByteArray|!Uint8Array} p The modulus.
 * @param {!e2e.ByteArray} g The base.
 */
e2e.cipher.DiffieHellman = function(p, g) {
  this.p_ = new e2e.BigNumModulus(p);
  this.g_ = g;
  this.x_ = this.generateExponent_();
};


/**
 * Computes g^x mod p.
 * @param {!e2e.ByteArray} opt_g The base.
 * @return {!e2e.ByteArray} g^x mod p.
 */
e2e.cipher.DiffieHellman.prototype.generate = function(opt_g) {
  return this.p_.pow(opt_g || this.g_, this.x_);
};


/**
 * Computes a safe exponent for Diffie-Hellman.
 * @private
 * @return {!e2e.ByteArray} The generated exponent.
 */
e2e.cipher.DiffieHellman.prototype.generateExponent_ = function() {
  do {
    var res = e2e.random.getRandomBytes(Math.ceil(this.p_.getBitLength() / 8));
    var check = this.p_.pow(this.g_, res);
  } while (e2e.compareByteArray(check, [1]));
  return res;
};
