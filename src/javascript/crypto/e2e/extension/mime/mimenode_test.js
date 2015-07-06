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
 * @fileoverview Tests for the MIME node builder/parser.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.mime.MimeNodeTest');

goog.require('e2e.ext.constants');
goog.require('e2e.ext.mime.MimeNode');
goog.require('e2e.ext.testingstubs');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var constants = e2e.ext.constants;
var node = null;
var filename = 'example.txt';
var stubs = new goog.testing.PropertyReplacer();

var BINARY_CONTENT = '\x98\x8d\x04\x52\xb0\xe5\x09\x01\x04\x00' +
    '\xd7\x6f\x47\x2e\x0d\x18\x1a\x84\xdb\x42\xe4\x37\x86\xb0\xef' +
    '\x50\x85\x2f\x52\xec\x89\x43\xd9\xc8\xdc\x42\x32\xd9\xc5\xb1' +
    '\x13\x06\x12\xc2\xc3\x21\x41\xc6\x58\xa0\xfa\x37\xb9\xa2\x3e' +
    '\x27\x56\x9c\x52\x74\x34\x8f\xae\x8f\xaa\xae\x2a\x52\x9b\xaf' +
    '\xee\xaf\x5d\xa3\x27\xbf\xd6\x21\x89\x32\xd2\x46\x8f\xcc\x35' +
    '\xf7\x0a\xf7\x21\x29\xe4\x5e\x41\x64\x4d\x30\xb2\xbd\xb5\x7f' +
    '\xc3\x5f\xbc\x83\x75\x2a\x2f\xcb\x5d\x61\xfa\x1e\xd4\xd8\xeb' +
    '\x2c\x62\x26\xfd\x12\x06\xd4\x45\x3c\xcf\x5b\xf5\x30\xfc\x73' +
    '\xcd\x80\xb5\x9e\x05\xcd\x92\x13\x00\x11\x01\x00\x01\xb4\x1a' +
    '\x74\x65\x73\x74\x20\x35\x20\x3c\x74\x65\x73\x74\x35\x40\x65' +
    '\x78\x61\x6d\x70\x6c\x65\x2e\x63\x6f\x6d\x3e\x88\xb8\x04\x13' +
    '\x01\x02\x00\x22\x05\x02\x52\xb0\xe5\x09\x02\x1b\x03\x06\x0b' +
    '\x09\x08\x07\x03\x02\x06\x15\x08\x02\x09\x0a\x0b\x04\x16\x02' +
    '\x03\x01\x02\x1e\x01\x02\x17\x80\x00\x0a\x09\x10\x3a\x4c\x86' +
    '\xe5\xe3\x16\xd7\xeb\x62\x6e\x03\xff\x49\x74\x72\x20\x33\xe3' +
    '\x87\xd0\xf3\xab\x3a\x32\xdd\x2f\x92\x49\xb1\x47\x0d\xb0\x35' +
    '\xba\x71\x68\x7e\x4d\x52\x81\xde\x8e\x07\xdd\x52\xac\xde\xf0' +
    '\xfa\xbd\x5b\x40\x81\xd9\x59\x12\x42\x68\x3c\x6d\xc2\x38\xb4' +
    '\xc7\xd2\x9a\xe6\x29\xb0\x3b\x58\x2b\x58\xed\x77\x08\x96\x1a' +
    '\xb5\x80\xa6\xa6\x48\x1d\xee\x7c\xf3\x36\x93\xea\x20\xcf\x0b' +
    '\xce\xfb\xa8\x6f\xd2\x4f\xe9\xd4\x70\x53\x7e\x88\x6c\x0d\x73' +
    '\xb7\x71\xa8\x91\x44\xa3\xc6\xbc\xc7\x05\xa0\x71\x91\x48\xe9' +
    '\x50\x28\xc8\xf0\x37\xf6\x80\x5d\x59\x93\xd0\x45\xaf\xb4\xb7' +
    '\x73\x92\xb8\x8d\x04\x52\xb0\xe5\x09\x01\x04\x00\x9d\x0c\x45' +
    '\x22\xd2\x39\x60\xf8\x4e\x67\xee\xea\x40\x01\xed\xae\x0f\xa4' +
    '\x2c\x3f\xbe\x91\x95\xc6\x47\x05\x7c\xb1\x22\xdb\x65\x71\x02' +
    '\x5a\xdc\xa0\x20\x94\xdf\x7a\x7d\x44\x94\xd0\x64\xd5\x58\x1c' +
    '\x57\xb3\x05\x95\x1d\x13\xc7\xb1\x1e\x4c\xfe\x0b\x5c\x00\xc2' +
    '\x57\x1d\x23\x52\x9a\x17\x26\xd7\x16\xa6\xf4\xe5\x0f\xfe\x15' +
    '\x39\xe0\x5a\x6e\xd7\xf4\x2e\x19\x67\x46\x25\x7f\xb9\x44\x5e' +
    '\xe8\x49\xe4\x71\x6e\x36\x30\x7f\x59\x8a\x3d\x10\x52\xf4\x18' +
    '\xd6\x6d\xb8\x25\x04\x84\xf8\x32\xfc\x8a\xe2\x91\x6c\x3c\x7e' +
    '\x3b\x26\x86\x80\x0b\x00\x11\x01\x00\x01\x88\x9f\x04\x18\x01' +
    '\x02\x00\x09\x05\x02\x52\xb0\xe5\x09\x02\x1b\x0c\x00\x0a\x09' +
    '\x10\x3a\x4c\x86\xe5\xe3\x16\xd7\xeb\xd6\x67\x03\xff\x7b\x88' +
    '\xad\xb9\x8d\xc1\x45\x0f\x5d\xfa\xaa\x53\x96\x5b\x68\xb6\x7e' +
    '\x7d\x76\xf5\xf1\x46\x52\x0f\xcf\xd6\x5e\x84\x65\xe1\xef\x2d' +
    '\xc2\xc6\x68\xaa\x85\x65\xbd\xa2\xeb\xcb\x66\x23\x36\xb5\xc6' +
    '\x5f\x7e\xc9\x31\xe5\x1d\x88\x9f\xc5\x09\xe9\x10\xc4\xbe\xfc' +
    '\x26\x8f\x19\x25\x15\x54\xff\xab\x76\x56\x27\xef\x39\x24\xdf' +
    '\x3e\x22\x02\x2d\x7e\xa4\x66\xf9\xea\x66\x16\x89\x52\xc7\xd8' +
    '\xb7\x90\x4f\x05\x67\x97\xe7\x79\x57\x4a\xa2\xd4\x3d\xad\x3f' +
    '\x10\x81\x6e\xcf\xe0\xff\x61\x0e\xe6\x5d\xd9\x7e\xe1\x27\xc2' +
    '\x36\x20\x2e\xbe\x43\xd7';

