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
 * @fileoverview Provides the base class for panels inside the prompt UI.
 */

goog.provide('e2e.ext.ui.panels.prompt.PanelBase');

goog.require('e2e.ext.ui.dialogs.Generic');
goog.require('e2e.ext.ui.dialogs.InputType');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.ui.Component');

goog.scope(function() {
var constants = e2e.ext.constants;
var dialogs = e2e.ext.ui.dialogs;
var promptPanels = e2e.ext.ui.panels.prompt;



/**
 * Constructor for the base class for panels inside the prompt UI.
 * @param {string} title The title of the panel.
 * @constructor
 * @extends {goog.ui.Component}
 */
promptPanels.PanelBase = function(title) {
  goog.base(this);

  this.title_ = goog.asserts.assertString(title);
};
goog.inherits(promptPanels.PanelBase, goog.ui.Component);


/** @return {string} The title of the panel. */
promptPanels.PanelBase.prototype.getTitle = function() {
  return this.title_;
};


/**
 * Renders the Dismiss button in the panel.
 * @protected
 */
promptPanels.PanelBase.prototype.renderDismiss = function() {
  var query = 'button.action,button.save';
  goog.array.forEach(this.getElement().querySelectorAll(query), function(btn) {
    goog.dom.classlist.add(btn, constants.CssClass.HIDDEN);
  });

  var cancelBtn = this.getElementByClass(constants.CssClass.CANCEL);
  if (cancelBtn) {
    cancelBtn.textContent = chrome.i18n.getMessage('promptDismissActionLabel');
  }
};


/**
 * Renders the UI elements needed for requesting the passphrase of an individual
 * PGP key.
 * @param {string} uid The UID of the PGP key.
 * @param {!function(string)} callback The callback to invoke when the
 *     passphrase has been provided.
 * @protected
 */
promptPanels.PanelBase.prototype.renderPassphraseDialog =
    function(uid, callback) {
  var popupElem = goog.dom.getElement(constants.ElementId.CALLBACK_DIALOG);
  var dialog = new dialogs.Generic(chrome.i18n.getMessage(
          'promptPassphraseCallbackMessage', uid),
      function(passphrase) {
        goog.dispose(dialog);
        callback(/** @type {string} */ (passphrase));
      },
      dialogs.InputType.SECURE_TEXT,
      '',
      chrome.i18n.getMessage('actionEnterPassphrase'),
      chrome.i18n.getMessage('actionCancelPgpAction'));

  this.addChild(dialog, false);
  dialog.render(popupElem);
};


}); // goog.scope
