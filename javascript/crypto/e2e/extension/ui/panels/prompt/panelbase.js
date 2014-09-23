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

goog.require('e2e.ext.constants');
goog.require('e2e.ext.ui.dialogs.Generic');
goog.require('e2e.ext.ui.dialogs.InputType');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.ui.Component');

goog.scope(function() {
var constants = e2e.ext.constants;
var dialogs = e2e.ext.ui.dialogs;
var messages = e2e.ext.messages;
var promptPanels = e2e.ext.ui.panels.prompt;



/**
 * Constructor for the base class for panels inside the prompt UI.
 * @param {string} title The title of the panel.
 * @param {!messages.BridgeMessageRequest} content The content that the user is
 *     working with.
 * @constructor
 * @extends {goog.ui.Component}
 */
promptPanels.PanelBase = function(title, content) {
  goog.base(this);

  this.title_ = goog.asserts.assertString(title);
  this.content_ = goog.asserts.assert(content);
};
goog.inherits(promptPanels.PanelBase, goog.ui.Component);


/** @override */
promptPanels.PanelBase.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var formText = this.getElement().querySelector('textarea');
  if (formText) {
    formText.textContent = this.getContent() ? this.getContent().selection : '';
  }
};


/** @return {string} The title of the panel. */
promptPanels.PanelBase.prototype.getTitle = function() {
  return this.title_;
};


/**
 * @return {!messages.BridgeMessageRequest} The content that the user is
 * working with.
 */
promptPanels.PanelBase.prototype.getContent = function() {
  return this.content_;
};


/**
 * Sets the content that the user is working with.
 * @param {!messages.BridgeMessageRequest} content The content that the user is
 *     working with.
 * @protected
 */
promptPanels.PanelBase.prototype.setContentInternal = function(content) {
  this.content_ = goog.asserts.assert(content);
};


/**
 * Renders the Dismiss button in the panel.
 * @protected
 */
promptPanels.PanelBase.prototype.renderDismiss = function() {
  var query = 'button';
  goog.array.forEach(this.getElement().querySelectorAll(query), function(btn) {
    goog.dom.classlist.add(btn, constants.CssClass.HIDDEN);
  });

  goog.dom.classlist.remove(
      this.getElementByClass(constants.CssClass.BACK),
      constants.CssClass.HIDDEN);

  var cancelBtn = this.getElementByClass(constants.CssClass.CANCEL);
  if (cancelBtn) {
    goog.dom.classlist.remove(cancelBtn, constants.CssClass.HIDDEN);
    cancelBtn.textContent = chrome.i18n.getMessage('promptDismissActionLabel');
  }
};


/**
 * Renders the provided dialog into the panel.
 * @param {!dialogs.Generic} dialog The dialog to render.
 * @protected
 */
promptPanels.PanelBase.prototype.renderDialog = function(dialog) {
  var popupElem = goog.dom.getElement(constants.ElementId.CALLBACK_DIALOG);
  this.addChild(dialog, false);
  dialog.render(popupElem);
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
  this.renderDialog(dialog);
};


}); // goog.scope
