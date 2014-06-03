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
 * @fileoverview Tests for the text utility methods.
 */

goog.require('e2e.ext.utils.text');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

var utils = e2e.ext.utils.text;


function testPrettyTextWrap() {
  var inputStr = '123 456 7890 12 3456 7890';
  var expectedStr = '123 456\n7890 12\n3456 7890';
  assertEquals(expectedStr, utils.prettyTextWrap(inputStr, 10));

  inputStr = '123456789\na b c';
  expectedStr = '123456789\na b c';
  assertEquals(expectedStr, utils.prettyTextWrap(inputStr, 10));

  debugger;
  inputStr = '123 456789abcd';
  expectedStr = '123\n456789abcd';
  assertEquals(expectedStr, utils.prettyTextWrap(inputStr, 10));
}


function testGetPgpAction() {
  assertEquals(e2e.ext.constants.Actions.ENCRYPT_SIGN,
      utils.getPgpAction('some text', true));
  assertEquals(e2e.ext.constants.Actions.USER_SPECIFIED,
      utils.getPgpAction('some text', false));
  assertEquals(e2e.ext.constants.Actions.DECRYPT_VERIFY,
      utils.getPgpAction('-----BEGIN PGP MESSAGE-----', true));
  assertEquals(e2e.ext.constants.Actions.IMPORT_KEY,
      utils.getPgpAction('-----BEGIN PGP PUBLIC KEY BLOCK-----', true));
  assertEquals(e2e.ext.constants.Actions.IMPORT_KEY,
      utils.getPgpAction('-----BEGIN PGP PRIVATE KEY BLOCK-----', true));
}
