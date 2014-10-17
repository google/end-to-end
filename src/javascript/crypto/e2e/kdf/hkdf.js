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
 * @fileoverview Implements RFC 5869 HMAC-based Key Derivation Function (HKDF).
 * @author quannguyen@google.com (Quan Nguyen)
 */
goog.provide('e2e.Hkdf');

goog.require('e2e.hash.Algorithm');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.crypt.Hmac');
goog.require('goog.structs');



/**
 * @param {e2e.hash.Hash} hash An instance of hash to use.
 * @constructor
 */
e2e.Hkdf = function(hash) {
  goog.asserts.assert(goog.structs.contains(
      e2e.hash.Algorithm, hash.algorithm), 'Invalid hash function.');
  this.hash_ = hash;
};


/**
 * @const {number} Hmac block length. We use 64 as the client and the server
 *     must use the same value.
 * @private
 */
e2e.Hkdf.HMAC_BLOCK_LENGTH_ = 64;


/**
 * List of hash's digest length in octets.
 * @enum {number}
 */
e2e.Hkdf.HashLength = {
  'MD5': 128 / 8,
  'SHA1': 160 / 8,
  'SHA224': 224 / 8,
  'SHA256': 256 / 8
};


/**
 * Implements HKDF function which follows the extract-then-expand paradigm,
 * where key derivation function (KDF) logically consists of two modules. The
 * 1st stage takes the input keying material and extracts from it a fixed-length
 * pseudorandom key prk. The 2nd stage expands the key prk into serveral
 * additional pseudorandom keys.
 * @param {!e2e.ByteArray} ikm Input keying material.
 * @param {!e2e.ByteArray} info Context and application specific
 *     information (can be a zero-length array).
 * @param {number} extract_len Length of extracted output keying material in
 *     octets. The maximum size of extracted keys is 255 * hashLength.
 * @param {!e2e.ByteArray=} opt_salt Salt value (a non-secret random
 *     value). If not provided, it is set to a string of hash length zeros.
 * @return {!e2e.ByteArray}  Output keying material (okm).
 */
e2e.Hkdf.prototype.getHKDF = function(ikm, info, extract_len,
    opt_salt) {
  goog.asserts.assertObject(this.hash_, 'Hash function must be specified.');
  var hashLength = e2e.Hkdf.HashLength[this.hash_.algorithm];
  var i;

  goog.asserts.assert(0 < extract_len && extract_len <= hashLength * 255,
                      'Invalid extract len.');
  // Extract
  var salt = opt_salt;
  if (!goog.isDefAndNotNull(opt_salt) || salt === undefined) {
    salt = goog.array.repeat(0x00, hashLength);
  }
  var hmacer = new goog.crypt.Hmac(this.hash_, salt,
                                   e2e.Hkdf.HMAC_BLOCK_LENGTH_);
  var prk = hmacer.getHmac(ikm); // Pseudorandom Key

  // Expand
  var n = Math.ceil(extract_len / hashLength);
  var t = new Array(n + 1);
  var okm = new Array(); // Output Keying Material
  hmacer = new goog.crypt.Hmac(this.hash_, prk,
                               e2e.Hkdf.HMAC_BLOCK_LENGTH_);
  t[0] = new Array(0);

  for (i = 1; i <= n; ++i) {
    t[i] = hmacer.getHmac(t[i - 1].concat(info).concat([i]));
    okm = okm.concat(t[i]);
  }
  return okm.slice(0, extract_len);
};
