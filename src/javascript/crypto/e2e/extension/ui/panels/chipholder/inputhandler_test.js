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
 * @fileoverview Tests for the UI chip holder input handler.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.panels.ChipHolderInputHandlerTest');

goog.require('e2e.ext.constants');
goog.require('e2e.ext.ui.panels.ChipHolderInputHandler');
goog.require('goog.events.KeyCodes');
goog.require('goog.events.KeyEvent');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var constants = e2e.ext.constants;
var stubs;


function setUp() {
  stubs = new goog.testing.PropertyReplacer();
}


function tearDown() {
  stubs.reset();
}


function testEnterOnInvalidValue() {
  var INVALID_VALUE = 'invalid';
  var called = false;
  var inputHandler = new e2e.ext.ui.panels.ChipHolderInputHandler(
      function(value) {
        called = true;
        assertEquals(INVALID_VALUE, value);
      });
  var autoCompleteStub = {
    isOpen: function() { return false; },
    cancelDelayedDismiss: goog.nullFunction,
    selectHilited: goog.nullFunction
  };
  var input = document.createElement('input');
  input.value = INVALID_VALUE;
  inputHandler.attachAutoComplete(autoCompleteStub);
  stubs.setPath('goog.dom.getActiveElement', function() {
    return input;
  });

  inputHandler.attachInput(input);
  var keyEvent = new goog.events.KeyEvent(goog.events.KeyCodes.ENTER,
      0, false, {
        target: input
      });

  inputHandler.keyHandler_.dispatchEvent(keyEvent);
  assertTrue(called);
}


function testSelectRow() {
  var ROW = 'test';
  var called = false;
  var inputHandler = new e2e.ext.ui.panels.ChipHolderInputHandler(
      function(value) {
        called = true;
        assertEquals(ROW, value);
      });
  var input = document.createElement('input');
  inputHandler.attachInput(input);
  inputHandler.processFocus(input);
  inputHandler.selectRow(ROW);
  assertTrue(called);
}
