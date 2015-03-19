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
 * @fileoverview Provides the base class for panels inside the prompt UI.
 */

goog.provide('e2e.ext.ui.panels.prompt.PanelBase');

goog.require('e2e.async.Result');
goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.constants.ElementId');
goog.require('e2e.ext.ui.dialogs.Generic');
goog.require('e2e.ext.ui.dialogs.InputType');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.events.EventType');
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
 * @param {function(Error)=} opt_errorCallback A callback where errors will be
 *     passed to.
 * @constructor
 * @extends {goog.ui.Component}
 */
promptPanels.PanelBase = function(title, content, opt_errorCallback) {
  goog.base(this);

  this.title_ = goog.asserts.assertString(title);
  this.content_ = goog.asserts.assert(content);
  this.errorCallback_ = opt_errorCallback || goog.nullFunction;
};
goog.inherits(promptPanels.PanelBase, goog.ui.Component);


/** @override */
promptPanels.PanelBase.prototype.createDom = function() {
  goog.base(this, 'createDom');
  this.decorateInternal(this.getElement());
};


/** @override */
promptPanels.PanelBase.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var formText = this.getElement().querySelector('textarea');
  if (formText) {
    formText.textContent = this.getContent() ? this.getContent().selection : '';
    this.getHandler().listen(
        formText, goog.events.EventType.CHANGE, this.updateContentSelection_);
  }

  this.getHandler().listen(
      this.getElement(),
      goog.events.EventType.CLICK,
      this.clearPriorFailures_, true);

};


/**
 * Clears the errors that have been previously displayed in the UI.
 * @param {Event} evt The event that was triggered to clear the prior failures
 *     from the UI.
 * @private
 */
promptPanels.PanelBase.prototype.clearPriorFailures_ = function(evt) {
  if (evt.target instanceof HTMLButtonElement) {
    this.errorCallback_(null);
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
 * Updates the content that the user is working with using the input text that
 * the user is providing.
 * @param {Event} evt The event triggering the update.
 * @private
 */
promptPanels.PanelBase.prototype.updateContentSelection_ = function(evt) {
  var formText = /** @type {HTMLTextAreaElement} */ (evt.target);
  this.content_.selection = formText.value;
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
 * @return {!e2e.async.Result<string>} A promise resolved with the user-provided
 *     passphrase.
 * @protected
 */
promptPanels.PanelBase.prototype.renderPassphraseDialog =
    function(uid) {
  var result = new e2e.async.Result();
  var dialog = new dialogs.Generic(chrome.i18n.getMessage(
      'promptPassphraseCallbackMessage', uid),
      function(passphrase) {
        goog.dispose(dialog);
        result.callback(/** @type {string} */ (passphrase));
      },
      dialogs.InputType.SECURE_TEXT,
      '',
      chrome.i18n.getMessage('actionEnterPassphrase'),
      chrome.i18n.getMessage('actionCancelPgpAction'));
  this.renderDialog(dialog);
  return result;
};


});  // goog.scope
