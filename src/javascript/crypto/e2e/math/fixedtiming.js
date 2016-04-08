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
 * @fileoverview Fixed-timing utility functions.
 * @author thaidn@google.com (Thai Duong).
 */

goog.provide('e2e.fixedtiming');


/**
 * Selects a if bit is 1, or selects b if bit is 0. Undefined if bit has other
 *     values. Copied from "Fast Elliptic Curve Cryptography in OpenSSL".
 * @param {number} a
 * @param {number} b
 * @param {number} bit
 * @return {number}
 */
e2e.fixedtiming.select = function(a, b, bit) {
  /* -0 = 0, -1 = 0xff....ff */
  var mask = (-bit) | 0;
  var ret = mask & (a ^ b);
  ret = ret ^ b;
  return ret;
};


/**
 * Returns a if a > b; otherwise b.
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
e2e.fixedtiming.max = function(a, b) {
  return e2e.fixedtiming.select(a, b, (a > b) | 0);
};
