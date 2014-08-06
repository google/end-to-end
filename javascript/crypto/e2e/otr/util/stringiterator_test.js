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
 * @fileoverview Tests for the StringIterator utility methods.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.require('e2e.otr.util.StringIterator');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

goog.setTestOnly();


var si = null;

function setUp() {
  si = new e2e.otr.util.StringIterator('test');
}

function tearDown() {
  si = null;
}

function testConstructor() {
  assertEquals(si.string_, 'test');
  assertEquals(si.index_, 0);
}

function testHasNext() {
  assertTrue(si.hasNext());
  si.next(999);
  assertFalse(si.hasNext());
}

function testNext() {
  assertEquals(si.next(), 't');
  assertEquals(si.next(2), 'es');
  assertEquals(si.next(999), 't');
}

function testPeek() {
  assertEquals(si.peek(), 't');
  assertEquals(si.peek(), 't');
  assertEquals(si.peek(3), 'tes');
  assertEquals(si.peek(4), 'test');
  assertEquals(si.next(), 't');
  assertEquals(si.peek(), 'e');
}
