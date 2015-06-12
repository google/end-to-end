/**
 * @license
 * Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Renders the welcome page of the extension.
 */

goog.provide('e2e.ext.ui.Welcome');

goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.ext.actions.Executor');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.constants.ElementId');
goog.require('e2e.ext.ui.dialogs.Generic');
goog.require('e2e.ext.ui.dialogs.InputType');
goog.require('e2e.ext.ui.panels.GenerateKey');
goog.require('e2e.ext.ui.panels.KeyringMgmtMini');
goog.require('e2e.ext.ui.templates.welcome');
goog.require('e2e.ext.utils');
goog.require('e2e.ext.utils.action');
goog.require('e2e.signer.Algorithm');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events.EventType');
goog.require('goog.object');
goog.require('goog.ui.Component');
goog.require('soy');

goog.scope(function() {
var ui = e2e.ext.ui;
var constants = e2e.ext.constants;
var dialogs = e2e.ext.ui.dialogs;
var messages = e2e.ext.messages;
var templates = ui.templates.welcome;
var utils = e2e.ext.utils;



/**
 * Constructor for the welcome page.
 * @constructor
 * @extends {goog.ui.Component}
 */
ui.Welcome = function() {
  goog.base(this);

  /**
   * Executor for the End-to-End actions.
   * @type {!e2e.ext.actions.Executor}
   * @private
   */
  this.actionExecutor_ = new e2e.ext.actions.Executor(
      goog.bind(this.displayFailure_, this));
};
goog.inherits(ui.Welcome, goog.ui.Component);


/**
 * The form where novice users can add their email address to get set up.
 * @type {ui.panels.GenerateKey}
 * @private
 */
ui.Welcome.prototype.genKeyForm_ = null;


/**
 * A component to let the user set up the extension's keyring.
 * @type {ui.panels.KeyringMgmtMini}
 * @private
 */
ui.Welcome.prototype.keyringMgmt_ = null;


/** @override */
ui.Welcome.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);

  var basicsSection = {
    title: chrome.i18n.getMessage('welcomeBasicsTitle'),
    subsections: [
      {text: chrome.i18n.getMessage('welcomeBasicsLine1')},
      {
        text: chrome.i18n.getMessage('welcomeBasicsLine2'),
        header: true
      },
      {iframe: {
        src: chrome.i18n.getMessage('welcomeIframeUrl'),
        height: '400',
        width: '100%'
      }},
      {
        text: chrome.i18n.getMessage('welcomeBasicsLine3')
      }
    ]
  };

  var noviceSection = {
    title: chrome.i18n.getMessage('welcomeNoviceTitle'),
    subsections: []
  };

  var advancedSection = {
    title: chrome.i18n.getMessage('welcomeAdvancedTitle'),
    subsections: []
  };

  soy.renderElement(elem, templates.welcome, {
    headerText: chrome.i18n.getMessage('welcomeHeader'),
    basicsSection: basicsSection,
    noviceSection: noviceSection,
    advancedSection: advancedSection,
    preferenceLabel: chrome.i18n.getMessage('preferenceWelcomeScreen'),
    actionButtonTitle: chrome.i18n.getMessage('welcomeAcceptanceButton')
  });

  var styles = elem.querySelector('link');
  styles.href = chrome.runtime.getURL('welcome_styles.css');

  this.actionExecutor_.execute(/** @type {!messages.ApiRequest} */ ({
    action: constants.Actions.LIST_KEYS,
    content: 'private'
  }), this, goog.bind(function(keys) {
    if (!goog.object.isEmpty(keys)) {
      this.hideKeyringSetup_();
    } else {
      this.genKeyForm_ = new ui.panels.GenerateKey(
          goog.bind(this.generateKey_, this), true);
      this.addChild(this.genKeyForm_, false);
      this.genKeyForm_.render(
          goog.dom.getElement(constants.ElementId.WELCOME_CONTENT_NOVICE));

      // TODO: Add callback for keyring restore.
      this.keyringMgmt_ = new ui.panels.KeyringMgmtMini(
          goog.nullFunction,
          goog.bind(this.importKeyring_, this),
          goog.bind(this.updateKeyringPassphrase_, this));
      this.addChild(this.keyringMgmt_, false);
      this.keyringMgmt_.render(
          goog.dom.getElement(constants.ElementId.WELCOME_CONTENT_ADVANCED));
    }
  }, this), goog.nullFunction);
};


/** @override */
ui.Welcome.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var footer = goog.dom.getElement(constants.ElementId.WELCOME_FOOTER);
  this.getHandler().listen(
      goog.dom.getElementByClass(constants.CssClass.ACTION, footer),
      goog.events.EventType.CLICK, this.closeAndDisableWelcomeScreen_);
};


/**
 * Closes and disables the welcome page.
 * @private
 */
ui.Welcome.prototype.closeAndDisableWelcomeScreen_ = function() {
  var checkbox = this.getElement().querySelector('input');
  e2e.ext.utils.action.getPreferences(function(preferences) {
    preferences.setWelcomePageEnabled(checkbox.checked);
    window.close();
  }, function() {
    window.close();
  });
};


/**
 * Generates a new PGP key using the information that is provided by the user.
 * @param {ui.panels.GenerateKey} panel The panel where the user has provided
 *     the information for the new key.
 * @param {string} name The name to use.
 * @param {string} email The email to use.
 * @param {string} comments The comments to use.
 * @param {number} expDate The expiration date to use.
 * @private
 */
