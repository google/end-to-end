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
  'This is the epilogue.  It is also to be ignored.'].join('\r\n');

var PLAINTEXT_BODY = ['This is implicitly typed plain ASCII text.',
  '',
  'It does NOT end with a linebreak.',
  '',
  'This is explicitly typed plain ASCII text.',
  'It DOES end with a linebreak.',
  '',
  ''].join('\r\n');

var TEST_EMAIL = ['Delivered-To: ystoller@google.com',
  'Received: by 10.31.190.6 with SMTP id o6csp207937vkf;',
  '        Wed, 29 Jul 2015 17:23:28 -0700 (PDT)',
  'X-Received: by 10.107.10.96 with SMTP id u93mr6392667ioi.172.1438215808478;',
  '        Wed, 29 Jul 2015 17:23:28 -0700 (PDT)',
  'Return-Path: <dang.hvu@gmail.com>',
  'Received: from mail-io0-x22c.google.com (mail-io0-x22c.google.com. ' +
      '[2607:f8b0:4001:c06::22c])',
  '        by mx.google.com with ESMTPS id e5si18657igz.54.2015.07.29.17.23.28',
  '        for <ystoller@google.com>',
  '        (version=TLSv1.2 cipher=ECDHE-RSA-AES128-GCM-SHA256 bits=128/128);',
  '        Wed, 29 Jul 2015 17:23:28 -0700 (PDT)',
  'Received-SPF: pass (google.com: domain of dang.hvu@gmail.com designates ' +
      '2607:f8b0:4001:c06::22c as permitted sender) ' +
      'client-ip=2607:f8b0:4001:c06::22c;',
  'Authentication-Results: mx.google.com;',
  '       spf=pass (google.com: domain of dang.hvu@gmail.com designates ' +
      '2607:f8b0:4001:c06::22c as permitted sender) ' +
      'smtp.mail=dang.hvu@gmail.com;',
  '       dkim=pass header.i=@gmail.com;',
  '       dmarc=pass (p=NONE dis=NONE) header.from=gmail.com',
  'Received: by mail-io0-x22c.google.com with SMTP id g141so38367292ioe.3',
  '        for <ystoller@google.com>; Wed, 29 Jul 2015 17:23:28 -0700 (PDT)',
  'DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;',
  '        d=gmail.com; s=20120113;',
  '        h=mime-version:date:message-id:subject:from:to:content-type;',
  '        bh=qudyov98wfFdQ2xQUP+0LzZKrz32kEkMCxiQBXyGjaQ=;',
  '        b=aEKwmc7f22TrGJ3jldEZ/y3uSZYdRGm1ZKB2fw0y9JlcUivXxv+6DdMwABK' +
      'blpSR4D',
  '         7Ol97uGcDc7lyGvMO6Kr3twp4N9nqcP1auk1KsDsRyW55L1ZCntlW05x+wUd' +
      'AtwjOUCF',
  '         x6slpIlvPHfe+9ldAxqyPjMaOx0s2IvxCUDPfe7h/C/Jixc+eNq8S3YO+0xL' +
      '9F2mbHnO',
  '         gHUc01nlIesDEcs3xyzwRaPk9NMpFqwVXdrPzHoAg9CmUNw3fmEVGAj1p96R' +
      'IyG/V39H',
  '         7xQaM69nGMKIH5xVoucbNj/zGL0G7Phn3DYInIBfBZu2iN86TyacJluB9jU2' +
      'E40PNImq',
  '         j2Rg==', 'MIME-Version: 1.0',
  'X-Received: by 10.107.135.200 with SMTP id ' +
      'r69mr6031368ioi.54.1438215808067;',
  ' Wed, 29 Jul 2015 17:23:28 -0700 (PDT)',
  'Received: by 10.79.93.2 with HTTP; Wed, 29 Jul 2015 17:23:27 -0700 (PDT)',
  'Received: by 10.79.93.2 with HTTP; Wed, 29 Jul 2015 17:23:27 -0700 (PDT)',
  'Date: Wed, 29 Jul 2015 17:23:27 -0700', 'Message-ID: ' +
      '<CAGrabN7TM2dr1+qF2pCanga6w583QoNPBz1TS27irr5b25D5Kg@mail.gmail.com>',
  'Subject: Hello yoni', 'From: Hoang-Vu Dang <dang.hvu@gmail.com>',
  'To: Jonathan Stoller <ystoller@google.com>',
  'Content-Type: multipart/alternative; boundary=001a113eb0c259b018051c0cb660',
  '', '--001a113eb0c259b018051c0cb660',
  'Content-Type: text/plain; charset=UTF-8', '', 'Wohoo', '',
  '--001a113eb0c259b018051c0cb660', 'Content-Type: text/html; charset=UTF-8',
  '', '<p dir="ltr">Wohoo</p>', '',
  '--001a113eb0c259b018051c0cb660--'].join('\r\n');


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
  var rawAttachment = {'body': 'hello world\r\n', 'header':
        {'Content-Disposition': {'params': {'filename': 'foo.txt'}, 'value':
                'attachment'}, 'Content-Transfer-Encoding': {'params': {},
            'value': 'base64'}, 'Content-Type': {'params': {}, 'value':
                'application/octet-stream'}}};
  var parsedAttachment = {filename: 'unknown', content: 'hello world\r\n',
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


function testHeaderValueCasesArePreserved() {
  // The cases of header values should not be altered.
  var header = 'Message-ID: aBcDe';
  assertEquals('aBcDe', utils.parseHeader_(header)['Message-ID'].value);
}

function testHeaderParameterNamesAreLowerCased() {
  // Parameter names are case-insensitive and should be normalized to lower-case
  var header = 'Content-Type: multipart/mixed; BOUNDARY= 123';
  assertEquals(true, utils.parseHeader_(
      header)['Content-Type'].params.hasOwnProperty('boundary'));
}

function testMessageWithMultipleHeaders() {
  // Messages with multiple content-type or content-transfer-encoding headers
  // should fail.
  var multipleContentType = ['Content-Type: text/plain',
    'Content-Type: text/plain', 'Content-Transfer-Encoding: 7bit', '',
    'Hello'].join('\r\n');
  assertThrows('Message with multiple content types headers' +
      'should raise exception', function() {
        utils.parseNode(multipleContentType);
      });
  var multipleContentTransferEncoding = ['Content-Type: text/plain',
    'Content-Transfer-Encoding: 7bit', 'Content-Transfer-Encoding: 7bit', '',
    'Hello'].join('\r\n');
  assertThrows('Message with multiple content transfer encoding headers' +
      'should raise exception', function() {
        utils.parseNode(multipleContentTransferEncoding);
      });

  // Other headers that appear multiple times should parse successfully.
  var multipleRandomHeader = ['Content-Type: text/plain',
    'Content-Transfer-Encoding: 7bit', 'Received: yesterday',
    'Received: yesterday', '', 'Hello'].join('\r\n');
  assertEquals('Hello', utils.parseNode(multipleRandomHeader).body);
}

function testParseHeaderValueWithParams() {
  // Attribute names that include characters that aren't visible ASCII
  // should not be returned (whitespace is also invalid).
  // In this case, there is a tab metacharacter in an attribute name
  var attributeNonVisibleAsciiFails =
      'multipart/mixed;   bo\tundary= "foo="; bar=somevalue';
  assertObjectEquals({value: 'multipart/mixed', params: {bar: 'somevalue'}},
      utils.parseHeaderValueWithParams(attributeNonVisibleAsciiFails));

  // Attribute values that include characters that aren't visible ASCII
  // should not be returned (whitespace is also invalid).
  // In this case, there is a whitespace in an attribute value
  var attributeNonVisibleAsciiFails =
      'multipart/mixed;   boundary= fo o; bar=somevalue';
  assertObjectEquals({value: 'multipart/mixed', params: {bar: 'somevalue'}},
      utils.parseHeaderValueWithParams(attributeNonVisibleAsciiFails));

  // Attribute values that contain a special character (here, an equals sign)
  // that isn't enclosed in quotes should not be returned
  // In this case, an attribute value has an equals sign that isn't enclosed
  // in quotes.
  var equalSignWithoutQuotes =
      'multipart/mixed;   boundary= foo=; bar=somevalue';
  assertObjectEquals({value: 'multipart/mixed', params: {bar: 'somevalue'}},
      utils.parseHeaderValueWithParams(equalSignWithoutQuotes));

  // This is a valid header value - it should be parsed and returned in full.
  var text = 'multipart/mixed;   boundary=" f oo=";  bar=somevalue';
  assertObjectEquals({value: 'multipart/mixed', params: {boundary: ' f oo=',
    bar: 'somevalue'
  }}, utils.parseHeaderValueWithParams(text));
}


function testParseHeaderValueBasic() {
  // parseHeaderValueBasic should return an object of type
  // e2e.openpgp.pgpmime.types.HeaderValueBasic, without lowering the case.
  var text = 'abcDE';
  var expectedObj = {value: text};
  assertObjectEquals(expectedObj, utils.parseHeaderValueBasic(text));

  // Verifies that quotes are not removed
  text = '"Laser"';
  expectedObj = {value: text};
  assertObjectEquals(expectedObj, utils.parseHeaderValueBasic(text));

  // Verifies that semi-colons in the middle of a non-parameter header parse
  // successfully
  text = '"Things to purchase for hike: Water; trail mix; miscellaneous..."';
  expectedObj = {value: text};
  assertObjectEquals(expectedObj, utils.parseHeaderValueBasic(text));
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

function testVerifyMultipart() {
  // Verifies that messages will only be treated as multipart if they have both
  // a valid content-type (i.e., type 'multipart'), and a boundary.
  var message = ['Content-Type: multiPArt/mixed; boundary=123', '', '--123',
    'Content-Type: plain/text', '', 'part1', '--123',
    'Content-Type: plain/text', '', 'part2', '--123--'].join('\r\n');
  var expectedResult = ['part1\r\n', 'part2'];
  var result = utils.parseNode(message);
  assertEquals(2, result.body.length);
  assertObjectEquals(expectedResult[0], result.body[0].body);
  assertObjectEquals(expectedResult[1], result.body[1].body);

  // The following message does not have a valid content type, so the entire
  // content of the message following the initial headers should be parsed as
  // a single node.
  message = ['Content-Type: multipa/mixed; boundary=123', '', '--123',
    'Content-Type: plain/text', '', 'part1', '--123',
    'Content-Type: plain/text', '', 'part2', '--123--'].join('\r\n');
  var expectedResult = ['--123', 'Content-Type: plain/text', '', 'part1',
    '--123', 'Content-Type: plain/text', '', 'part2', '--123--'].join('\r\n');
  result = utils.parseNode(message);
  assertEquals(expectedResult, result.body);

  // The following message does not have a boundary.
  var message = ['Content-Type: multiPArt/mixed', '', '--123',
    'Content-Type: plain/text', '', 'part1', '--123',
    'Content-Type: plain/text', '', 'part2', '--123--'].join('\r\n');
  result = utils.parseNode(message);
  assertEquals(expectedResult, result.body);
}

function testTypicalEmail() {
  // Verifies that an typical email that comes with many (potentially) unused
  // and unrecognized headers parses correctly.
  var expectedObj = [{body: 'Wohoo\r\n\r\n'},
        {body: '<p dir="ltr">Wohoo</p>\r\n'}];
  var parsedEmail = utils.parseNode(TEST_EMAIL);
  assertObjectEquals(expectedObj[0].body,
      utils.parseNode(TEST_EMAIL).body[0].body);
  assertObjectEquals(expectedObj[1].body,
      utils.parseNode(TEST_EMAIL).body[1].body);
}
