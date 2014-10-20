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
 * @fileoverview Provides a chip to represent PGP UIDs and passphrases
 * in the UI.
 */

goog.provide('e2e.ext.ui.panels.Chip');

goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.ui.templates.panels.chipholder');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('goog.events.EventType');
goog.require('goog.ui.Component');
goog.require('soy');

goog.scope(function() {
var panels = e2e.ext.ui.panels;
var templates = e2e.ext.ui.templates.panels.chipholder;
var constants = e2e.ext.constants;



/**
 * Constructor for the chip.
 * @param {string} value The UID or passphrase to render.
 * @param {boolean=} opt_isPassphrase If true, the provided UID is a passphrase
 *     and should be masked when displayed in the UI. Default is false.
 * @constructor
 * @extends {goog.ui.Component}
 */
panels.Chip = function(value, opt_isPassphrase) {
  goog.base(this);

  /**
   * The UID or passphrase to render.
   * @type {string}
   * @private
   */
  this.value_ = value;

  /**
   * If true, the chip is locked and cannot be removed or changed.
   * @type {boolean}
   * @private
   */
  this.isLocked_ = false;

  /**
   * If true, the value of this chip is a passphrase and should be masked when
   * displayed in the UI. Default is false.
   * @type {boolean}
   * @private
   */
  this.isPassphrase_ = Boolean(opt_isPassphrase);
};
goog.inherits(panels.Chip, goog.ui.Component);


/** @override */
panels.Chip.prototype.createDom = function() {
  this.decorateInternal(goog.dom.createElement(goog.dom.TagName.DIV));
};


/** @override */
panels.Chip.prototype.decorateInternal = function(elem) {
  this.setElementInternal(elem);

  var displayValue = this.isPassphrase() ?
      chrome.i18n.getMessage('promptPassphraseMask') : this.value_;
  soy.renderElement(elem, templates.renderChip, {
    value: displayValue
  });
};


/** @override */
panels.Chip.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.getHandler().listen(
      this.getElement().querySelector('img'),
      goog.events.EventType.CLICK,
      this.remove);
};


/**
 * Returns the enclosed UID or passphrase.
 * @return {string} The enclosed UID or passphrase.
 */
panels.Chip.prototype.getValue = function() {
  return this.value_;
};


/**
 * Removes the current chip from the UI, if it's not locked.
 * @return {boolean} Value indicating if the chip was removed.
 */
panels.Chip.prototype.remove = function() {
  if (this.isLocked_) {
    return false;
  }
  this.getParent().removeChild(this, true);
  return true;
};


/**
 * Hides UI element that enables users to remove a chip.
 */
panels.Chip.prototype.lock = function() {
  this.isLocked_ = true;
  var img = this.getElement().querySelector('img');
  goog.dom.classlist.add(img, constants.CssClass.INVISIBLE);
};


/**
 * Returns true, if chip is locked and cannot be removed or changed.
 * @return {boolean} is chip locked
 */
panels.Chip.prototype.isLocked = function() {
  return this.isLocked_;
};


/**
 * @return {boolean} True if the value of this chip is a passphrase.
 */
panels.Chip.prototype.isPassphrase = function() {
  return this.isPassphrase_;
};

});  // goog.scope
