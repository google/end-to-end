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
 * @fileoverview Tests for the generic dialog.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.dialogs.GenericTest');
goog.require('e2e.ext.ui.dialogs.Generic');
goog.require('e2e.ext.ui.dialogs.InputType');
goog.require('goog.events.KeyCodes');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.ui.Component');
goog.setTestOnly();

var dialog = null;


function setUp() {
  dialog = new e2e.ext.ui.dialogs.Generic(
      'message',
      function() {},
      e2e.ext.ui.dialogs.InputType.SECURE_TEXT,
      'placeholder');

  var parent = new goog.ui.Component();
  parent.render(document.body);
  parent.addChild(dialog, true);
}


function testRender() {
  assertContains('message', document.body.textContent);

  var input = document.querySelector('input');
  assertEquals('password', input.type);
  assertEquals('placeholder', input.placeholder);
}


function testInvokeCallback() {
  var calledCallback = false;
  dialog.dialogCallback_ = function(returnValue) {
    assertEquals('returnValue', returnValue);
    calledCallback = true;
  };

  document.querySelector('input').value = 'returnValue';
  dialog.invokeCallback(false);
  assertTrue(calledCallback);
}


function testKeyboardShortcutHandler() {
  assertNotNull(dialog.keyboardHandler_);
  assertTrue('Failed to register shortcut',
      dialog.keyboardHandler_.isShortcutRegistered(goog.events.KeyCodes.ENTER));
}
