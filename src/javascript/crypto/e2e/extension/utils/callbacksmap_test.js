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
 * @fileoverview Tests for the CallbacksMap.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.utils.CallbacksMapTest');

goog.require('e2e.ext.utils.CallbacksMap');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

goog.setTestOnly();

var map;

function setUp() {
  map = new e2e.ext.utils.CallbacksMap();
}

function testAddCallbacks() {
  var anotherFunction = function() {};

  var key = map.addCallbacks(goog.nullFunction, anotherFunction);
  assertTrue(map.containsKey(key));
  assertEquals(map.get(key).callback, goog.nullFunction);
  assertEquals(map.get(key).errback, anotherFunction);
  var keyTwo = map.addCallbacks(goog.nullFunction, goog.nullFunction);
  assertTrue(keyTwo != key);
}


function testGetAndRemove() {
  assertThrows(function() {
    map.getAndRemove('notexisting');
  });

  var one = function() {};
  var two = function() {};
  var key = map.addCallbacks(one, two);
  keys = map.getAndRemove(key);
  assertEquals(one, keys.callback);
  assertEquals(two, keys.errback);
  assertFalse(map.containsKey(key));
}
