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
 * @fileoverview Provides the UI that allows the user to interact with the
 * extension. Handles all main use cases: import key, encrypt/sign,
 * decrypt/verify.
 */

goog.provide('e2e.ext.ui.Prompt');

goog.require('e2e.ext.actions.Executor');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.constants.ElementId');
goog.require('e2e.ext.ui.dialogs.Generic');
goog.require('e2e.ext.ui.dialogs.InputType');
goog.require('e2e.ext.ui.draftmanager');
goog.require('e2e.ext.ui.panels.Chip');
goog.require('e2e.ext.ui.panels.ChipHolder');
goog.require('e2e.ext.ui.panels.prompt.DecryptVerify');
goog.require('e2e.ext.ui.panels.prompt.EncryptSign');
goog.require('e2e.ext.ui.preferences');
goog.require('e2e.ext.ui.templates.prompt');
goog.require('e2e.ext.utils');
goog.require('e2e.ext.utils.Error');
goog.require('e2e.ext.utils.action');
goog.require('e2e.ext.utils.text');
goog.require('e2e.openpgp.asciiArmor');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.events.EventType');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.string.format');
goog.require('goog.ui.Component');
goog.require('soy');

goog.scope(function() {
var constants = e2e.ext.constants;
var dialogs = e2e.ext.ui.dialogs;
var drafts = e2e.ext.ui.draftmanager;
var ext = e2e.ext;
var messages = e2e.ext.messages;
var panels = e2e.ext.ui.panels;
var preferences = e2e.ext.ui.preferences;
var templates = e2e.ext.ui.templates.prompt;
var ui = e2e.ext.ui;
var utils = e2e.ext.utils;



/**
 * Constructor for the UI prompt.
 * @constructor
 * @extends {goog.ui.Component}
 */
ui.Prompt = function() {
  goog.base(this);

  /**
   * Executor for the End-to-End actions.
   * @type {!e2e.ext.actions.Executor}
   * @private
   */
  this.actionExecutor_ = new e2e.ext.actions.Executor(
      goog.bind(this.displayFailure_, this));
};
goog.inherits(ui.Prompt, goog.ui.Component);


/**
 * The extension's launcher. Needed for providing the passphrase to the user's
 * private key.
 * @type {ext.Launcher}
 * @private
 */
ui.Prompt.prototype.pgpLauncher_ = null;


/** @override */
ui.Prompt.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  this.close();
};


/** @override */
ui.Prompt.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);

  soy.renderElement(elem, templates.main, {
    extName: chrome.i18n.getMessage('extName')
  });

  var styles = elem.querySelector('link');
  styles.href = chrome.extension.getURL('prompt_styles.css');

  utils.action.getExtensionLauncher(function(launcher) {
    this.pgpLauncher_ = launcher || this.pgpLauncher_;
  }, this.displayFailure_, this);
  utils.action.getSelectedContent(
      this.processSelectedContent_, this.displayFailure_, this);
};


/** @override */
ui.Prompt.prototype.getContentElement = function() {
  return goog.dom.getElement(constants.ElementId.BODY);
};


/**
 * Process the retrieved content blob and display it into the prompt UI.
 * @param {?messages.BridgeMessageRequest} contentBlob The content that the user
 *     has selected.
 * @param {constants.Actions=} opt_action Optional. The PGP action to perform.
 *     Defaults to user-specified.
 * @private
 */
