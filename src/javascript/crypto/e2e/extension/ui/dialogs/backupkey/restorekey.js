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
 * @fileoverview Provides the keyring backup UI.
 */

goog.provide('e2e.ext.ui.dialogs.RestoreKey');

goog.require('e2e.ext.actions.Executor');
goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.ui.dialogs.Overlay');
goog.require('e2e.ext.ui.templates.dialogs.backupkey');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events.EventType');
goog.require('goog.soy');
goog.require('goog.style');

goog.scope(function() {
var constants = e2e.ext.constants;
var dialogs = e2e.ext.ui.dialogs;
var messages = e2e.ext.messages;
var templates = e2e.ext.ui.templates.dialogs.backupkey;


/**
 * Constructor for the restore key window.
 */
dialogs.RestoreKey = class extends dialogs.Overlay {
  /**
   * @param {function(string)=} opt_callback The callback function on restore.
   */
  constructor(opt_callback) {
    super();
    this.callback_ = opt_callback || goog.nullFunction;
  }

  /** @override */
  createDom() {
    super.createDom();
    this.decorateInternal(this.getElement());
  }

  /** @override */
  decorateInternal(elem) {
    super.decorateInternal(elem);
    this.setTitle(chrome.i18n.getMessage('keyMgmtRestoreKeyringLabel'));
    goog.soy.renderElement(this.getContentElement(), templates.restoreKey, {
      emailLabel: chrome.i18n.getMessage('keyMgmtRestoreKeyringEmailLabel'),
      backupCodeLabel:
          chrome.i18n.getMessage('keyMgmtRestoreKeyringBackupCodeLabel')
    });

    goog.style.setElementShown(
        goog.dom.getElementByClass('modal-dialog-title-close', elem), true);
  }

  /** @override */
  enterDocument() {
    super.enterDocument();
    this.getHandler().listen(
        this.getButtonElement().querySelector('[name=ok]'),
        goog.events.EventType.CLICK, this.executeRestore_);
  }

  /**
   * Parses the user input into a base64 encoded string.
   * @private
   * @return {string} The base 64 encoded backup code.
   */
  getInputValue_() {
    var inputs = goog.array.toArray(
        goog.dom.getElementsByClass('keyring-restore-input'));
    return inputs.reduce(function(a, e) {
      return a + e.value;
    }, '');
  }

  /**
   * Gets the contents of the email field.
   * @private
   * @return {string} The email supplied by the user.
   */
  getEmailInput_() {
    return this.getElementByClass(constants.CssClass.KEYRING_RESTORE_EMAIL)
        .value;
  }

  /**
   * Executes the action for restoring keyring data
   * @private
   * @param {goog.events.BrowserEvent} event The event object.
   * @return {boolean}
   */
  executeRestore_(event) {
    /* TODO(rcc): Remove email when we can use keyserver for lookups */
    var email = this.getEmailInput_();
    new e2e.ext.actions.Executor().execute(
        /** @type {!messages.ApiRequest} */ ({
          action: constants.Actions.RESTORE_KEYRING_DATA,
          content: {data: this.getInputValue_(), email: email}
        }),
        this, goog.bind(function() {
          this.getContentElement().querySelector('span').textContent = '\u00a0';
          this.callback_.apply(this, arguments);
          this.setVisible(false);
        }, this), goog.bind(function(err) {
          this.getContentElement().querySelector('span').textContent =
              err.message;
        }, this));
    event.stopPropagation();
    return false;
  }
};


});  // goog.scope
