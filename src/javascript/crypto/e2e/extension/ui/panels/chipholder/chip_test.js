/**
 * @license
 * Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Tests for the UI chips.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.panels.ChipTest');

goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.ui.panels.Chip');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.ui.Component');
goog.setTestOnly();

var stubs = new goog.testing.PropertyReplacer();


function setUp() {
  e2e.ext.testingstubs.initStubs(stubs);
}


function tearDown() {
  stubs.reset();
}


function testRenderUid() {
  var uid = 'test uid';
  var chip = new e2e.ext.ui.panels.Chip(uid);
  chip.render(document.body);

  assertContains(uid, document.body.textContent);
  assertEquals(uid, chip.getValue());
}


function testRenderPassphrase() {
  var pass = 'secret';
  var chip = new e2e.ext.ui.panels.Chip(pass, true);
  chip.render(document.body);

  assertContains('promptPassphraseMask', document.body.textContent);
  assertEquals(pass, chip.getValue());
}


function testRemove() {
  var parent = new goog.ui.Component();
  var chip = new e2e.ext.ui.panels.Chip('irrelevant', true);

  parent.addChild(chip, true);
  assertTrue(chip.remove());

  assertEquals(0, parent.getChildCount());
}


function testLock() {
  var parent = new goog.ui.Component();
  var chip = new e2e.ext.ui.panels.Chip('irrelevant', true);
  parent.addChild(chip, true);
  assertFalse(chip.isLocked());
  chip.lock();
  assertTrue(chip.isLocked());
  assertFalse(chip.remove());
  assertEquals(1, parent.getChildCount());
}
