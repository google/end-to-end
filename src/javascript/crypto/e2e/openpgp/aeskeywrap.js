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
 * @fileoverview AES key wrap algorithm as described in RFC 3394. This is the
 *     key-wrapping method used in ECDH (see section 8, RFC 6637).
 * @author thaidn@google.com (Thai Duong)
 */

goog.provide('e2e.cipher.AesKeyWrap');

goog.require('e2e');
goog.require('e2e.async.Result');
/** @suppress {extraRequire} We need the AES algorithm to function. */
goog.require('e2e.cipher.Aes'); // TODO(user): Remove in b/15659131
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * AES key wrap, as described in RFC 3394.
 * @param {e2e.cipher.Aes} primitive The AES primitive to used
 *     for key-wrapping. It must either AES128, AES192 or AES256.
 * @constructor
 */
e2e.cipher.AesKeyWrap = function(primitive) {
  goog.asserts.assertObject(primitive, 'AES primitive should be defined.');
  if (primitive.algorithm != e2e.cipher.Algorithm.AES128 &&
      primitive.algorithm != e2e.cipher.Algorithm.AES192 &&
      primitive.algorithm != e2e.cipher.Algorithm.AES256) {
    throw new e2e.openpgp.error.UnsupportedError(
        'Invalid key-wrapping algorithm.');
  }
  this.aes_ = primitive;
};


/**
 * The AES primitive used to wrap or unwrap key.
 * @type {e2e.cipher.Aes}
 * @private
 */
e2e.cipher.AesKeyWrap.prototype.aes_;


/**
 * IV used in key wrapping.
 * @type {!e2e.ByteArray}
 * @const
 * @private
 */
e2e.cipher.AesKeyWrap.prototype.IV_ = goog.array.repeat(0xA6, 8);


/**
 * Sets key-wrapping key.
 * @param {!e2e.cipher.key.SymmetricKey} key The key-wrapping key.
 */
e2e.cipher.AesKeyWrap.prototype.setKey = function(key) {
  goog.asserts.assertObject(this.aes_);
  goog.asserts.assert(key['key'].length >= this.aes_.keySize,
      'Invalid key-wrapping key.');
  this.aes_.setKey(key);
};


/**
 * Wraps key data with the key-wrapping key, as described in section 2.2.1 in
 *     RFC 3394. This key-wrapping method is used in ECDH.
 * @param {!e2e.ByteArray} keyData The key data to be wrapped.
 * @return {!e2e.ByteArray} The wrapped key data.
 */
e2e.cipher.AesKeyWrap.prototype.wrap = function(keyData) {
  goog.asserts.assertArray(keyData,
      'Key data to be wrapped should be defined.');
  goog.asserts.assert(keyData.length >= 16,
      'Key data to be wrapped should be at least 128 bits.');
  goog.asserts.assert(keyData.length % 8 == 0,
      'Key data to be wrapped should be a multiple of 8 bytes.');

  // Set A = IV.
  var A = this.IV_;
  // For i = 1 to n
  //   R[i] = P[i]
  var R = goog.array.clone(keyData);
  var n = keyData.length / 8;
  // For j = 0 to 5
  //   For i=1 to n
  for (var j = 0; j <= 5; j++) {
    for (var i = 1; i <= n; i++) {
      // B = AES(K, A | R[i])
      var B = goog.array.concat(A, R.slice((i - 1) * 8, i * 8));
      B = e2e.async.Result.getValue(this.aes_.encrypt(B));
      // A = MSB(64, B) ^ t where t = (n*j)+i
      A = B.slice(0, 8);
      // This is slightly incorrect if n * j + i is larger than 255.
      // But that won't happen here because n is very small in ECDH's
      // usage of this key-wrapping method.
      A[7] ^= (n * j + i);
      // R[i] = LSB(64, B)
      goog.array.splice(R, (i - 1) * 8, 8);
      goog.array.insertArrayAt(R, B.slice(8, 16), (i - 1) * 8);
    }
  }
  // Set C[0] = A
  // For i = 1 to n
  //   C[i] = R[i]
  goog.array.extend(A, R);
  return A;
};


/**
 * Unwraps key data with the key-wrapping key, as described in section 2.2.1 in
 *     RFC 3394. This key-unwrapping method is used in ECDH.
 * @param {!e2e.ByteArray} wrappedKeyData The key data to be unwrapped.
 * @return {!e2e.ByteArray} The unwrapped key data.
 */
e2e.cipher.AesKeyWrap.prototype.unwrap = function(wrappedKeyData) {
  goog.asserts.assertArray(wrappedKeyData,
      'Key data to be unwrapped should be defined.');
  goog.asserts.assert(wrappedKeyData.length >= 16,
      'Key data to be unwrapped should be at least 128 bits.');
  goog.asserts.assert(wrappedKeyData.length % 8 == 0,
      'Key data to be unwrapped should be a multiple of 8 bytes.');
  // Set A = C[0]
  // For i = 1 to n
  //   R[i] = C[i]
  var A = wrappedKeyData.slice(0, 8);
  var R = wrappedKeyData.slice(8);
  var n = wrappedKeyData.length / 8 - 1;
  // For j = 5 to 0
  //   For i = n to 1
  for (var j = 5; j >= 0; j--) {
    for (var i = n; i >= 1; i--) {
      // B = AES-1(K, (A ^ t) | R[i]) where t = n*j+i
      A[7] ^= (n * j + i);
      var B = goog.array.concat(A, R.slice((i - 1) * 8, i * 8));
      B = e2e.async.Result.getValue(this.aes_.decrypt(B));
      // A = MSB(64, B)
      A = B.slice(0, 8);
      // R[i] = LSB(64, B)
      goog.array.splice(R, (i - 1) * 8, 8);
      goog.array.insertArrayAt(R, B.slice(8, 16), (i - 1) * 8);
    }
  }
  if (!e2e.compareByteArray(A, this.IV_)) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Invalid wrapped key data.');
  }
  return R;
};
