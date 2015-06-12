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
 * @fileoverview Provides a minimized version of the keyring management UI.
 */

goog.provide('e2e.ext.ui.panels.KeyringMgmtMini');

goog.require('e2e.ext.actions.Executor');
goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.constants.ElementId');
goog.require('e2e.ext.ui.dialogs.BackupKey');
goog.require('e2e.ext.ui.dialogs.RestoreKey');
goog.require('e2e.ext.ui.templates.panels.keyringmgmt');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.object');
goog.require('goog.style');
goog.require('goog.ui.Component');
goog.require('goog.ui.KeyboardShortcutHandler');
goog.require('soy');

goog.scope(function() {
var constants = e2e.ext.constants;
var panels = e2e.ext.ui.panels;
var dialogs = e2e.ext.ui.dialogs;
var messages = e2e.ext.messages;
var templates = e2e.ext.ui.templates.panels.keyringmgmt;



/**
 * Constructor for the minimized version of the keyring management UI.
 * @param {!function()} exportCallback The callback to invoke when the keyring
 *     is to be exported.
 * @param {!function(!File)} importCallback The callback to invoke when an
 *     existing keyring is to be imported.
 * @param {!function(string)} updatePassphraseCallback The callback to invoke
 *     when the passphrase to the keyring is to be updated.
 * @param {!function(string)=} opt_restoreKeyringCallback The callback to invoke
 *     when the keyring is restored.
 * @constructor
 * @extends {goog.ui.Component}
 */
panels.KeyringMgmtMini =
    function(exportCallback, importCallback, updatePassphraseCallback,
    opt_restoreKeyringCallback) {
  goog.base(this);

  /**
   * The PGP context used by the extension.
   * @type {e2e.openpgp.Context}
   * @private
   */
  this.pgpContext_ = null;

  /**
   * The callback to invoke when the keyring is to be exported.
   * @type {!function()}
   * @private
   */
  this.exportCallback_ = exportCallback;

  /**
   * The callback to invoke when an existing keyring is to be imported.
   * @type {!function(!File)}
   * @private
   */
  this.importCallback_ = importCallback;

  /**
   * The callback to invoke when the passphrase to the keyring is to be updated.
   * @type {!function(string)}
   * @private
   */
  this.updatePassphraseCallback_ = updatePassphraseCallback;

  /**
   * The callback to invoke when the keyring is restored.
   * @type {!function(string)}
   * @private
   */
  this.restoreKeyringCallback_ = opt_restoreKeyringCallback ||
      goog.nullFunction;

  /**
   * Executor for the End-to-End actions.
   * @type {!e2e.ext.actions.Executor}
   * @private
   */
  this.actionExecutor_ = new e2e.ext.actions.Executor();
};
goog.inherits(panels.KeyringMgmtMini, goog.ui.Component);


/**
 * @define {boolean} Whether backup code UI is enabled
 */
panels.KeyringMgmtMini.ENABLE_BACKUP_CODE = true;


/** @override */
panels.KeyringMgmtMini.prototype.createDom = function() {
  goog.base(this, 'createDom');
  this.decorateInternal(this.getElement());
};


/** @override */
panels.KeyringMgmtMini.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);

  soy.renderElement(elem, templates.manageKeyring, {
    signupPromptLabel: chrome.i18n.getMessage('keyMgmtSignupPromptLabel'),
    importKeyringLabel: chrome.i18n.getMessage('keyMgmtImportKeyringLabel'),
    exportKeyringLabel: chrome.i18n.getMessage('keyMgmtExportKeyringLabel'),
    backupKeyringLabel: chrome.i18n.getMessage('keyMgmtBackupKeyringLabel'),
    restoreKeyringLabel: chrome.i18n.getMessage('keyMgmtRestoreKeyringLabel'),
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
        chrome.i18n.getMessage('keyMgmtConfirmPassphrasePlaceholder'),
    passphraseConfirmActionButtonTitle:
        chrome.i18n.getMessage('keyMgmtConfirmPassphraseActionLabel')
  });

  // for display on welcome page
  this.refreshOptions();

  if (!panels.KeyringMgmtMini.ENABLE_BACKUP_CODE) {
    goog.style.setElementShown(
        this.getElementByClass(constants.CssClass.KEYRING_BACKUP), false);
    goog.style.setElementShown(
        this.getElementByClass(constants.CssClass.KEYRING_RESTORE), false);
  }
};


/** @override */
panels.KeyringMgmtMini.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var signupPrompt = goog.dom.getElement(
      constants.ElementId.SIGNUP_PROMPT);
  var importDiv = goog.dom.getElement(constants.ElementId.KEYRING_IMPORT_DIV);
  var passphraseChangeDiv = goog.dom.getElement(
      constants.ElementId.KEYRING_PASSPHRASE_CHANGE_DIV);
  var passphraseConfirmDiv = goog.dom.getElement(
      constants.ElementId.KEYRING_PASSPHRASE_CONFIRM_DIV);

  this.getHandler().
      listen(
          this.getElementByClass(constants.CssClass.SIGNUP_PROMPT),
          goog.events.EventType.CLICK,
          goog.partial(
              this.showKeyringMgmtForm_,
              constants.ElementId.GENERATE_KEY_FORM)).
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
          this.getElementByClass(constants.CssClass.KEYRING_BACKUP),
          goog.events.EventType.CLICK,
          this.showBackupWindow_).
      listen(
          this.getElementByClass(constants.CssClass.KEYRING_RESTORE),
          goog.events.EventType.CLICK,
          this.showRestoreWindow_).
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
          goog.events.EventType.CHANGE,
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
          this.updateKeyringPassphrase_).
      listen(
          goog.dom.getElementByClass(
              constants.CssClass.CANCEL, passphraseConfirmDiv),
          goog.events.EventType.CLICK,
          goog.partial(
              this.showKeyringMgmtForm_,
              constants.ElementId.KEYRING_OPTIONS_DIV));

};


