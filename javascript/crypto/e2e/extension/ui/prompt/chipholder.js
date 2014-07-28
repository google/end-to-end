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
 * @fileoverview Holds one to many UI chips.
 */

goog.provide('e2e.ext.ChipHolder');

goog.require('e2e.ext.Chip');
goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.ui.templates.prompt');
goog.require('goog.array');
goog.require('goog.dom.classlist');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.events.KeyHandler');
goog.require('goog.string');
goog.require('goog.structs.Map');
goog.require('goog.style');
goog.require('goog.ui.Component');
goog.require('goog.ui.ac');
goog.require('goog.ui.ac.AutoComplete');
goog.require('soy');

goog.scope(function() {
var ext = e2e.ext;
var constants = e2e.ext.constants;
var templates = e2e.ext.ui.templates.prompt;



/**
 * Constructor for the chip holder.
 * @param {!Array.<string>} selectedUids The UIDs that have already been
 *     selected.
 * @param {!Array.<string>} allUids All UIDs that are available for selection.
 * @constructor
 * @extends {goog.ui.Component}
 */
ext.ChipHolder = function(selectedUids, allUids) {
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

};
goog.inherits(ext.ChipHolder, goog.ui.Component);


/**
 * A shadow input element used by the AutoComplete.
 * @type {Element}
 * @private
 */
ext.ChipHolder.prototype.shadowInputElem_ = null;


/**
 * An auto-complete component to assist the user in choosing PGP keys.
 * @type {goog.ui.ac.AutoComplete}
 * @private
 */
ext.ChipHolder.prototype.autoComplete_ = null;


/**
 * A keyboard shortcut handler.
 * @type {goog.events.KeyHandler}
 * @private
 */
ext.ChipHolder.prototype.keyHandler_ = null;


/** @override */
ext.ChipHolder.prototype.decorateInternal = function(elem) {
  this.setElementInternal(elem);
  this.keyHandler_ = new goog.events.KeyHandler(elem, true);

  soy.renderElement(elem, templates.renderChipHolder, {
    recipientsTitle: chrome.i18n.getMessage('promptRecipientsPlaceholder')
  });

  this.shadowInputElem_ = elem.querySelector('input');
};


/** @override */
ext.ChipHolder.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  goog.array.forEach(this.selectedUids_, this.addChip, this);

  this.autoComplete_ = goog.ui.ac.createSimpleAutoComplete(
      this.allUids_, // values for the auto-complete box
      this.shadowInputElem_,
      true); // multi-line

  var renderer = this.autoComplete_.getRenderer();
  renderer.setAnchorElement(this.getElement());
  this.getHandler().listen(
      renderer,
      goog.ui.ac.AutoComplete.EventType.SELECT,
      this.addChip);

  this.getHandler().listen(
      this.getElement(),
      goog.events.EventType.CLICK,
      this.refocus_,
      true);

  this.getHandler().listen(
      this.shadowInputElem_,
      goog.events.EventType.KEYDOWN,
      this.increaseInputArea_);

  this.getHandler().listen(
      this.keyHandler_,
      goog.events.KeyHandler.EventType.KEY,
      this.handleKeyEvent_);
};


/**
 * Adds a new chip to the chip holder using the selection in the input field.
 * Aborts if ChipHolder is locked.
 * @param {ext.Chip|string=} opt_chip The chip or UID to render.
 */
ext.ChipHolder.prototype.addChip = function(opt_chip) {
  if (this.isLocked_) {
    return;
  }

  var chip = null;
  if (opt_chip && opt_chip instanceof ext.Chip) {
    chip = /** @type {ext.Chip} */ (opt_chip);
  } else {
    var uid = goog.string.trim(typeof opt_chip == 'string' ?
        opt_chip : this.shadowInputElem_.value);
    chip = new ext.Chip(uid.replace(/,\s*$/, ''));
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
ext.ChipHolder.prototype.getSelectedUids = function() {
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
ext.ChipHolder.prototype.getProvidedPassphrases = function() {
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
 * @private
 */
ext.ChipHolder.prototype.refocus_ = function() {
  this.shadowInputElem_.focus();
};



/**
 * Handles keyboard events. Ignores them if ChipHolder is locked.
 * @param {goog.events.KeyEvent} evt The keyboard event to handle.
 * @private
 */
ext.ChipHolder.prototype.handleKeyEvent_ = function(evt) {
  if (this.isLocked_) {
    return;
  }

  switch (evt.keyCode) {
    case goog.events.KeyCodes.BACKSPACE:
      this.removeChipOnBackspace_();
      break;
    case goog.events.KeyCodes.TAB:
    case goog.events.KeyCodes.ENTER:
      if (this.shadowInputElem_.value.length > 0) {
        evt.preventDefault();
        evt.stopPropagation();
        this.refocus_();
      }

      var suggestion = this.autoComplete_.getSuggestion(0);
      var markChipBad = false;
      if (suggestion) {
        this.shadowInputElem_.value = suggestion;
      } else if (this.shadowInputElem_.value.length > 0) {
        markChipBad = true;
      }

      this.addAndMarkChip_(markChipBad);

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
ext.ChipHolder.prototype.addAndMarkChip_ = function(markChipBad) {
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
ext.ChipHolder.prototype.increaseInputArea_ = function() {
  goog.style.setWidth(
      this.shadowInputElem_,
      goog.style.getSize(this.shadowInputElem_).width + 10);
};


/** @override */
ext.ChipHolder.prototype.removeChild = function(child, opt_unrender) {
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
ext.ChipHolder.prototype.removeChipOnBackspace_ = function() {
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
ext.ChipHolder.prototype.lock = function() {
  this.isLocked_ = true;
  this.forEachChild(function(chip) {
    chip.lock();
  });
  goog.dom.classlist.add(this.shadowInputElem_, constants.CssClass.INVISIBLE);
};


/**
 * Returns true, if ChipHolder is locked and cannot be removed or changed.
 * @return {boolean} is ChipHolder locked
 */
ext.ChipHolder.prototype.isLocked = function() {
  return this.isLocked_;
};

}); // goog.scope
