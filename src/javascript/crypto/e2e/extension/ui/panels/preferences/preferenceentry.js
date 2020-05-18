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
 * @fileoverview Renders an individual preference that the user has set.
 */

goog.provide('e2e.ext.ui.panels.PreferenceEntry');

goog.require('e2e.ext.ui.templates.panels.preferences');
goog.require('goog.events.EventType');
goog.require('goog.soy');
goog.require('goog.ui.Component');

goog.scope(function() {
var panels = e2e.ext.ui.panels;
var templates = e2e.ext.ui.templates.panels.preferences;


/**
 * Constructor for the preference entry.
 */
panels.PreferenceEntry = class extends goog.ui.Component {
  /**
   * @param {string} name The name of the preference.
   * @param {string} description The description for the preference.
   * @param {!function(boolean)} setterCallback The callback to invoke when the
   *     preference is set or unset.
   * @param {boolean=} opt_isSet Optional. True if the user has selected this
   *     preference. Defaults to false.
   */
  constructor(name, description, setterCallback, opt_isSet) {
    super();

    /**
     * The name of the preference.
     * @type {string}
     * @private
     */
    this.name_ = name;

    /**
     * The description of the preference.
     * @type {string}
     * @private
     */
    this.description_ = description;

    /**
     * The callback to invoke when the user selects/unselects the preference.
     * @type {!function(boolean)}
     * @private
     */
    this.setterCallback_ = setterCallback;

    /**
     * True if the user has selected the preference. Defaults to false.
     * @type {boolean}
     * @private
     */
    this.isSet_ = Boolean(opt_isSet);
  }

  /** @override */
  createDom() {
    super.createDom();
    this.decorateInternal(this.getElement());
  }

  /** @override */
  decorateInternal(elem) {
    super.decorateInternal(elem);

    goog.soy.renderElement(elem, templates.preferenceEntry, {
      name: this.name_,
      description: this.description_,
      checked: this.isSet_
    });
  }

  /** @override */
  enterDocument() {
    super.enterDocument();

    this.getHandler().listen(
        this.getElement(), goog.events.EventType.CHANGE, this.updatePreference_,
        true);
  }

  /**
   * Updates the preference upon a user interaction.
   * @param {!goog.events.Event} changeEvt The UI event that results from the
   *     user interaction.
   * @private
   */
  updatePreference_(changeEvt) {
    var inputElem = /** @type {HTMLInputElement} */ (changeEvt.target);
    this.setterCallback_(inputElem.checked);
  }
};


});  // goog.scope
