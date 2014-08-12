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
 * @fileoverview Defines tests for the DH COMMIT type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.require('e2e.otr.error.ParseError');
goog.require('e2e.otr.message.DhCommit');
goog.require('e2e.otr.testing');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

goog.setTestOnly();


var stubs = new goog.testing.PropertyReplacer();
var commit = null;
var sender = new Uint8Array([0x00, 0x00, 0x01, 0x00]);
var receiver = new Uint8Array([0x00, 0x00, 0x02, 0x00]);

function setUp() {
  commit = new e2e.otr.message.DhCommit({
    instanceTag: sender,
    remoteInstanceTag: receiver
  });
  stubs.setPath('e2e.random.getRandomBytes', goog.array.range);
}

function tearDown() {
  stubs.reset();
  commit = null;
}

function testSerializeMessageContent() {
  var out = commit.serializeMessageContent();
  assertEquals(200 + 36, out.length);

  // TODO(user): More tests, check against reference implementation.
}
