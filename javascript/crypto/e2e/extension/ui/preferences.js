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
 * @fileoverview Handles the user's preferences inside the extension.
 */

goog.provide('e2e.ext.ui.preferences');

goog.require('e2e.ext.constants');

goog.scope(function() {
var constants = e2e.ext.constants;
var preferences = e2e.ext.ui.preferences;


/**
 * Initializes the default preferences.
 */
preferences.initDefaults = function() {
  if (undefined == window.localStorage.getItem(
      constants.StorageKey.ENABLE_WELCOME_SCREEN)) {
    preferences.setWelcomePageEnabled(true);
  }

  if (undefined == window.localStorage.getItem(
      constants.StorageKey.ENABLE_ACTION_SNIFFING)) {
    preferences.setActionSniffingEnabled(true);
  }

  if (undefined == window.localStorage.getItem(
      constants.StorageKey.ENABLE_AUTO_SAVE)) {
    preferences.setAutoSaveEnabled(true);
  }
};


/**
 * Enables/disables the welcome page.
 * @param {boolean} enable True if the page is to be enabled.
 */
preferences.setWelcomePageEnabled = function(enable) {
  window.localStorage.setItem(
      constants.StorageKey.ENABLE_WELCOME_SCREEN, enable.toString());
};


/**
 * Indicates whether the welcome page is enabled.
 * @return {boolean} True if the welcome is enabled.
 */
preferences.isWelcomePageEnabled = function() {
  return 'true' == window.localStorage.getItem(
      constants.StorageKey.ENABLE_WELCOME_SCREEN);
};


/**
 * Enables/disables PGP action guessing.
 * @param {boolean} enable True if guess is to be enabled.
 */
preferences.setActionSniffingEnabled = function(enable) {
  window.localStorage.setItem(
      constants.StorageKey.ENABLE_ACTION_SNIFFING, enable.toString());
};


/**
 * Indicates whether PGP action guessing is enabled.
 * @return {boolean} True if enabled.
 */
preferences.isActionSniffingEnabled = function() {
  return 'true' == window.localStorage.getItem(
      constants.StorageKey.ENABLE_ACTION_SNIFFING);
};


/**
 * Enables/disables auto-save for drafts.
 * @param {boolean} enable True if auto-save is to be enabled.
 */
preferences.setAutoSaveEnabled = function(enable) {
  window.localStorage.setItem(
      constants.StorageKey.ENABLE_AUTO_SAVE, enable.toString());
};


/**
 * Indicates whether auto-save is enabled for drafts.
 * @return {boolean} True if enabled.
 */
preferences.isAutoSaveEnabled = function() {
  return 'true' == window.localStorage.getItem(
      constants.StorageKey.ENABLE_AUTO_SAVE);
};

}); // goog.scope