var TEXT_CONTENT = 'hi this is a\ntext message';
var BOUNDARY = '--foo';
var FINAL_MESSAGE = ['Content-Type: multipart/mixed; boundary="--foo"',
  'Content-Transfer-Encoding: 7bit',
  '', '----foo', 'Content-Type: text/plain; charset="utf-8"',
  'Content-Transfer-Encoding: 7bit', '', TEXT_CONTENT, '----foo',
  'Content-Type: application/octet-stream',
  'Content-Transfer-Encoding: base64',
  'Content-Disposition: attachment; filename="example.txt"', '',
  'mI0EUrDlCQEEANdvRy4NGBqE20LkN4aw71CFL1LsiUPZyNxCMtnFsRMGEsLDIUHGWKD6N' +
      '7miPidWnFJ0NI+uj6quKlKbr+6vXaMnv9YhiTLSRo/MNfcK9yEp5F5BZE0wsr21f8NfvI' +
      'N1Ki/LXWH6HtTY6yxiJv0SBtRFPM9b9TD8c82AtZ4FzZITABEBAAG0GnRlc3QgNSA8dGV' +
      'zdDVAZXhhbXBsZS5jb20+iLgEEwECACIFAlKw5QkCGwMGCwkIBwMCBhUIAgkKCwQWAgMB' +
      'Ah4BAheAAAoJEDpMhuXjFtfrYm4D/0l0ciAz44fQ86s6Mt0vkkmxRw2wNbpxaH5NUoHej' +
      'gfdUqze8Pq9W0CB2VkSQmg8bcI4tMfSmuYpsDtYK1jtdwiWGrWApqZIHe588zaT6iDPC8' +
      '77qG/ST+nUcFN+iGwNc7dxqJFEo8a8xwWgcZFI6VAoyPA39oBdWZPQRa+0t3OSuI0EUrD' +
      'lCQEEAJ0MRSLSOWD4Tmfu6kAB7a4PpCw/vpGVxkcFfLEi22VxAlrcoCCU33p9RJTQZNVY' +
      'HFezBZUdE8exHkz+C1wAwlcdI1KaFybXFqb05Q/+FTngWm7X9C4ZZ0Ylf7lEXuhJ5HFuN' +
      'jB/WYo9EFL0GNZtuCUEhPgy/IrikWw8fjsmhoALABEBAAGInwQYAQIACQUCUrDlCQIbDA' +
      'AKCRA6TIbl4xbX69ZnA/97iK25jcFFD136qlOWW2i2fn129fFGUg/P1l6EZeHvLcLGaKq' +
      'FZb2i68tmIza1xl9+yTHlHYifxQnpEMS+/CaPGSUVVP+rdlYn7zkk3z4iAi1+pGb56mYW' +
      'iVLH2LeQTwVnl+d5V0qi1D2tPxCBbs/g/2EO5l3ZfuEnwjYgLr5D1w==',
  '----foo--', ''].join('\r\n');


