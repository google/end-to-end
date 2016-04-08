/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
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
 * @fileoverview Tests for the text utility methods.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.openpgp.pgpmime.textTest');

goog.require('e2e.openpgp.pgpmime.Text');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var utils = e2e.openpgp.pgpmime.Text;

var delimiter = '\r\n';

function testPrettyTextWrap() {
  var inputStr = '123 456 7890 12 3456 7890';
  var expectedStr = '123 456' + delimiter + '7890 12' + delimiter + '3456 7890';
  assertEquals(expectedStr, utils.prettyTextWrap(inputStr, 10, delimiter));

  inputStr = '123456789' + delimiter + 'a b c';
  expectedStr = '123456789' + delimiter + 'a b c';
  assertEquals(expectedStr, utils.prettyTextWrap(inputStr, 10, delimiter));

  inputStr = '123 456789abcd';
  expectedStr = '123' + delimiter + '456789abcd';
  assertEquals(expectedStr, utils.prettyTextWrap(inputStr, 10, delimiter));
}

