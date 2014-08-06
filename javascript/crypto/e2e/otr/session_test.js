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
 * @fileoverview Defines tests for the session manager.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.require('e2e.otr.Session');
goog.require('e2e.otr.constants');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

goog.setTestOnly();

var constants = e2e.otr.constants;

function testConstructor() {
  var s = new e2e.otr.Session();
  assertObjectEquals(constants.DEFAULT_POLICY, s.policy_);
  assertEquals(constants.MSGSTATE.PLAINTEXT, s.messageState);
  assertEquals(constants.AUTHSTATE.NONE, s.authState);

  s = new e2e.otr.Session({testProperty: 123});
  assertEquals(123, s.policy_.testProperty);
}

function testUpdatePolicy() {
  var s = new e2e.otr.Session();
  assertUndefined(s.policy_.testProperty);
  s.updatePolicy({testProperty: 123});
  assertEquals(123, s.policy_.testProperty);
  s.updatePolicy({testProperty: 456});
  assertEquals(456, s.policy_.testProperty);
}

function testGetPolicy() {
  var s = new e2e.otr.Session({a: 1, b: 2});
  assertEquals(1, s.getPolicy('a'));
  assertEquals(2, s.getPolicy('b'));
  assertUndefined(s.getPolicy('c'));
  var s = new e2e.otr.Session();
  assertObjectEquals(constants.DEFAULT_POLICY, s.getPolicy());
  assertObjectEquals(constants.DEFAULT_POLICY, s.getPolicy(''));
}
