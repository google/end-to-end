// Copyright 2012 Google Inc. All Rights Reserved.
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
 * @fileoverview Crypto related helper functions.
 * @author evn@google.com (Eduardo Vela)
 */


goog.provide('e2e');
goog.provide('e2e.ByteArray');
goog.provide('e2e.DwordArray');

goog.require('e2e.async.Result');
goog.require('goog.array');
goog.require('goog.crypt');
goog.require('goog.math.Long');


/**
 * DwordArray is an array of 32 bits long big endian numbers.
 * @typedef {!Array.<number>}
 */
e2e.DwordArray;


/**
 * ByteArray is an array of 8 bits long numbers.
 * @typedef {!Array.<number>}
 */
e2e.ByteArray;


/**
 * Turns a 64-bit value into a ByteArray.
 * @param {goog.math.Long} value 64-bit value. long is a reserved word.
 * @return {e2e.ByteArray} ByteArray of 4 bytes.
 */
e2e.longToByteArray = function(value) {
  return e2e.dwordArrayToByteArray([
      value.getHighBits(), value.getLowBitsUnsigned()]);
};


/**
 * Turns an array of big endian 32 bits numbers into a byte array.
 * @see #byteArrayToDwordArray
 * @param {e2e.DwordArray} dwords DwordArray to transform to ByteArray.
 * @return {e2e.ByteArray} ByteArray with a length divisible by 4.
 */
e2e.dwordArrayToByteArray = function(dwords) {
  var byteArray = [];
  goog.array.forEach(dwords, function(dword) {
    byteArray.push((dword >>> 24) & 0xff);
    byteArray.push((dword >>> 16) & 0xff);
    byteArray.push((dword >>> 8) & 0xff);
    byteArray.push((dword) & 0xff);
  });
  return byteArray;
};


/**
 * Turns an array of numbers into a big endian 32 bit numbers array.
 * @see #dwordArrayToByteArray
 * @param {e2e.ByteArray} bytes ByteArray with a length divisible by 4.
 * @return {e2e.DwordArray} The resulting dword array.
 */
e2e.byteArrayToDwordArray = function(bytes) {
  var dwordArray = [];
  for (var i = 0; i < bytes.length; i += 4) {
    dwordArray.push((bytes[i + 3] |
                     (bytes[i + 2] << 8) |
                     (bytes[i + 1] << 16) |
                     (bytes[i] << 24)) >>> 0);
  }
  return dwordArray;
};


/**
 * Turns an two-octet array into a big endian 16 bit number.
 * @param {e2e.ByteArray} bytes ByteArray with a length of 2.
 * @return {number} The resulting word.
 */
e2e.byteArrayToWord = function(bytes) {
  return (bytes[0] << 8 | bytes[1]);
};


/**
 * Turns a 16-bit value into a byte array.
 * @param {number} word The 16-bit number.
 * @return {e2e.ByteArray} The resulting byte array.
 */
e2e.wordToByteArray = function(word) {
  var byteArray = [];
  byteArray.push((word >>> 8) & 0xff);
  byteArray.push(word & 0xff);
  return byteArray;
};


/**
 * Whether to use Text decoder to decode byte arrays (check crbug.com/243354).
 * @const {boolean}
 */
e2e.USE_TEXT_DECODER = 'TextDecoder' in goog.global;


/**
 * Converts a byte array into a JS string.
 * @param {e2e.ByteArray} bytes The bytes to convert.
 * @param {string=} opt_charset The charset to try (defaults to UTF-8).
 * @return {string} The string representation of bytes.
 */
e2e.byteArrayToString = function(bytes, opt_charset) {
  if (e2e.USE_TEXT_DECODER) {
    var td = new goog.global['TextDecoder'](opt_charset || 'utf-8');
    return td.decode(new Uint8Array(bytes));
  } else {
    return goog.crypt.utf8ByteArrayToString(bytes);
  }
};


/**
 * Converts a byte array into a JS string asynchronously.
 * @param {e2e.ByteArray} bytes The bytes to convert.
 * @param {string=} opt_charset The charset to try (defaults to UTF-8).
 * @return {e2e.async.Result.<string>} The string representation of bytes.
 */
e2e.byteArrayToStringAsync = function(bytes, opt_charset) {
  if (e2e.USE_TEXT_DECODER) {
    return e2e.async.Result.toResult(
        e2e.byteArrayToString(bytes, opt_charset));
  } else {
    var res = new e2e.async.Result;
    var fr = new FileReader;
    fr.onload = function() {
      res.callback(fr.result);
    };
    fr.onerror = function(e) {
      res.errback(new Error(String(e)));
    };
    fr.readAsText(
        new Blob([new Uint8Array(bytes)]), opt_charset || 'utf-8');
    return res;
  }
};


/**
 * Converts a string into a UTF-8 encoded byte array.
 * @param {string} stringInput The string to convert.
 * @return {e2e.ByteArray} The UTF-8 byte representation of the string.
 */
e2e.stringToByteArray = function(stringInput) {
  return goog.crypt.stringToUtf8ByteArray(stringInput);
};


/**
 * Returns whether the number is a valid 'byte' (0-255 no decimals).
 * @param {number} b The number to test.
 * @return {boolean} If the send number is a byte.
 */
e2e.isByte = function(b) {
    return (typeof b == 'number' &&
        b >= 0 &&
        b <= 255 &&
        b - Math.floor(b) == 0);
};


/**
 * Verifies a given ByteArray is indeed made of bytes.
 * @param {e2e.ByteArray} bytes The bytearray to test.
 * @return {boolean} If the array if a byteArray.
 */
e2e.isByteArray = function(bytes) {
  var yes = 1;
  for (var i = 0; i < bytes.length; i++) {
    yes &= e2e.isByte(bytes[i]) | 0;
  }
  return yes == 1;
};


/**
 * Does near constant time ByteArray comparison.
 * @param {e2e.ByteArray} ba1 The first bytearray to check.
 * @param {e2e.ByteArray} ba2 The second bytearray to check.
 * @return {boolean} If the array are equal.
 */
e2e.compareByteArray = function(ba1, ba2) {
  if (ba1.length !== ba2.length) {
    return false;
  }
  if (!e2e.isByteArray(ba1) || !e2e.isByteArray(ba2)) {
    return false;
  }
  var yes = 1;
  for (var i = 0; i < ba1.length; i++) {
    yes &= !(ba1[i] ^ ba2[i]) | 0;
  }
  return yes == 1;
};
