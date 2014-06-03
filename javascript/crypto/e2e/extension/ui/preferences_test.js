// Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Tests for the preferences handler.
 */

goog.require('e2e.ext.constants');
goog.require('e2e.ext.ui.preferences');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

var constants = e2e.ext.constants;
var preferences = e2e.ext.ui.preferences;


function setUp() {
  window.localStorage.removeItem(constants.StorageKey.ENABLE_WELCOME_SCREEN);
  window.localStorage.removeItem(constants.StorageKey.ENABLE_ACTION_SNIFFING);
  window.localStorage.removeItem(constants.StorageKey.ENABLE_AUTO_SAVE);
}


function testWelcomeScreen() {
  assertFalse(preferences.isWelcomePageEnabled());
  preferences.setWelcomePageEnabled(true);
  assertTrue(preferences.isWelcomePageEnabled());
}


function testActionSniffing() {
  assertFalse(preferences.isActionSniffingEnabled());
  preferences.setActionSniffingEnabled(true);
  assertTrue(preferences.isActionSniffingEnabled());
}


function testAutoSave() {
  assertFalse(preferences.isAutoSaveEnabled());
  preferences.setAutoSaveEnabled(true);
  assertTrue(preferences.isAutoSaveEnabled());
}


function testDefaults() {
  preferences.initDefaults();
  assertTrue(preferences.isWelcomePageEnabled());
  assertTrue(preferences.isActionSniffingEnabled());
  assertTrue(preferences.isAutoSaveEnabled());
}