ui.Welcome.prototype.generateKey_ =
    function(panel, name, email, comments, expDate) {
  var welcomePage = this;
  var anchorElem = this.genKeyForm_;
  var defaults = constants.KEY_DEFAULTS;
  utils.action.getContext(
      function(/** !e2e.openpgp.ContextImpl */ pgpCtx) {
        pgpCtx.isKeyRingEncrypted().addCallback(function(isEncrypted) {
          if (isEncrypted) {
            window.alert(chrome.i18n.getMessage('settingsKeyringLockedError'));
          }

          pgpCtx.generateKey(e2e.signer.Algorithm[defaults.keyAlgo],
              defaults.keyLength, e2e.cipher.Algorithm[defaults.subkeyAlgo],
              defaults.subkeyLength, name, comments, email, expDate).
              addCallback(function(key) {
                var dialog = new dialogs.Generic(
                    chrome.i18n.getMessage('welcomeGenKeyConfirm'),
                    this.hideKeyringSetup_,
                    dialogs.InputType.NONE);
                this.removeChild(this.genKeyForm_, false);
                this.addChild(dialog, false);
                dialog.decorate(this.genKeyForm_.getElement());
                panel.reset();
              }, this);
        }, this);
      }, this.displayFailure_, this);

  this.keyringMgmt_.refreshOptions();
};


/**
 * Imports a keyring from a file and appends it to the current keyring.
 * @param {!File} file The file to import.
 * @private
 */
ui.Welcome.prototype.importKeyring_ = function(file) {
  utils.readFile(file, goog.bind(function(contents) {
    this.actionExecutor_.execute(/** @type {!messages.ApiRequest} */ ({
      action: constants.Actions.IMPORT_KEY,
      content: contents,
      passphraseCallback: goog.bind(this.renderPassphraseCallback_, this)
    }), this, goog.bind(function(res) {
      var dialog = new dialogs.Generic(
          chrome.i18n.getMessage('welcomeKeyImport'),
          this.hideKeyringSetup_,
          dialogs.InputType.NONE);
      this.removeChild(this.keyringMgmt_, false);
      this.addChild(dialog, false);
      dialog.decorate(this.keyringMgmt_.getElement());
    }, this));
  }, this));
};


/**
 * Updates the passphrase to the existing keyring.
 * @param {string} passphrase The new passphrase to apply.
 * @private
 */
ui.Welcome.prototype.updateKeyringPassphrase_ = function(passphrase) {
  utils.action.getContext(
      function(/** !e2e.openpgp.ContextImpl */ pgpCtx) {
        pgpCtx.changeKeyRingPassphrase(passphrase).addCallback(function() {
          var dialog = new dialogs.Generic(
              chrome.i18n.getMessage('keyMgmtChangePassphraseSuccessMsg'),
              goog.bind(function() {
                this.removeChild(dialog, false);
                this.keyringMgmt_ = new ui.panels.KeyringMgmtMini(
                    goog.nullFunction,
                    goog.bind(this.importKeyring_, this),
                    goog.bind(this.updateKeyringPassphrase_, this));
                this.addChild(this.keyringMgmt_, false);
                pgpCtx.isKeyRingEncrypted().addCallback(function(isEncrypted) {
                  this.keyringMgmt_.decorate(dialog.getElement());
                  this.keyringMgmt_.setKeyringEncrypted(isEncrypted);
                }, this);
              }, this),
              dialogs.InputType.NONE);
          this.removeChild(this.keyringMgmt_, false);
          this.addChild(dialog, false);
          dialog.decorate(this.keyringMgmt_.getElement());
        }, this);
      }, this.displayFailure_, this);
};


/**
 * Renders the UI elements needed for requesting the passphrase of an individual
 * PGP key.
 * @param {string} uid The UID of the PGP key.
 * @return {!e2e.async.Result<string>} A promise resolved with the user-provided
 *     passphrase.
 * @private
 */
ui.Welcome.prototype.renderPassphraseCallback_ = function(uid) {
  var result = new e2e.async.Result();
  var popupElem = goog.dom.getElement(constants.ElementId.CALLBACK_DIALOG);
  var dialog = new dialogs.Generic(chrome.i18n.getMessage(
      'promptPassphraseCallbackMessage', uid),
      function(passphrase) {
        goog.dispose(dialog);
        result.callback(/** @type {string} */ (passphrase));
      },
      // Use a password field to ask for the passphrase.
      dialogs.InputType.SECURE_TEXT,
      '',
      chrome.i18n.getMessage('actionEnterPassphrase'),
      chrome.i18n.getMessage('actionCancelPgpAction'));

  this.addChild(dialog, false);
  dialog.render(popupElem);
  return result;
};


/**
 * Hides the UI for setting up the keyring.
 * @private
 */
ui.Welcome.prototype.hideKeyringSetup_ = function() {
  var elements = [
    goog.dom.getElement(constants.ElementId.WELCOME_MENU_NOVICE),
    goog.dom.getElement(constants.ElementId.WELCOME_MENU_ADVANCED)
  ];

  goog.array.forEach(elements, function(elem) {
    elem.parentElement.removeChild(elem);
  });
};


/**
 * Displays an error message to the user.
 * @param {Error} error The error to display.
 * @private
 */
ui.Welcome.prototype.displayFailure_ = function(error) {
  var errorMsg = goog.isDef(error.messageId) ?
      chrome.i18n.getMessage(error.messageId) : error.message;
  utils.errorHandler(error);
  window.alert(errorMsg);
};

});  // goog.scope
