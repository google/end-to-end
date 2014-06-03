// Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Provides a minimized version of the keyring management UI.
 */

goog.provide('e2e.ext.ui.panels.KeyringMgmtMini');

goog.require('e2e.ext.constants');
goog.require('e2e.ext.ui.templates.panels.keyringmgmt');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('goog.ui.Component');
goog.require('soy');

goog.scope(function() {
var constants = e2e.ext.constants;
var panels = e2e.ext.ui.panels;
var templates = e2e.ext.ui.templates.panels.keyringmgmt;



/**
 * Constructor for the minimized version of the keyring management UI.
 * @param {!function()} exportCallback The callback to invoke when the keyring
 *     is to be exported.
 * @param {!function(File)} importCallback The callback to invoke when an
 *     existing keyring is to be imported.
 * @param {!function(string)} updatePassphraseCallback The callback to invoke
 *     when the passphrase to the keyring is to be updated.
 * @constructor
 * @extends {goog.ui.Component}
 */
panels.KeyringMgmtMini =
    function(exportCallback, importCallback, updatePassphraseCallback) {
  goog.base(this);

  /**
   * The callback to invoke when the keyring is to be exported.
   * @type {!function()}
   * @private
   */
  this.exportCallback_ = exportCallback;

  /**
   * The callback to invoke when an existing keyring is to be imported.
   * @type {!function(File)}
   * @private
   */
  this.importCallback_ = importCallback;

  /**
   * The callback to invoke when the passphrase to the keyring is to be updated.
   * @type {!function(string)}
   * @private
   */
  this.updatePassphraseCallback_ = updatePassphraseCallback;
};
goog.inherits(panels.KeyringMgmtMini, goog.ui.Component);


/** @override */
panels.KeyringMgmtMini.prototype.createDom = function() {
  goog.base(this, 'createDom');
  this.decorateInternal(this.getElement());
};


/** @override */
panels.KeyringMgmtMini.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);

  soy.renderElement(elem, templates.ManageKeyring, {
    importKeyringLabel: chrome.i18n.getMessage('keyMgmtImportKeyringLabel'),
    exportKeyringLabel: chrome.i18n.getMessage('keyMgmtExportKeyringLabel'),
    importActionButtonTitle:
        chrome.i18n.getMessage('keyMgmtImportKeyringActionLabel'),
    importCancelButtonTitle: chrome.i18n.getMessage('actionCancelPgpAction'),
    changePassphraseLabel:
        chrome.i18n.getMessage('keyMgmtChangePassphraseLabel'),
    changePassphrasePlaceholder:
        chrome.i18n.getMessage('keyMgmtChangePassphrasePlaceholder'),
    passphraseChangeActionButtonTitle:
        chrome.i18n.getMessage('keyMgmtChangePassphraseActionLabel'),
    passphraseChangeCancelButtonTitle:
        chrome.i18n.getMessage('actionCancelPgpAction'),
    confirmPassphrasePlaceholder:
        chrome.i18n.getMessage('keyMgmtChangePassphrasePlaceholder'),
    passphraseConfirmActionButtonTitle:
        chrome.i18n.getMessage('keyMgmtConfirmPassphraseActionLabel')
  });

  if (this.exportCallback_ == goog.nullFunction) {
    goog.dom.classes.add(
        this.getElementByClass(constants.CssClass.KEYRING_EXPORT),
        constants.CssClass.HIDDEN);
  }
};


