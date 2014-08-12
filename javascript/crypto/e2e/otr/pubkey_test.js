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
 * @fileoverview Defines tests for the PUBKEY type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.require('e2e.error.UnsupportedError');
goog.require('e2e.otr.error.ParseError');
goog.require('e2e.otr.pubkey.Pubkey');
goog.require('e2e.otr.testing');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

goog.setTestOnly();

var stubs = null;

var pkImpl = function(data) {
  goog.base(this);
  this.data_ = data;
};
goog.inherits(pkImpl, e2e.otr.pubkey.Pubkey);

pkImpl.PUBKEY_TYPE = new Uint8Array([0, 0]);

pkImpl.prototype.serializePubkey = function() {
  return this.data_;
};

function setUp() {
  stubs = new goog.testing.PropertyReplacer();
}

function tearDown() {
  stubs.reset();
}

function testConstructor() {
  var construct = function() {
    new pkImpl(new Uint8Array([1, 2, 3]));
  };
  assertThrows(function() {
    new e2e.otr.pubkey.Pubkey();
  });

  stubs.remove(pkImpl, 'PUBKEY_TYPE');
  assertThrows(construct);
  stubs.reset();

  stubs.setPath('pkImpl.PUBKEY_TYPE', new Uint8Array([0xFF, 0xFF]));
  assertThrows(construct);
  stubs.reset();

  assertNotThrows(construct);
}

function testSerialize() {
  var pk = new pkImpl(new Uint8Array([1, 2, 3]));
  assertUint8ArrayEquals([0, 0, 1, 2, 3], pk.serialize());
}

function testParse() {
  assertTrue(assertThrows(function() {
    e2e.otr.pubkey.Pubkey.parse(new Uint8Array([0]));
  }) instanceof e2e.otr.error.ParseError);
  assertTrue(assertThrows(function() {
    e2e.otr.pubkey.Pubkey.parse(new Uint8Array([0xFF, 0xFF]));
  }) instanceof e2e.error.UnsupportedError);
}
