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
 * @fileoverview Tests for the PreferencesPanel.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.panels.PreferencesPanelTest');

goog.require('e2e.ext.Preferences');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.ui.panels.PreferencesPanel');
goog.require('goog.array');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.storage.FakeMechanism');
goog.setTestOnly();

var panel = null;
var preferences = null;
var storage = null;
var stubs = null;


function setUp() {
  stubs = new goog.testing.PropertyReplacer();
  e2e.ext.testingstubs.initStubs(stubs);
  storage = new goog.testing.storage.FakeMechanism();
  preferences = new e2e.ext.Preferences(storage);
  panel = new e2e.ext.ui.panels.PreferencesPanel(preferences);
}


function tearDown() {
  stubs.reset();
  stubs = null;
}

function testRender() {
  panel.render(document.body);

  assertContains('preferencesSectionTitle', document.body.textContent);

  goog.array.forEach(document.querySelectorAll('input'), function(elem) {
    elem.click();
  });

  assertTrue(preferences.isWelcomePageEnabled());
}
