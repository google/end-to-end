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
 * @fileoverview Holds one to many UI chips.
 */

goog.provide('e2e.ext.ui.panels.ChipHolder');

goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.ui.panels.Chip');
goog.require('e2e.ext.ui.panels.ChipHolderInputHandler');
goog.require('e2e.ext.ui.templates.panels.chipholder');
goog.require('goog.array');
goog.require('goog.dom.classlist');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.events.KeyHandler');
goog.require('goog.string');
goog.require('goog.structs.Map');
goog.require('goog.style');
goog.require('goog.ui.Component');
goog.require('goog.ui.ac.ArrayMatcher');
goog.require('goog.ui.ac.AutoComplete');
goog.require('goog.ui.ac.Renderer');
goog.require('soy');

goog.scope(function() {
var constants = e2e.ext.constants;
var panels = e2e.ext.ui.panels;
var templates = e2e.ext.ui.templates.panels.chipholder;



/**
 * Constructor for the chip holder.
 * @param {!Array.<string>} selectedUids The UIDs that have already been
 *     selected.
 * @param {!Array.<string>} allUids All UIDs that are available for selection.
 * @param {Function} renderEncryptionPassphraseCallback Callback for rendering
 *     an encryption passphrase dialog.
 * @constructor
 * @extends {goog.ui.Component}
 */
panels.ChipHolder = function(selectedUids, allUids,
    renderEncryptionPassphraseCallback) {
  goog.base(this);

  /**
   * The UIDs that have already been selected by the user.
   * @type {!Array.<string>}
   * @private
   */
  this.selectedUids_ = selectedUids;

  /**
   * All available UIDs from which the user can choose.
   * @type {!Array.<string>}
   * @private
   */
  this.allUids_ = allUids;

  /**
   * If true, ChipHolder is locked and cannot be modified.
   * @type {boolean}
   * @private
   */
  this.isLocked_ = false;

  /**
   * Callback for rendering an passphrase encryption dialog.
   * @type {Function}
   * @private
   */
  this.renderEncryptionPassphraseCallback_ =
      renderEncryptionPassphraseCallback;
};
goog.inherits(panels.ChipHolder, goog.ui.Component);


/**
 * A shadow input element used by the AutoComplete.
 * @type {Element}
 * @private
 */
panels.ChipHolder.prototype.shadowInputElem_ = null;


/**
 * An auto-complete component to assist the user in choosing PGP keys.
 * @type {goog.ui.ac.AutoComplete}
 * @private
 */
panels.ChipHolder.prototype.autoComplete_ = null;


/**
 * A keyboard shortcut handler.
 * @type {goog.events.KeyHandler}
 * @private
 */
panels.ChipHolder.prototype.keyHandler_ = null;


/** @override */
panels.ChipHolder.prototype.decorateInternal = function(elem) {
  this.setElementInternal(elem);
  this.keyHandler_ = new goog.events.KeyHandler(elem, true);

  soy.renderElement(elem, templates.renderChipHolder, {
    recipientsTitle: chrome.i18n.getMessage('promptRecipientsPlaceholder'),
    passphraseEncryptionLinkTitle: chrome.i18n.getMessage(
        'promptEncryptionPassphraseLink'),
    passphraseEncryptionLinkTooltip: chrome.i18n.getMessage(
        'promptEncryptionPassphraseLinkTooltip')
  });

  this.shadowInputElem_ = elem.querySelector('input');
};


/**
 * Factory function for building an autocomplete widget for the Chips.
 * @return {!goog.ui.ac.AutoComplete} A new autocomplete object.
 * @private
 */
panels.ChipHolder.prototype.createAutoComplete_ = function() {
  var matcher = new goog.ui.ac.ArrayMatcher(this.allUids_, false);
  var renderer = new goog.ui.ac.Renderer();
  var inputHandler = new panels.ChipHolderInputHandler(goog.bind(
      this.handleNewChipValue_, this));
  var autoComplete = new goog.ui.ac.AutoComplete(
      matcher, renderer, inputHandler);
  inputHandler.attachAutoComplete(autoComplete);
  inputHandler.attachInputs(this.shadowInputElem_);
  return autoComplete;
};


/**
 * Handles the new chip value entered by the user, detecting whether the chip
 * is valid or not.
 * @param  {string} chipValue The value of the chip.
 * @private
 */
panels.ChipHolder.prototype.handleNewChipValue_ = function(chipValue) {
  var markChipBad = !goog.array.contains(this.allUids_, chipValue);
  this.addAndMarkChip_(markChipBad);
};


/** @override */
panels.ChipHolder.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  goog.array.forEach(this.selectedUids_, this.addChip, this);

  this.autoComplete_ = this.createAutoComplete_();

  var renderer = this.autoComplete_.getRenderer();
  renderer.setAnchorElement(this.getElement());
  this.getHandler().listen(
      this.getElement(),
      goog.events.EventType.CLICK,
      this.focus,
      true);

  this.getHandler().listen(
      this.shadowInputElem_,
      goog.events.EventType.KEYDOWN,
      this.increaseInputArea_);

  this.getHandler().listen(
      this.keyHandler_,
      goog.events.KeyHandler.EventType.KEY,
      this.handleKeyEvent_);

  this.getHandler().listen(
      this.getElementByClass(constants.CssClass.PASSPHRASE_ENCRYPTION_LINK),
      goog.events.EventType.CLICK, this.renderEncryptionPassphraseCallback_);
};


/**
 * Adds a new chip to the chip holder using the selection in the input field.
 * Aborts if ChipHolder is locked.
 * @param {panels.Chip|string=} opt_chip The chip or UID to render.
 */
panels.ChipHolder.prototype.addChip = function(opt_chip) {
  if (this.isLocked_) {
    return;
  }

  var chip = null;
  if (opt_chip && opt_chip instanceof panels.Chip) {
    chip = /** @type {panels.Chip} */ (opt_chip);
  } else {
    var uid = goog.string.trim(typeof opt_chip == 'string' ?
        opt_chip : this.shadowInputElem_.value);
    chip = new panels.Chip(uid.replace(/,\s*$/, ''));
  }

  if (chip.getValue().length == 0) {
    return;
  }

  this.addChild(chip);
  chip.renderBefore(this.shadowInputElem_);
  this.shadowInputElem_.value = '';
  this.shadowInputElem_.placeholder = '';
  goog.style.setWidth(this.shadowInputElem_, 10);
};


/**
 * Returns a list with the selected UIDs.
 * @return {!Array.<string>} A list with the selected UIDs.
 */
panels.ChipHolder.prototype.getSelectedUids = function() {
  if (this.shadowInputElem_.value.length > 0) {
    this.addAndMarkChip_(true);
  }
  var uids = new goog.structs.Map();
  this.forEachChild(function(chip) {
    if (!chip.isPassphrase()) {
      uids.set(chip.getValue(), true);
    }
  });

  return uids.getKeys();
};


/**
 * Returns a list with the user-provided passphrases (for symmetric encryption).
 * @return {!Array.<string>} A list with the provided passphrases.
 */
panels.ChipHolder.prototype.getProvidedPassphrases = function() {
  var passphrases = new goog.structs.Map();
  this.forEachChild(function(chip) {
    if (chip.isPassphrase()) {
      passphrases.set(chip.getValue(), true);
    }
  });

  return passphrases.getKeys();
};


/**
 * Changes focus to the input field.
 */
panels.ChipHolder.prototype.focus = function() {
  this.shadowInputElem_.focus();
};


/**
 * Handles keyboard events. Ignores them if ChipHolder is locked.
 * @param {goog.events.KeyEvent} evt The keyboard event to handle.
 * @private
 */
panels.ChipHolder.prototype.handleKeyEvent_ = function(evt) {
  if (this.isLocked_) {
    return;
  }

  switch (evt.keyCode) {
    case goog.events.KeyCodes.BACKSPACE:
      this.removeChipOnBackspace_();
      break;
    default:
      if (goog.events.KeyCodes.isCharacterKey(evt.keyCode)) {
        this.increaseInputArea_();
      }
  }
};


/**
 * Adds a chip and marks it as bad if needed.
 * @param {boolean} markChipBad Whether to mark the chip bad.
 * @private
 */
panels.ChipHolder.prototype.addAndMarkChip_ = function(markChipBad) {
  this.addChip();

  if (markChipBad) {
    var chip = this.getChildAt(this.getChildCount() - 1);
    goog.dom.classlist.add(chip.getElement(), constants.CssClass.BAD_CHIP);
  }
};


/**
 * Increases the width of the input field.
 * @private
 */
panels.ChipHolder.prototype.increaseInputArea_ = function() {
  goog.style.setWidth(
      this.shadowInputElem_,
      goog.style.getSize(this.shadowInputElem_).width + 10);
};


/** @override */
panels.ChipHolder.prototype.removeChild = function(child, opt_unrender) {
  var result = goog.base(this, 'removeChild', child, opt_unrender);

  if (this.getChildCount() == 0) {
    goog.style.setWidth(this.shadowInputElem_, 100);
  }

  return result;
};


/**
 * Removes the last chip from the holder if the input field is empty when the
 * user has pressed backspace. Aborts if ChipHolder is locked.
 * @private
 */
panels.ChipHolder.prototype.removeChipOnBackspace_ = function() {
  if (this.isLocked_) {
    return;
  }
  if (this.shadowInputElem_.value.length == 0 && this.getChildCount() > 0) {
    var chip = this.getChildAt(this.getChildCount() - 1);
    this.removeChild(chip, true);
  }

  if (this.getChildCount() == 0) {
    goog.style.setWidth(this.shadowInputElem_, 100);
  }
};


/**
 * Locks a ChipHolder, disallowing modifications to chips.
 */
panels.ChipHolder.prototype.lock = function() {
  this.isLocked_ = true;
  this.forEachChild(function(chip) {
    chip.lock();
  });
  goog.dom.classlist.add(this.shadowInputElem_, constants.CssClass.INVISIBLE);
  var passphraseEncryptionLink = this.getElementByClass(
      constants.CssClass.PASSPHRASE_ENCRYPTION_LINK);
  goog.dom.classlist.add(
      passphraseEncryptionLink, constants.CssClass.INVISIBLE);
};


/**
 * Returns true, if ChipHolder is locked and cannot be removed or changed.
 * @return {boolean} is ChipHolder locked
 */
panels.ChipHolder.prototype.isLocked = function() {
  return this.isLocked_;
};

});  // goog.scope