ui.Prompt.prototype.processSelectedContent_ =
    function(contentBlob, opt_action) {
  this.clearFailure_();
  var action = opt_action || ext.constants.Actions.USER_SPECIFIED;
  var content = '';
  var origin = '';
  var recipients = [];
  var canInject = false;

  if (contentBlob) {
    if (contentBlob.request) {
      content = contentBlob.selection;
    }
    action = opt_action || contentBlob.action ||
        utils.text.getPgpAction(content, preferences.isActionSniffingEnabled());
    origin = contentBlob.origin;
    if (e2e.openpgp.asciiArmor.isDraft(content)) {
      action = constants.Actions.ENCRYPT_SIGN;
    }
    recipients = contentBlob.recipients || [];
    contentBlob.action = action;
    canInject = contentBlob.canInject;
  }

  if (!this.pgpLauncher_.hasPassphrase() &&
      action != ext.constants.Actions.GET_PASSPHRASE) {
    this.processSelectedContent_(
        contentBlob, ext.constants.Actions.GET_PASSPHRASE);
    return;
  }

  var elem = goog.dom.getElement(constants.ElementId.BODY);
  var title = goog.dom.getElement(constants.ElementId.TITLE);
  title.textContent = this.getTitle_(action) || title.textContent;
  switch (action) {
    case constants.Actions.ENCRYPT_SIGN:
      var encryptPanel = new panels.prompt.EncryptSign(
          this.actionExecutor_,
          /** @type {!messages.BridgeMessageRequest} */ (contentBlob || {}),
          goog.bind(this.displayFailure_, this));
      this.addChild(encryptPanel, false);
      encryptPanel.decorate(elem);
      title.textContent = encryptPanel.getTitle();
      break;
    case constants.Actions.DECRYPT_VERIFY:
      var decryptPanel = new panels.prompt.DecryptVerify(
          this.actionExecutor_,
          /** @type {!messages.BridgeMessageRequest} */ (contentBlob || {}),
          goog.bind(this.displayFailure_, this));
      this.addChild(decryptPanel, false);
      decryptPanel.decorate(elem);
      title.textContent = decryptPanel.getTitle();
      break;
    case constants.Actions.IMPORT_KEY:
      this.renderGenericForm_(
          elem, chrome.i18n.getMessage('promptImportKeyActionLabel'));
      break;
    case constants.Actions.GET_PASSPHRASE:
      this.renderKeyringPassphrase_(elem, contentBlob);
      break;
    case constants.Actions.USER_SPECIFIED:
      this.renderMenu_(elem, contentBlob);
      return;
    case constants.Actions.CONFIGURE_EXTENSION:
      chrome.tabs.create({
        url: 'settings.html',
        active: false
      }, goog.nullFunction);
      return;
    case constants.Actions.NO_OP:
      this.close();
      return;
  }

  var formText = elem.querySelector('textarea');
  if (formText) {
    formText.textContent = content;
  }

  this.getHandler().listen(
      elem, goog.events.EventType.CLICK,
      goog.bind(this.buttonClick_, this, action, origin, contentBlob));
};


/**
 * @param {constants.Actions} action
 * @param {string} origin
 * @param {messages.BridgeMessageRequest} contentBlob
 * @param {Event} event
 * @private
 */
ui.Prompt.prototype.buttonClick_ = function(
    action, origin, contentBlob, event) {
  var elem = goog.dom.getElement(constants.ElementId.BODY);
  var target = event.target;

  if (target instanceof HTMLImageElement) {
    target = target.parentElement;
  }

  if (target instanceof Element) {
    if (goog.dom.classlist.contains(target, constants.CssClass.CANCEL)) {
      this.close();
    } else if (
      goog.dom.classlist.contains(target, constants.CssClass.ACTION)) {
      this.executeAction_(action, elem, origin);
    } else if (
      goog.dom.classlist.contains(target, constants.CssClass.BACK)) {
      goog.disposeAll(this.removeChildren(false));
      this.processSelectedContent_(
          contentBlob, ext.constants.Actions.USER_SPECIFIED);
    }
  }
};


/**
 * Renders the main menu.
 * @param {Element} elem The element into which the UI elements are to be
 *     rendered.
 * @param {?messages.BridgeMessageRequest} contentBlob The content that the user
 *     has selected.
 * @private
 */
