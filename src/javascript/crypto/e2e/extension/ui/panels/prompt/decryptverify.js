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
 * @fileoverview Provides the decryption panel for the prompt UI.
 */

goog.provide('e2e.ext.ui.panels.prompt.DecryptVerify');

goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.ui.panels.prompt.PanelBase');
goog.require('e2e.ext.ui.templates.panels.prompt');
goog.require('goog.events.EventType');
goog.require('soy');


goog.scope(function() {
var constants = e2e.ext.constants;
var messages = e2e.ext.messages;
var promptPanels = e2e.ext.ui.panels.prompt;
var templates = e2e.ext.ui.templates.panels.prompt;



/**
 * Constructor for the decryption panel.
 * @param {!e2e.ext.actions.Executor} actionExecutor Executor for the
 *     End-to-End actions.
 * @param {!messages.BridgeMessageRequest} content The content that the user
 *     wants to decrypt.
 * @param {!function(Error)} errorCallback A callback where errors will be
 *     passed to.
 * @constructor
 * @extends {promptPanels.PanelBase}
 */
promptPanels.DecryptVerify = function(actionExecutor, content, errorCallback) {
  goog.base(this, chrome.i18n.getMessage('promptDecryptVerifyTitle'),
      content, errorCallback);

  this.actionExecutor_ = actionExecutor;
};
goog.inherits(promptPanels.DecryptVerify, promptPanels.PanelBase);


/** @override */
promptPanels.DecryptVerify.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);

  soy.renderElement(elem, templates.renderGenericForm, {
    textAreaPlaceholder: chrome.i18n.getMessage(
        'promptDecryptVerifyPlaceholder'),
    actionButtonTitle: chrome.i18n.getMessage('promptDecryptVerifyActionLabel'),
    cancelButtonTitle: chrome.i18n.getMessage('actionCancelPgpAction')
  });
};


/** @override */
promptPanels.DecryptVerify.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  this.getHandler().listen(
      this.getElementByClass(constants.CssClass.ACTION),
      goog.events.EventType.CLICK,
      goog.bind(this.decryptVerify_, this));
};


/**
 * Executes the DECRYPT_VERIFY action.
 * @private
 */
promptPanels.DecryptVerify.prototype.decryptVerify_ = function() {
  var textArea = /** @type {HTMLTextAreaElement} */
      (this.getElement().querySelector('textarea'));

  this.actionExecutor_.execute(/** @type {!messages.ApiRequest} */ ({
    action: constants.Actions.DECRYPT_VERIFY,
    content: textArea.value,
    passphraseCallback: goog.bind(this.renderPassphraseDialog, this)
  }), this, goog.bind(function(decrypted) {
    textArea.value = decrypted;
    this.renderDismiss();
  }, this));
};

});  // goog.scope
