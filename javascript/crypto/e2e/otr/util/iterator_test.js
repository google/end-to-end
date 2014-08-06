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
 * @fileoverview Tests for the Iterator utility methods.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.require('e2e.otr.util.Iterator');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

goog.setTestOnly();

var si = null, ai = null;

function setUp() {
  si = new e2e.otr.util.Iterator('test');
  ai = new e2e.otr.util.Iterator(['a', 'r', 'r', 'a', 'y']);
}

function tearDown() {
  si = null;
  ai = null;
}

function testConstructor() {
  assertEquals(si.iterable_, 'test');
  assertEquals(si.index_, 0);
  assertArrayEquals(ai.iterable_, ['a', 'r', 'r', 'a', 'y']);
  assertEquals(ai.index_, 0);

  [5, 0, null, undefined, {}, true].forEach(function(arg) {
    assertTrue(assertThrows(function() {
      new e2e.otr.util.Iterator(arg);
    }) instanceof e2e.otr.error.InvalidArgumentsError);
  });
}

function testHasNext() {
  assertTrue(si.hasNext());
  si.next(4);
  assertFalse(si.hasNext());

  assertTrue(ai.hasNext());
  ai.next(5);
  assertFalse(ai.hasNext());
}

function testNext() {
  assertEquals(si.next(), 't');
  assertEquals(si.next(2), 'es');
  assertEquals(si.next(999), 't');

  assertArrayEquals(ai.next(), ['a']);
  assertArrayEquals(ai.next(2), ['r', 'r']);
  assertArrayEquals(ai.next(999), ['a', 'y']);
}

function testPeek() {
  assertEquals(si.peek(), 't');
  assertEquals(si.peek(), 't');
  assertEquals(si.peek(3), 'tes');
  assertEquals(si.peek(5), 'test');
  assertEquals(si.next(), 't');
  assertEquals(si.peek(), 'e');

  assertArrayEquals(ai.peek(), ['a']);
  assertArrayEquals(ai.peek(), ['a']);
  assertArrayEquals(ai.peek(3), ['a', 'r', 'r']);
  assertArrayEquals(ai.peek(6), ['a', 'r', 'r', 'a', 'y']);
  assertArrayEquals(ai.next(), ['a']);
  assertArrayEquals(ai.peek(), ['r']);
}
