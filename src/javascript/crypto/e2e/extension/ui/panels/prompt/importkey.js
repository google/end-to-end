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

goog.provide('e2e.ext.ui.panels.prompt.ImportKey');

goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.ui.panels.prompt.PanelBase');
goog.require('e2e.ext.ui.templates.panels.prompt');
goog.require('e2e.ext.utils');
goog.require('e2e.ext.utils.Error');
goog.require('goog.events.EventType');
goog.require('goog.soy');


goog.scope(function() {
var constants = e2e.ext.constants;
var messages = e2e.ext.messages;
var promptPanels = e2e.ext.ui.panels.prompt;
var templates = e2e.ext.ui.templates.panels.prompt;


/**
 * Constructor for the decryption panel.
 */
promptPanels.ImportKey = class extends promptPanels.PanelBase {
  /**
   * @param {!e2e.ext.actions.Executor} actionExecutor Executor for the
   *     End-to-End actions.
   * @param {!messages.BridgeMessageRequest} content The content that the user
   *     wants to decrypt.
   * @param {!function(Error)} errorCallback A callback where errors will be
   *     passed to.
   */
  constructor(actionExecutor, content, errorCallback) {
    super(
        chrome.i18n.getMessage('promptImportKeyTitle'), content, errorCallback);

    this.actionExecutor_ = actionExecutor;
    this.errorCallback_ = errorCallback;
  }

  /** @override */
  decorateInternal(elem) {
    super.decorateInternal(elem);

    goog.soy.renderElement(elem, templates.renderGenericForm, {
      textAreaPlaceholder: '',
      actionButtonTitle: chrome.i18n.getMessage('promptImportKeyActionLabel'),
      cancelButtonTitle: chrome.i18n.getMessage('actionCancelPgpAction')
    });
  }

  /** @override */
  enterDocument() {
    super.enterDocument();

    this.getHandler().listen(
        this.getElementByClass(constants.CssClass.ACTION),
        goog.events.EventType.CLICK, this.importKey_);
  }

  /**
   * Executes the IMPORT_KEY action.
   * @private
   */
  importKey_() {
    var textArea = /** @type {HTMLTextAreaElement} */
        (this.getElement().querySelector('textarea'));

    this.actionExecutor_.execute(
        /** @type {!messages.ApiRequest} */ ({
          action: constants.Actions.IMPORT_KEY,
          content: textArea.value,
          passphraseCallback: goog.bind(this.renderPassphraseDialog, this)
        }),
        this, goog.bind(function(res) {
          if (res.length > 0) {
            // Key import successful for at least one UID.
            e2e.ext.utils.showNotification(
                chrome.i18n.getMessage(
                    'promptImportKeyNotificationLabel', res.toString()),
                goog.bind(function() {
                  goog.dispose(this.getParent());
                }, this));
          } else {
            this.errorCallback_(new e2e.ext.utils.Error(
                'Import key error', 'promptImportKeyError'));
          }
          this.renderDismiss();
        }, this));
  }
};


});  // goog.scope
