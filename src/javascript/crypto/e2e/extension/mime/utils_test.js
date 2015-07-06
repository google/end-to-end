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
 * @fileoverview Tests for the PGP/MIME email builder.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.mime.utilsTest');

goog.require('e2e.ext.mime.utils');
goog.require('e2e.ext.testingstubs');
goog.require('goog.array');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var utils = e2e.ext.mime.utils;
var stubs = new goog.testing.PropertyReplacer();


var PLAINTEXT_MESSAGE = ['From: Nathaniel Borenstein <nsb@bellcore.com>',
  'To:  Ned Freed <ned@innosoft.com>',
  'Subject: Sample message',
  'MIME-Version: 1.0',
  'Content-type: multipart/mixed; boundary="simple boundary"',
  '',
  'This is the preamble.  It is to be ignored, though it',
  'is a handy place for mail composers to include an',
  '',
  'explanatory note to non-MIME compliant readers.',
  '--simple boundary',
  '',
  'This is implicitly typed plain ASCII text.',
  '',
  'It does NOT end with a linebreak.',
  '--simple boundary',
  'Content-type: text/plain; charset=us-ascii',
  '',
  'This is explicitly typed plain ASCII text.',
  'It DOES end with a linebreak.',
  '',
  '--simple boundary',
  'Content-type: application/octet-stream',
  'Content-Transfer-Encoding: base64',
  'Content-Disposition: attachment; filename="foo.txt"',
  '',
  'aGVsbG8gd29ybGQK',
  '--simple boundary--',
  'This is the epilogue.  It is also to be ignored.'].join('\r\n');

var PLAINTEXT_BODY = ['This is implicitly typed plain ASCII text.',
  '',
  'It does NOT end with a linebreak.',
  '',
  'This is explicitly typed plain ASCII text.',
  'It DOES end with a linebreak.',
  '',
  ''].join('\r\n');


function setUp() {
  e2e.ext.testingstubs.initStubs(stubs);
}


function tearDown() {
  stubs.reset();
}


function testGetMultipartMailContent() {
  var content = goog.array.map('hello world\n'.split(''), function(str) {
    return str.charCodeAt(0);
  });
  var finalContent = {body: PLAINTEXT_BODY,
    attachments: [{filename: 'foo.txt', content: content}]};

  assertObjectEquals(finalContent, utils.getMailContent(PLAINTEXT_MESSAGE));
}


function testGetInvalidMailContent() {
  var message = ['Content-Type: multipart/mixed',
    '',
    'some text'].join('\r\n');
  assertThrows('Invalid MIME message should throw unsupported error',
               function() {
                 utils.getMailContent(message);
               });
}


function testGetSinglePartMailContent() {
  var content = 'some\r\n\r\ntext';
  var message = ['Content-Type: text/plain; charset=us-ascii',
    '', content].join('\r\n');
  assertObjectEquals({body: content}, utils.getMailContent(message));
}


function testGetValidEncryptedMImeTree() {
  var encryptedText = 'some text';
  var message = ['Content-Type: multipart/encrypted; ' +
        'protocol=application/pgp-encrypted; boundary="--foo"',
    'Content-Transfer-Encoding: 7bit', '', '----foo',
    'Content-Type: application/pgp-encrypted; charset="utf-8"',
    'Content-Transfer-Encoding: 7bit', '', 'Version: 1', '----foo',
    'Content-Type: application/octet-stream; charset="utf-8"',
    'Content-Transfer-Encoding: 7bit', '', encryptedText,
    '----foo--', ''].join('\r\n');
  assertEquals(encryptedText, utils.getEncryptedMimeTree(message));
}


function testGetInvalidEncryptedMimeTree() {
  assertThrows('Non-PGP/MIME message should throw unsupported error',
               function() {
                 utils.getEncryptedMimeTree(PLAINTEXT_MESSAGE);
               });
}


function testParseHeaderValue() {
  var text = 'MULTIPART/mixed;   BOUNDARY=" foo=";  bar=somevalue';
  assertObjectEquals({value: 'multipart/mixed', params: {
    boundary: ' foo=',
    bar: 'somevalue'
  }}, utils.parseHeaderValue(text));
}


function testSerializeHeader() {
  var header = {'Content-Type': {value: 'multipart', params: {
    charset: 'us-ascii',
    foo: 'bar='
  }}, 'Content-Transfer-Encoding': {value: '7bit'}};
  assertArrayEquals(['Content-Type: multipart; charset="us-ascii"; foo="bar="',
    'Content-Transfer-Encoding: 7bit'], utils.serializeHeader(header));
}
