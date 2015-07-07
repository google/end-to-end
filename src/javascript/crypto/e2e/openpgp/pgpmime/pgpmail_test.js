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
 * @fileoverview Tests for the PGP/MIME email constructor.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.openpgp.pgpmime.PgpMailTest');

goog.require('e2e.openpgp.pgpmime.Constants');
goog.require('e2e.openpgp.pgpmime.MimeNode');
goog.require('e2e.openpgp.pgpmime.PgpMail');
goog.require('e2e.openpgp.pgpmime.testingstubs');

goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var constants = e2e.openpgp.pgpmime.Constants;
var mockControl = null;
var node = null;
var filename = 'example.txt';
var stubs = new goog.testing.PropertyReplacer();
var BOUNDARY = '--foo';


function setUp() {
  mockControl = new goog.testing.MockControl();
  e2e.openpgp.pgpmime.testingstubs.initStubs(stubs);
  stubs.replace(e2e.openpgp.pgpmime.MimeNode.prototype, 'setBoundary_',
      function() {
        this.boundary_ = BOUNDARY;
      });
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
  node = null;
}


function testBuildPGPMimeTree() {
  var finalTree = ['Content-Type: multipart/encrypted;',
    'protocol="application/pgp-encrypted"; charset="utf-8"; ' +
        'boundary="--foo"', 'Content-Transfer-Encoding: 7bit',
    'Subject: test email', 'From: ystoller@google.com',
    'To: kbsriram@google.com', 'Mime-Version: 1.0', '',
    'This is an OpenPGP/MIME encrypted message. Please open it from',
    'the Safe Mail app', '', '----foo',
    'Content-Type: application/pgp-encrypted; charset="utf-8"; name="',
    'version.asc"', 'Content-Transfer-Encoding: 7bit',
    'Content-Description: pgp/mime versions identification', '',
    'Version: 1', '----foo',
    'Content-Type: text/plain; charset="utf-8"; ' +
        'name="encrypted.asc"',
    'Content-Transfer-Encoding: 7bit', '', 'some encrypted text',
    '----foo--', ''].join('\r\n');
  var encryptedText = 'some encrypted text';
  var preamble = 'This is an OpenPGP/MIME encrypted message. ' +
      'Please open it from the Safe Mail app';
  var mail = new e2e.openpgp.pgpmime.PgpMail({body: encryptedText,
    from: 'ystoller@google.com', to: 'kbsriram@google.com',
    subject: 'test email'}, preamble);
  var encryptedTree = mail.buildPGPMimeTree();
  assertEquals(finalTree, encryptedTree);
}