ui.Prompt.prototype.renderMenu_ = function(elem, contentBlob) {
  soy.renderElement(elem, templates.renderMenu, {
    possibleActions: [
      {
        value: constants.Actions.ENCRYPT_SIGN,
        title: chrome.i18n.getMessage('promptEncryptSignTitle')
      },
      {
        value: constants.Actions.DECRYPT_VERIFY,
        title: chrome.i18n.getMessage('promptDecryptVerifyTitle')
      },
      {
        value: constants.Actions.IMPORT_KEY,
        title: chrome.i18n.getMessage('promptImportKeyTitle')
      },
      {
        value: constants.Actions.CONFIGURE_EXTENSION,
        title: chrome.i18n.getMessage('actionConfigureExtension')
      }
    ]
  });

  this.getHandler().listen(
      elem.querySelector('ul'),
      goog.events.EventType.CLICK,
      goog.partial(this.selectAction_, contentBlob),
      true);
};


/**
 * Renders the UI elements needed for a PGP key import.
 * @param {Element} elem The element into which the UI elements are to be
 *     rendered.
 * @param {string} actionButtonTitle The title for the form's action button.
 * @param {string=} opt_textAreaPlaceholder The placeholder text that will be
 *     displayed in the form's textarea.
 * @private
 */
ui.Prompt.prototype.renderGenericForm_ =
    function(elem, actionButtonTitle, opt_textAreaPlaceholder) {
  soy.renderElement(elem, templates.renderGenericForm, {
    textAreaPlaceholder: opt_textAreaPlaceholder || '',
    actionButtonTitle: actionButtonTitle,
    cancelButtonTitle: chrome.i18n.getMessage('actionCancelPgpAction'),
    backButtonTitle: chrome.i18n.getMessage('actionBackToMenu')
  });
};


/**
 * Renders the UI elements needed for requesting the passphrase of the PGP
 * keyring.
 * @param {Element} elem The element into which the UI elements are to be
 *     rendered.
 * @param {?messages.BridgeMessageRequest} contentBlob The content that the user
 *     has selected.
 * @private
 */
ui.Prompt.prototype.renderKeyringPassphrase_ = function(elem, contentBlob) {
  var dialog = new dialogs.Generic(
      '',
      goog.bind(function(passphrase) {
        try {
          // Correct passphrase entered.
          this.pgpLauncher_.start(passphrase);
          if (contentBlob && contentBlob.action) {
            if (contentBlob.action == constants.Actions.GET_PASSPHRASE) {
              contentBlob.action = undefined; // Fall into the default action.
            }
            this.processSelectedContent_(contentBlob, contentBlob.action);
          } else {
            this.close();
          }
        } catch (e) { // Incorrect passphrase, so ask again.
          this.processSelectedContent_(contentBlob,
              ext.constants.Actions.GET_PASSPHRASE);
        }
        goog.dispose(dialog);
      }, this),
      // Use a password field to ask for the passphrase.
      dialogs.InputType.SECURE_TEXT,
      chrome.i18n.getMessage('actionEnterPassphraseDescription'),
      chrome.i18n.getMessage('actionEnterPassphrase'),
      chrome.i18n.getMessage('actionCancelPgpAction'));

  elem.textContent = '';
  this.addChild(dialog, false);
  dialog.render(elem);
  goog.dom.classlist.remove(elem, constants.CssClass.TRANSPARENT);
};


/**
 * Renders the UI elements needed for requesting the passphrase of an individual
 * PGP key.
 * @param {string} uid The UID of the PGP key.
 * @param {!function(string)} callback The callback to invoke when the
 *     passphrase has been provided.
 * @private
 */
