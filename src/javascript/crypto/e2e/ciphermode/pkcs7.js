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

goog.provide('e2e.ciphermode.Pkcs7');

goog.require('e2e');
goog.require('goog.array');



/**
 * The pkcs padding scheme.
 * The padding is of the following format:
 * {1}, {2, 2}, {3, 3, 3}, {4, 4, 4, 4}...
 * @constructor
 */
e2e.ciphermode.Pkcs7 = function() { };


/**
 * Encodes the given message according to PKCS7 as described in:
 * http://en.wikipedia.org/wiki/Padding_(cryptography)#PKCS7
 * @param {number} k The block size in bytes.
 * @param {!e2e.ByteArray} m The message to encode.
 * @return {!e2e.ByteArray} The encoded message.
 */
e2e.ciphermode.Pkcs7.prototype.encode = function(k, m) {
  var n = k - (m.length % k);
  return m.concat(goog.array.repeat(n, n));
};


/**
 * Decodes the given message according to PKCS7 as described in:
 *     http://en.wikipedia.org/wiki/Padding_(cryptography)#PKCS7
 * @param {number} k The block size in bytes.
 * @param {!e2e.ByteArray} m The message to decode.
 * @return {?e2e.ByteArray} The decode message or null
 *     for invalid encoding messages.
 */
e2e.ciphermode.Pkcs7.prototype.decode = function(k, m) {
  var length = m.length;
  var lastByte = m[m.length - 1];
  var error = 0;
  error |= (lastByte > length);
  error |= (lastByte > k);
  error |= (lastByte == 0);
  error |= (length % k != 0);
  var computedPadding = goog.array.repeat(lastByte, lastByte);
  var providedPadding = goog.array.slice(m, length - lastByte);
  error |= (!e2e.compareByteArray(
      computedPadding, providedPadding));
  if (error) {
    // TODO(user): Throw an exception here instead. b/16110945
    return null;
  }
  return goog.array.slice(m, 0, length - lastByte);
};
