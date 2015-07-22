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
 * @fileoverview Tests for the PGP/MIME utils.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.openpgp.pgpmime.utilsTest');
goog.require('e2e.openpgp.pgpmime.Utils');
goog.require('e2e.openpgp.pgpmime.testingstubs');

goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

goog.setTestOnly();

var utils = e2e.openpgp.pgpmime.Utils;
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
  'This is the epilogue.  It is also to be ignored.'].join('\n');

var PLAINTEXT_BODY = ['This is implicitly typed plain ASCII text.',
  '',
  'It does NOT end with a linebreak.',
  '',
  'This is explicitly typed plain ASCII text.',
  'It DOES end with a linebreak.',
  '',
  ''].join('\r\n');


function setUp() {
  e2e.openpgp.pgpmime.testingstubs.initStubs(stubs);
}


function tearDown() {
  stubs.reset();
}


function testGetMultipartMailContent() {
  assertEquals('multipart/mixed',
      utils.parseNode(PLAINTEXT_MESSAGE).header['Content-Type'].value);
  assertEquals(3, utils.parseNode(PLAINTEXT_MESSAGE).body.length);
}


function testParseAttachmentEntity() {
  var rawAttachment = {'body': 'hello world\n', 'header':
        {'Content-Disposition': {'params': {'filename': 'foo.txt'}, 'value':
                'attachment'}, 'Content-Transfer-Encoding': {'params': {},
            'value': 'base64'}, 'Content-Type': {'params': {}, 'value':
                'application/octet-stream'}}};
  var parsedAttachment = {filename: 'foo.txt', content: 'hello world\n',
    'encoding': 'base64'};
  assertObjectEquals(parsedAttachment, utils.parseAttachmentEntity(
      rawAttachment));
}


function testGetSinglePartMailContent() {
  var content = 'some\r\n\r\ntext';
  var message = ['Content-Type: text/plain; charset=us-ascii',
    '', content].join('\r\n');
  var expectedObj = {'header': {'Content-Transfer-Encoding': {'value': '7bit'},
          'Content-Type': {'params': {'charset': 'us-ascii'}, 'value':
                'text/plain'}}, 'body': 'some\r\n\r\ntext'};
  assertObjectEquals(expectedObj, utils.parseNode(message));
}


function testParseHeaderValue() {
  // Attribute names that include characters that aren't visible ASCII
  // should not be returned (whitespace is also invalid).
  // In this case, there is a tab metacharacter in an attribute name
  var attributeNonVisibleAsciiFails =
      'MULTIPART/mixed;   BO\tUNDARY= "foo="; bar=somevalue';
  assertObjectEquals({value: 'multipart/mixed', params: {bar: 'somevalue'}},
      utils.parseHeaderValue(attributeNonVisibleAsciiFails));

  // Attribute values that include characters that aren't visible ASCII
  // should not be returned (whitespace is also invalid).
  // In this case, there is a whitespace in an attribute value
  var attributeNonVisibleAsciiFails =
      'MULTIPART/mixed;   BOUNDARY= fo o; bar=somevalue';
  assertObjectEquals({value: 'multipart/mixed', params: {bar: 'somevalue'}},
      utils.parseHeaderValue(attributeNonVisibleAsciiFails));

  // Attribute values that contain a special character (here, an equals sign)
  // that isn't enclosed in quotes should not be returned
  // In this case, an attribute value has an equals sign that isn't enclosed
  // in quotes.
  var equalSignWithoutQuotes =
      'MULTIPART/mixed;   BOUNDARY= foo=; bar=somevalue';
  assertObjectEquals({value: 'multipart/mixed', params: {bar: 'somevalue'}},
      utils.parseHeaderValue(equalSignWithoutQuotes));

  // This is a valid header value - it should be parsed and returned in full.
  var text = 'MULTIPART/mixed;   BOUNDARY=" f oo=";  bar=somevalue';
  assertObjectEquals({value: 'multipart/mixed', params: { boundary: ' f oo=',
    bar: 'somevalue'
  }}, utils.parseHeaderValue(text));
}


function testSerializeHeader() {
  var header = {'Content-Type': {value: 'multipart', params: {
    charset: 'us-ascii', foo: 'bar='
  }}, 'Content-Transfer-Encoding': {value: '7bit'}};
  assertArrayEquals(['Content-Type: multipart; charset="us-ascii"; foo="bar="',
    'Content-Transfer-Encoding: 7bit'], utils.serializeHeader(header));
}

function testSplitHeaders() {
  var originalMessage = 'Content-Type: text/plain; boundary: --abc\r\n\t  \td' +
      '\r\nContent-Description: test\r\nContent-Transfer-Encoding: base\r\n 64';
  var distinctHeaders = ['Content-Type: text/plain; boundary: --abcd',
    'Content-Description: test', 'Content-Transfer-Encoding: base64'];
  assertArrayEquals(distinctHeaders, utils.splitHeaders_(originalMessage));
}

function testDecodeContent() {
  var quotedPrintableEncoded = 'Lorem=20ipsum=0D=0A=20=20dolor=3F';
  var quotedPrintableDecoded = 'Lorem ipsum\r\n  dolor?';
  assertEquals(utils.decodeContent(quotedPrintableEncoded, 'quoted_printable'),
      quotedPrintableDecoded);

  var base64Encoded = 'YW4gYXBwbGUgYSBkYXkga2VlcHMgdGhlIGRvY3RvciBhd2F5';
  var base64Decoded = 'an apple a day keeps the doctor away';
  assertEquals(utils.decodeContent(base64Encoded, 'base64'),
      base64Decoded);

  var sevenOrEightBit = 'This should stay the same!';
  assertEquals(utils.decodeContent(sevenOrEightBit, '7bit'), sevenOrEightBit);
  assertEquals(utils.decodeContent(sevenOrEightBit, '8bit'), sevenOrEightBit);
}

function testInvalidMessagesThrowError() {
  // Messages that contain no MIME headers whatsoever should fail.
  var message1 = ['I lack any MIME formatting whatsoever'].join('\r\n');
  assertThrows('Invalid MIME message should throw unsupported error',
               function() {
                 utils.parseNode(message1);
               });
  // Multipart messages must specify a boundary
  var message2 = ['Content-Type: multipart/mixed', 'some text'].join('\r\n');
  assertThrows('Invalid MIME message should throw unsupported error',
               function() {
                 utils.parseNode(message2);
               });

  // There are two issues with headers that are redeclared (e.g., two
  // 'Content-Type' headers):
  // 1) It's unclear which of the two is correct.
  // 2) It's possible that there was some error in the parsing (a missing
  // CRLF?) that caused two nodes to be treated as one.
  // Either way, such messages should throw an error.
  var message3 = ['Content-Type: text/plain', 'Content-Transfer-Encoding:' +
        'binary', 'Content-Type: image/png', '', 'content of message'].join(
      '\r\n');
  assertThrows('Invalid MIME message should throw unsupported error',
               function() {
                 utils.parseNode(message3);
               });
}

function testLineSeparator() {
  // Messages separated by only linefeeds ('\n') should still be parsable.
  var message = ['Content-Type: text/plain', 'Content-Transfer-Encoding:' +
        'binary', '', 'content of message'].join('\n');
  assertEquals('content of message', utils.parseNode(message).body);
}

