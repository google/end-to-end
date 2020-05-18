/**
 * @license
 * Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Tests for the overlay UI
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.dialogs.OverlayTest');

goog.require('e2e.ext.ui.dialogs.Overlay');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var dialog = null;


function setUp() {
  mockControl = new goog.testing.MockControl();
  dialog = new e2e.ext.ui.dialogs.Overlay();
}


function tearDown() {
  mockControl.$tearDown();

  goog.dispose(dialog);
  dialog = null;
}


function testCloseButton() {
  dialog.setVisible(true);
  var okButton = dialog.getElement().querySelector('button[name=ok]');

  assertFalse(dialog.isDisposed());

  okButton.click();

  assertTrue(dialog.isDisposed());
}
