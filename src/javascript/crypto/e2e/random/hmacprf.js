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
 * @fileoverview Implements a fixed-length PseudoRandom Function (PRF) based on
 * HMAC.
 * @see http://dl.acm.org/citation.cfm?id=2165352
 */

goog.provide('e2e.HmacPRF');

goog.require('e2e.hash.Algorithm');
goog.require('e2e.hash.Sha256');
goog.require('goog.asserts');
goog.require('goog.crypt.Hmac');
goog.require('goog.structs');



/**
 * @param {e2e.hash.Hash=} opt_hash Instance of hash to use. If not
 *     specified, it is set to Sha256.
 * @constructor
 */
e2e.HmacPRF = function(opt_hash) {
  if (goog.isDefAndNotNull(opt_hash)) {
    goog.asserts.assert(goog.structs.contains(e2e.hash.Algorithm,
                                              opt_hash.algorithm),
                        'Invalid hash function.');
  }
  this.hash_ = opt_hash || new e2e.hash.Sha256();
};


/**
 * Computes HmacPRF according to the formula HMAC(key, input).
 * @param {!e2e.ByteArray} key The secret key.
 * @param {!e2e.ByteArray} input The input to the HmacPRF.
 * @return {!e2e.ByteArray} Pseudorandom bytes with length is the digest
 *     size of the underlying hash function.
 */
e2e.HmacPRF.prototype.getHmacPRF = function(key, input) {
  goog.asserts.assertObject(this.hash_, 'Hash function must be specified.');

  var hmacer = new goog.crypt.Hmac(this.hash_, key, 64);
  return hmacer.getHmac(input);
};
