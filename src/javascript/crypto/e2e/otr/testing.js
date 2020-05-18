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
 * @fileoverview Defines tests for the OTR related helper functions.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.setTestOnly('e2e.otr.testing');
goog.provide('e2e.otr.testing');

goog.require('goog.array');
goog.require('goog.testing.asserts');


/**
 * Compares two Uint8Arrays.
 * @param {*} a The expected array (2 args) or the debug message (3 args).
 * @param {*} b The actual array (2 args) or the expected array (3 args).
 * @param {*=} opt_c The actual array (3 args only).
 */
e2e.otr.testing.assertTypedArrayEquals = function(a, b, opt_c) {
  assertArrayEquals.apply(null, goog.array.map(arguments, function(e) {
    return e instanceof Uint8Array ? goog.array.clone(e) : e;
  }));
};
