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
 * @fileoverview Tests for the PreferenceEntry.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.panels.PreferenceEntryTest');

/** @suppress {extraRequire} since the dependent soy files don't do this */
goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.ui.panels.PreferenceEntry');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var stubs = null;
var mockControl = null;


function setUp() {
  mockControl = new goog.testing.MockControl();
}


function tearDown() {
  mockControl.$tearDown();
}


function testRender() {
  var panel = new e2e.ext.ui.panels.PreferenceEntry('name',
      'description', mockControl.createFunctionMock('setPreference'), true);

  panel.setterCallback_(false);
  mockControl.$replayAll();

  panel.render(document.body);


  var inputElem = document.getElementById('preference-name');
  assertNotNull(inputElem);
  assertContains('description', document.body.textContent);

  inputElem.click();
  mockControl.$verifyAll();
}
