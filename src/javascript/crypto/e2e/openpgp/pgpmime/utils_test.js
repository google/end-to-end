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


function setUp() {
  e2e.openpgp.pgpmime.testingstubs.initStubs(stubs);
}


function tearDown() {
  stubs.reset();
}


function testGetInvalidMailContent() {
  var message = ['Content-Type: multipart/mixed', '', 'some text'].join('\r\n');
  assertThrows('Invalid MIME message should throw unsupported error',
               function() {
                 utils.getMailContent(message);
               });
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
