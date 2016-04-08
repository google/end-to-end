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
 * @fileoverview Handles the user's preferences inside the extension.
 */

goog.provide('e2e.ext.Preferences');

goog.require('e2e.ext.constants.StorageKey');



/**
 * Class to handle user's preferences.
 * @constructor
 * @param {!goog.storage.mechanism.Mechanism} storage mechanism for storing
 *     preferences data.
 */
e2e.ext.Preferences = function(storage) {

  /**
   * Mechanism for storing preferences.
   * @type {!goog.storage.mechanism.Mechanism}
   * @private
   */
  this.storage_ = storage;
};

goog.scope(function() {
var constants = e2e.ext.constants;


/**
 * @param {string} key
 * @return {?string}
 * @export
 */
e2e.ext.Preferences.prototype.getItem = function(key) {
  return this.storage_.get(key);
};


/**
 * Initializes the default preferences.
 * @export
 */
e2e.ext.Preferences.prototype.initDefaults = function() {
  if (null === this.getItem(
      constants.StorageKey.ENABLE_WELCOME_SCREEN)) {
    this.setWelcomePageEnabled(true);
  }

  if (null === this.getItem(
      constants.StorageKey.ENABLE_LOOKING_GLASS)) {
    this.setLookingGlassEnabled(false);
  }
};


/**
 * Enables/disables the welcome page.
 * @param {boolean} enable True if the page is to be enabled.
 * @export
 */
e2e.ext.Preferences.prototype.setWelcomePageEnabled = function(enable) {
  this.storage_.set(
      constants.StorageKey.ENABLE_WELCOME_SCREEN, enable.toString());
};


/**
 * Indicates whether the welcome page is enabled.
 * @return {boolean} True if the welcome is enabled.
 * @export
 */
e2e.ext.Preferences.prototype.isWelcomePageEnabled = function() {
  return 'true' == this.storage_.get(
      constants.StorageKey.ENABLE_WELCOME_SCREEN);
};


/**
 * Enables/disables the looking glass.
 * @param {boolean} enable True if the looking glass is to be enabled.
 * @export
 */
e2e.ext.Preferences.prototype.setLookingGlassEnabled = function(enable) {
  this.storage_.set(
      constants.StorageKey.ENABLE_LOOKING_GLASS, enable.toString());
};


/**
 * Indicates whether the looking glass is enabled.
 * @return {boolean} True if enabled.
 * @export
 */
e2e.ext.Preferences.prototype.isLookingGlassEnabled = function() {
  return 'true' == this.storage_.get(
      constants.StorageKey.ENABLE_LOOKING_GLASS);
};

});  // goog.scope