ui.Prompt.prototype.renderPassphraseCallback_ = function(uid, callback) {
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


/**
 * Closes the prompt.
 */
ui.Prompt.prototype.close = function() {
  goog.dispose(this);

  // Clear all input and text area fields to ensure that no data accidentally
  // leaks to the user.
  goog.array.forEach(
      document.querySelectorAll('textarea,input'), function(elem) {
        elem.value = '';
      });

  window.close();
};


/**
 * Returns the i18n title for the given PGP action.
 * @param {constants.Actions} action The PGP action that the user has
 *     requested.
 * @return {string} The i18n title.
 * @private
 */
ui.Prompt.prototype.getTitle_ = function(action) {
  switch (action) {
    case ext.constants.Actions.IMPORT_KEY:
      return chrome.i18n.getMessage('promptImportKeyTitle');
    case ext.constants.Actions.USER_SPECIFIED:
      return chrome.i18n.getMessage('actionUserSpecified');
    case ext.constants.Actions.GET_PASSPHRASE:
      return chrome.i18n.getMessage('actionUnlockKeyring');
  }

  return '';
};


/**
 * Enables the user to select the PGP action they'd like to execute.
 * @param {?messages.BridgeMessageRequest} contentBlob The content that the user
 *     has selected.
 * @param {!goog.events.Event} clickEvt The event generated by the user's
 *     selection.
 * @private
 */
ui.Prompt.prototype.selectAction_ = function(contentBlob, clickEvt) {
  var selection = /** @type {HTMLElement} */ (clickEvt.target);
  this.processSelectedContent_(
      contentBlob,
      /** @type {constants.Actions} */ (selection.getAttribute('action')));
};


/**
 * Executes the PGP action and displays the result to the user.
 * @param {constants.Actions} action The PGP action that the user has
 *     requested.
 * @param {Element} elem The element with the textarea where the result of the
 *     action will be displayed.
 * @param {string} origin The web origin for which the PGP action is performed.
 * @private
 */
ui.Prompt.prototype.executeAction_ = function(action, elem, origin) {
  var textArea = elem.querySelector('textarea');
  this.clearFailure_();
  switch (action) {
    case ext.constants.Actions.IMPORT_KEY:
      this.actionExecutor_.execute(/** @type {!messages.ApiRequest} */ ({
        action: constants.Actions.IMPORT_KEY,
        content: textArea.value,
        passphraseCallback: goog.bind(this.renderPassphraseCallback_, this)
      }), this, goog.bind(function(res) {
        if (res.length > 0) {
          // Key import successful for at least one UID.
          utils.showNotification(
              chrome.i18n.getMessage(
                  'promptImportKeyNotificationLabel', res.toString()),
              goog.bind(this.close, this));
        } else {
          this.displayFailure_(new utils.Error(
              'Import key error', 'promptImportKeyError'));
        }
        this.surfaceDismissButton_();
      }, this));
      break;
  }
};


/**
 * Displays an error message to the user.
 * @param {Error} error The error to display.
 * @private
 */
ui.Prompt.prototype.displayFailure_ = function(error) {
  var errorDiv = goog.dom.getElement(constants.ElementId.ERROR_DIV);
  if (error) {
    var errorMsg = goog.isDef(error.messageId) ?
        chrome.i18n.getMessage(error.messageId) : error.message;
    utils.errorHandler(error);
    errorDiv.textContent = errorMsg;
  } else {
    errorDiv.textContent = '';
  }
};


/**
 * Clears the error message notfication area.
 * @private
 */
ui.Prompt.prototype.clearFailure_ = function() {
  this.displayFailure_(null);
};


/**
 * Surfaces the Dismiss button in the UI.
 * @private
 */
ui.Prompt.prototype.surfaceDismissButton_ = function() {
  goog.array.forEach(
      this.getElement().querySelectorAll('button.action,button.save'),
      function(button) {
        goog.dom.classlist.add(button, constants.CssClass.HIDDEN);
      });

  var cancelButton = this.getElementByClass(constants.CssClass.CANCEL);
  if (cancelButton) {
    cancelButton.textContent =
        chrome.i18n.getMessage('promptDismissActionLabel');
  }
};

}); // goog.scope

// Create the settings page.
if (Boolean(chrome.extension)) {
  /** @type {!e2e.ext.ui.Prompt} */
  window.promptPage = new e2e.ext.ui.Prompt();
  window.promptPage.decorate(document.documentElement);
}
