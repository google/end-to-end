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
 * @fileoverview Defines tests for the DATA type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.require('e2e.otr.Data');
goog.require('e2e.otr.error.ParseError');
goog.require('e2e.otr.testing');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

goog.setTestOnly();


var Data = e2e.otr.Data;

function testDataConstructor() {
  assertUint8ArrayEquals([0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFF], new e2e.otr.Data(
      new Uint8Array([0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFF])).data_);
}

function testDataSerialize() {
  assertUint8ArrayEquals([0, 0, 0, 0x06, 0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFF],
      new e2e.otr.Data(
      new Uint8Array([0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFF])).serialize());
  assertUint8ArrayEquals([0, 0, 0, 1, 0], new e2e.otr.Data(
      new Uint8Array([0])).serialize());
  assertUint8ArrayEquals([0, 0, 1, 1].concat(goog.array.repeat(1, 257)),
      new e2e.otr.Data(new Uint8Array(goog.array.repeat(1, 257))).serialize());
}

function testDataParse() {
  assertUint8ArrayEquals([0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFF], Data.parse(
      new Uint8Array(
      [0, 0, 0, 0x06, 0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFF])).data_);
  assertUint8ArrayEquals([], Data.parse(new Uint8Array([0, 0, 0, 0])).data_);
  assertUint8ArrayEquals(goog.array.repeat(1, 257), Data.parse(
        e2e.otr.concat([[0, 0, 1, 1], goog.array.repeat(1, 257)])).data_);
  assertUint8ArrayEquals([1, 2, 3], Data.parse(
      new Uint8Array([0, 0, 0, 3, 1, 2, 3, 4])).data_);

  var err = assertThrows(goog.partial(Data.parse, new Uint8Array([0])));
  assertTrue(err instanceof e2e.otr.error.ParseError);

  err = assertThrows(goog.partial(Data.parse, new Uint8Array([2, 3])));
  assertTrue(err instanceof e2e.otr.error.ParseError);

  err = assertThrows(goog.partial(Data.parse, new Uint8Array([0, 0, 0, 2, 1])));
  assertTrue(err instanceof e2e.otr.error.ParseError);
}