/**
 * Shows the selected keyring management form and hides all other such forms.
 * @param {string} formId The ID of the form to show.
 * @private
 */
panels.KeyringMgmtMini.prototype.showKeyringMgmtForm_ = function(formId) {
  goog.array.forEach(
      this.getElement().querySelectorAll('div[id]'), function(elem) {
        goog.dom.classlist.add(elem, constants.CssClass.HIDDEN);
      });

  goog.dom.classlist.remove(
      goog.dom.getElement(formId), constants.CssClass.HIDDEN);

  if (formId == constants.ElementId.GENERATE_KEY_FORM) {
    var signupForm = goog.dom.getElement(
        constants.ElementId.GENERATE_KEY_FORM);
    var signupPrompt = goog.dom.getElement(
        constants.ElementId.SIGNUP_PROMPT);
    var cancelButton = goog.dom.getElementByClass(
        constants.CssClass.HIDDEN, signupForm);
    var keyringOptions = goog.dom.getElement(
        constants.ElementId.KEYRING_OPTIONS_DIV);

    goog.dom.classlist.add(signupPrompt, constants.CssClass.HIDDEN);
    goog.dom.classlist.remove(cancelButton, constants.CssClass.HIDDEN);
    goog.dom.classlist.remove(keyringOptions, constants.CssClass.HIDDEN);
  }

  if (formId == constants.ElementId.KEYRING_PASSPHRASE_CHANGE_DIV ||
      formId == constants.ElementId.KEYRING_PASSPHRASE_CONFIRM_DIV) {
    var inputElem = goog.dom.getElement(formId).querySelector('input');
    inputElem.value = '';
    inputElem.focus();

    // Pressing Enter triggers the next step.
    var keyboardHandler = new goog.ui.KeyboardShortcutHandler(inputElem);
    keyboardHandler.registerShortcut('enter', goog.events.KeyCodes.ENTER);
    this.getHandler().listenOnce(
        keyboardHandler,
        goog.ui.KeyboardShortcutHandler.EventType.SHORTCUT_TRIGGERED,
        ((formId == constants.ElementId.KEYRING_PASSPHRASE_CHANGE_DIV) ?
            this.confirmKeyringPassphrase_ : this.updateKeyringPassphrase_));
  }
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
    // Show the form again to create listeners and clear the input.
    this.showKeyringMgmtForm_(
        constants.ElementId.KEYRING_PASSPHRASE_CONFIRM_DIV);
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
 * Shows the backup window.
 * @private
 */
panels.KeyringMgmtMini.prototype.showBackupWindow_ = function() {
  new dialogs.BackupKey().setVisible(true);
};


/**
 * Shows the restore window.
 * @private
 */
panels.KeyringMgmtMini.prototype.showRestoreWindow_ = function() {
  new dialogs.RestoreKey(goog.bind(function() {
    this.refreshOptions();
    this.restoreKeyringCallback_.apply(this, arguments);
  }, this)).setVisible(true);
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
  goog.dom.getElement(constants.ElementId.KEYRING_IMPORT_DIV)
      .querySelector('input').value = '';
  this.showKeyringMgmtForm_(constants.ElementId.KEYRING_OPTIONS_DIV);
};


/**
 * Refresh keyring backup/restore options.
 */
panels.KeyringMgmtMini.prototype.refreshOptions = function() {
  // Query for public keys.
  this.actionExecutor_.execute(/** @type {!messages.ApiRequest} */ ({
    action: constants.Actions.LIST_KEYS,
    content: 'public'
  }), this, goog.bind(function(publicKeys) {
    // Query for private keys.
    var hasPublicKeys = !goog.object.isEmpty(publicKeys);
    this.actionExecutor_.execute(/** @type {!messages.ApiRequest} */ ({
      action: constants.Actions.LIST_KEYS,
      content: 'private'
    }), this, goog.bind(function(privateKeys) {
      var hasPrivateKeys = !goog.object.isEmpty(privateKeys);
      this.actionExecutor_.execute(/** @type {!messages.ApiRequest} */ ({
        action: constants.Actions.GET_KEYRING_BACKUP_DATA
      }), this, goog.bind(/** @param {e2e.openpgp.KeyringBackupInfo} data */ (
          function(data) {
            var hasBackupData = Boolean(data) && Boolean(data.seed);
            /**
             * Hides an element if a condition is met, shows it otherwise.
             * @param  {Element} element
             * @param  {boolean} condition
             */
            function showElementOnlyIf(element, condition) {
              goog.dom.classlist.enable(
                  element,
                  e2e.ext.constants.CssClass.HIDDEN,
                  !condition);
            }
            // Show keyring backup only if we have a way to backup data.
            showElementOnlyIf(
                this.getElementByClass(constants.CssClass.KEYRING_BACKUP),
                hasBackupData && hasPrivateKeys);
            // Allow export only if keys are present.
            showElementOnlyIf(
                this.getElementByClass(constants.CssClass.KEYRING_EXPORT),
                (this.exportCallback_ !== goog.nullFunction) &&
                (hasPrivateKeys || hasPublicKeys)
            );
          }), this));
    }, this), goog.nullFunction); // Disable errorCallback for private keys .
  }, this));

};

});  // goog.scope