function setUp() {
  var boundary = '--foo';
  e2e.ext.testingstubs.initStubs(stubs);
  stubs.replace(e2e.ext.mime.MimeNode.prototype, 'setBoundary_', function() {
    this.boundary_ = boundary;
  });
  node = new e2e.ext.mime.MimeNode({
    contentType: constants.Mime.MULTIPART_MIXED,
    multipart: true
  });
}


function tearDown() {
  stubs.reset();
  node = null;
}


function testNodeSetup() {
  assertEquals(BOUNDARY, node.boundary_);
  assertTrue(node.multipart_);
  assertEquals(constants.Mime.MULTIPART_MIXED,
               node.header_[constants.Mime.CONTENT_TYPE].value);
}


function testAddChild() {
  var child = node.addChild({contentType: constants.Mime.ENCRYPTED,
    multipart: false}, filename);
  assertArrayEquals(node.children_, [child]);
  assertEquals(filename, child.filename);
  assertEquals(node, child.parent);
  assertEquals(constants.Mime.ENCRYPTED,
               child.header_[constants.Mime.CONTENT_TYPE].value);
}


function testSetContent() {
  node.setContent(TEXT_CONTENT);
  assertEquals(TEXT_CONTENT, node.content_);
}


function testBuildMessage() {
  var childTextNode = node.addChild({contentType: constants.Mime.PLAINTEXT,
    multipart: false});
  childTextNode.setContent(TEXT_CONTENT);
  var childAttachmentNode = node.addChild({
    contentType: constants.Mime.OCTET_STREAM,
    multipart: false,
    contentTransferEncoding: constants.Mime.BASE64}, filename);
  childAttachmentNode.setContent(BINARY_CONTENT);

  var builtMessage = node.buildMessage();
  assertEquals(FINAL_MESSAGE, builtMessage);
}