/** @override */
panels.KeyringMgmtMini.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var importDiv = goog.dom.getElement(constants.ElementId.KEYRING_IMPORT_DIV);
  var passphraseChangeDiv = goog.dom.getElement(
      constants.ElementId.KEYRING_PASSPHRASE_CHANGE_DIV);
  var passphraseConfirmDiv = goog.dom.getElement(
      constants.ElementId.KEYRING_PASSPHRASE_CONFIRM_DIV);
  this.getHandler().
      listen(
          this.getElementByClass(constants.CssClass.KEYRING_IMPORT),
          goog.events.EventType.CLICK,
          goog.partial(
              this.showKeyringMgmtForm_,
              constants.ElementId.KEYRING_IMPORT_DIV)).
      listen(
          this.getElementByClass(constants.CssClass.KEYRING_EXPORT),
          goog.events.EventType.CLICK,
          this.exportCallback_).
      listen(
          this.getElementByClass(
              constants.CssClass.KEYRING_PASSPHRASE_CHANGE),
          goog.events.EventType.CLICK,
          goog.partial(
              this.showKeyringMgmtForm_,
              constants.ElementId.KEYRING_PASSPHRASE_CHANGE_DIV)).
      listen(
          goog.dom.getElementByClass(constants.CssClass.CANCEL, importDiv),
          goog.events.EventType.CLICK,
          goog.partial(
              this.showKeyringMgmtForm_,
              constants.ElementId.KEYRING_OPTIONS_DIV)).
      listen(
          goog.dom.getElementByClass(constants.CssClass.ACTION, importDiv),
          goog.events.EventType.CLICK,
          this.importKeyring_).
      listen(
          goog.dom.getElementByClass(
              constants.CssClass.CANCEL, passphraseChangeDiv),
          goog.events.EventType.CLICK,
          goog.partial(
              this.showKeyringMgmtForm_,
              constants.ElementId.KEYRING_OPTIONS_DIV)).
      listen(
          goog.dom.getElementByClass(
              constants.CssClass.ACTION, passphraseChangeDiv),
          goog.events.EventType.CLICK,
          this.confirmKeyringPassphrase_).
      listen(
          goog.dom.getElementByClass(
              constants.CssClass.ACTION, passphraseConfirmDiv),
          goog.events.EventType.CLICK,
          this.updateKeyringPassphrase_);

};


/**
 * Shows the selected keyring management form and hides all other such forms.
 * @param {string} formId The ID of the form to show.
 * @private
 */
panels.KeyringMgmtMini.prototype.showKeyringMgmtForm_ = function(formId) {
  goog.array.forEach(
      this.getElement().querySelectorAll('div[id]'), function(elem) {
        goog.dom.classes.add(elem, constants.CssClass.HIDDEN);
      });

  goog.dom.classes.remove(
      goog.dom.getElement(formId), constants.CssClass.HIDDEN);
};


/**
 * Handles requests from the user to import an existing keyring.
 * @private
 */
panels.KeyringMgmtMini.prototype.importKeyring_ = function() {
  var importDiv = goog.dom.getElement(constants.ElementId.KEYRING_IMPORT_DIV);
  var fileInput = importDiv.querySelector('input');

  if (fileInput.files.length > 0) {
    this.importCallback_(fileInput.files[0]);
  }
};


/**
 * Handles requests from the user to update the keyring's passphrase.
 * @private
 */
panels.KeyringMgmtMini.prototype.updateKeyringPassphrase_ = function() {
  var passphrases = goog.array.map(
      this.getElementsByClass(constants.CssClass.PASSPHRASE), function(elem) {
        return elem.value;
      });

  if (this.hasMatchingPassphrases_(passphrases)) {
    this.showKeyringMgmtForm_(constants.ElementId.KEYRING_OPTIONS_DIV);
    this.updatePassphraseCallback_(passphrases[0]);
  } else {
    window.alert(chrome.i18n.getMessage('keyMgmtPassphraseMismatchLabel'));
  }
};


/**
 * Returns true if the provided passphrases match.
 * @param {!Array.<string>} passphrases The passphrases to check.
 * @return {boolean} True if the provided passphrases match.
 * @private
 */
panels.KeyringMgmtMini.prototype.hasMatchingPassphrases_ =
    function(passphrases) {
  if (passphrases.length < 2) {
    return false;
  }

  var masterPassphrase = passphrases[0];
  return goog.array.every(passphrases, function(passphrase) {
    return masterPassphrase == passphrase;
  });
};


/**
 * Asks the user to confirm the new passphrase for the existing keyring.
 * @private
 */
panels.KeyringMgmtMini.prototype.confirmKeyringPassphrase_ = function() {
  this.showKeyringMgmtForm_(constants.ElementId.KEYRING_PASSPHRASE_CONFIRM_DIV);
};


/**
 * Updates the button to set the keyring's passphrase according to whether the
 * keyring is encrypted or not.
 * @param {boolean} encrypted True if the keyring is encrypted.
 */
panels.KeyringMgmtMini.prototype.setKeyringEncrypted = function(encrypted) {
  var button = this.getElementByClass(
      constants.CssClass.KEYRING_PASSPHRASE_CHANGE);
  button.textContent = encrypted ?
      chrome.i18n.getMessage('keyMgmtChangePassphraseLabel') :
      chrome.i18n.getMessage('keyMgmtAddPassphraseLabel');
};


/**
 * Resets the appearance of the panel.
 */
panels.KeyringMgmtMini.prototype.reset = function() {
  this.showKeyringMgmtForm_(constants.ElementId.KEYRING_OPTIONS_DIV);
};

}); // goog.scope
