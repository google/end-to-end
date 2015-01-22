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
 * @fileoverview Renders the list of preferences that the user has set.
 */

goog.provide('e2e.ext.ui.panels.PreferencesPanel');

goog.require('e2e.ext.constants.StorageKey');
goog.require('e2e.ext.ui.panels.PreferenceEntry');
goog.require('e2e.ext.ui.templates.panels.preferences');
goog.require('goog.array');
goog.require('goog.ui.Component');
goog.require('soy');

goog.scope(function() {
var constants = e2e.ext.constants;
var panels = e2e.ext.ui.panels;
var templates = e2e.ext.ui.templates.panels.preferences;



/**
 * Constructor for the preferences list.
 * @param {!e2e.ext.Preferences} preferences User preferences.
 * @constructor
 * @extends {goog.ui.Component}
 */
panels.PreferencesPanel = function(preferences) {
  goog.base(this);

  /**
   * User preferences.
   * @type {!e2e.ext.Preferences}
   * @private
   */
  this.preferences_ = preferences;
};
goog.inherits(panels.PreferencesPanel, goog.ui.Component);


/** @override */
panels.PreferencesPanel.prototype.createDom = function() {
  goog.base(this, 'createDom');
  this.decorateInternal(this.getElement());
};


/** @override */
panels.PreferencesPanel.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);

  soy.renderElement(elem, templates.listPreferences, {
    sectionTitle: chrome.i18n.getMessage('preferencesSectionTitle')
  });

  var prefs = [
    {
      name: constants.StorageKey.ENABLE_WELCOME_SCREEN,
      description: chrome.i18n.getMessage('preferenceWelcomeScreen'),
      setterCallback: goog.bind(this.preferences_.setWelcomePageEnabled,
          this.preferences_),
      isSet: this.preferences_.isWelcomePageEnabled()
    }
  ];
  goog.array.forEach(prefs, function(pref) {
    var prefEntry = new panels.PreferenceEntry(
        pref.name, pref.description, pref.setterCallback, pref.isSet);
    this.addChild(prefEntry, true);
  }, this);
};


});  // goog.scope
