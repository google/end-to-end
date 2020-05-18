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
 * @fileoverview Tests for the preferences handler.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.PreferencesTest');

goog.require('e2e.ext.Preferences');
goog.require('e2e.ext.constants');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.storage.FakeMechanism');
goog.setTestOnly();

var constants = e2e.ext.constants;
var fakeStorage;
var preferences;


function setUp() {
  fakeStorage = new goog.testing.storage.FakeMechanism();
  preferences = new e2e.ext.Preferences(fakeStorage);
}


function testWelcomeScreen() {
  assertFalse(preferences.isWelcomePageEnabled());
  preferences.setWelcomePageEnabled(true);
  assertTrue(preferences.isWelcomePageEnabled());
}


function testLookingGlass() {
  assertFalse(preferences.isLookingGlassEnabled());
  preferences.setLookingGlassEnabled(true);
  assertTrue(preferences.isLookingGlassEnabled());
}


function testDefaults() {
  preferences.initDefaults();
  assertTrue(preferences.isWelcomePageEnabled());
  assertFalse(preferences.isLookingGlassEnabled());
}
