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
 * @fileoverview Tests for the text utility methods.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.utils.textTest');

goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.utils.text');
goog.require('goog.array');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var utils = e2e.ext.utils.text;


function testPrettyTextWrap() {
  var inputStr = '123 456 7890 12 3456 7890';
  var expectedStr = '123 456\n7890 12\n3456 7890';
  assertEquals(expectedStr, utils.prettyTextWrap(inputStr, 10));

  inputStr = '123456789\na b c';
  expectedStr = '123456789\na b c';
  assertEquals(expectedStr, utils.prettyTextWrap(inputStr, 10));

  inputStr = '123 456789abcd';
  expectedStr = '123\n456789abcd';
  assertEquals(expectedStr, utils.prettyTextWrap(inputStr, 10));
}


function testGetPgpAction() {
  assertEquals(e2e.ext.constants.Actions.ENCRYPT_SIGN,
      utils.getPgpAction('some text'));
  assertEquals(e2e.ext.constants.Actions.DECRYPT_VERIFY,
      utils.getPgpAction('-----BEGIN PGP MESSAGE-----'));
  assertEquals(e2e.ext.constants.Actions.DECRYPT_VERIFY,
      utils.getPgpAction('-----BEGIN PGP SIGNED MESSAGE-----'));
  assertEquals(e2e.ext.constants.Actions.IMPORT_KEY,
      utils.getPgpAction('-----BEGIN PGP PUBLIC KEY BLOCK-----'));
  assertEquals(e2e.ext.constants.Actions.IMPORT_KEY,
      utils.getPgpAction('-----BEGIN PGP PRIVATE KEY BLOCK-----'));
}


function testExtractValidEmail() {
  'test@example.com, "we <ird>>\'>, <a@a.com>, n<ess" <t2@example.com>' +
      ', "inv\"<alid <invalid@example.com>, fails#e2e.regexp.vali@dation.com',

  assertEquals('test@example.com', utils.extractValidEmail('test@example.com'));
  assertEquals('test@example.com',
      utils.extractValidEmail('<test@example.com>'));
  assertEquals('test@example.com',
      utils.extractValidEmail('id <test@example.com>'));
  assertEquals('test@example.com',
      utils.extractValidEmail('"user id" <test@example.com>'));
  assertEquals(null,
      utils.extractValidEmail('"user id" <not-an-email>'));
  assertEquals('padded@email.com',
      utils.extractValidEmail('"user id" <padded@email.com >'));
  assertEquals('t2@example.com',
      utils.extractValidEmail(
          '"we <ird>>\'>, <a@a.com>, n<ess" <t2@example.com>'));
  assertEquals(null,
      utils.extractValidEmail('"inv\"<alid <invalid@example.com>'));
  assertEquals(null,
      utils.extractValidEmail('fails#e2e.regexp.vali@dation.com'));
}


function testIsGmailOrigin() {
  var gmailOrigins = ['https://mail.google.com/foo', 'https://mail.google.com',
    'https://mail.google.com:443/foo#bar'];
  var nonGmailOrigins = ['http://mail.google.com', 'https://mail.yahoo.com',
    'https://mail.google.com.evil.com', 'https://foo.mail.google.com'];
  goog.array.forEach(gmailOrigins, function(uri) {
    assertTrue(utils.isGmailOrigin(uri));
  });
  goog.array.forEach(nonGmailOrigins, function(uri) {
    assertFalse(utils.isGmailOrigin(uri));
  });
}


function testIsYmailOrigin() {
  var ymailOrigins = ['https://example.mail.yahoo.com/foo',
    'https://us-mg5.mail.yahoo.com', 'https://www.us-mg5.mail.yahoo.com/foo',
    'https://us-mg999.mail.yahoo.com:443/foo#bar'];
  var nonYmailOrigins = ['http://mail.google.com', 'http://www.mail.yahoo.com',
    'https://www.mail.yahoo.com.evil.com', 'https://mail.yahoo.com'];
  goog.array.forEach(ymailOrigins, function(uri) {
    assertTrue(utils.isYmailOrigin(uri));
  });
  goog.array.forEach(nonYmailOrigins, function(uri) {
    assertFalse(utils.isYmailOrigin(uri));
  });
}
