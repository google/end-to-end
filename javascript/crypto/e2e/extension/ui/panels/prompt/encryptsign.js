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
 * @fileoverview Provides the encryption panel for the prompt UI.
 */

goog.provide('e2e.ext.ui.panels.prompt.EncryptSign');

goog.require('e2e.ext.actions.Executor');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.ui.dialogs.Generic');
goog.require('e2e.ext.ui.dialogs.InputType');
goog.require('e2e.ext.ui.draftmanager');
goog.require('e2e.ext.ui.panels.Chip');
goog.require('e2e.ext.ui.panels.ChipHolder');
goog.require('e2e.ext.ui.panels.prompt.PanelBase');
goog.require('e2e.ext.ui.preferences');
goog.require('e2e.ext.ui.templates.panels.prompt');
goog.require('e2e.ext.utils.action');
goog.require('e2e.ext.utils.text');
goog.require('goog.Timer');
goog.require('soy');


goog.scope(function() {
var constants = e2e.ext.constants;
var dialogs = e2e.ext.ui.dialogs;
var drafts = e2e.ext.ui.draftmanager;
var messages = e2e.ext.messages;
var panels = e2e.ext.ui.panels;
var promptPanels = e2e.ext.ui.panels.prompt;
var preferences = e2e.ext.ui.preferences;
var templates = e2e.ext.ui.templates.panels.prompt;
var utils = e2e.ext.utils;



/**
 * Constructor for the encryption panel.
 * @param {!e2e.ext.actions.Executor} actionExecutor Executor for the
 *     End-to-End actions.
 * @param {!messages.BridgeMessageRequest} content The content that the user
 *     wants to encrypt.
 * @param {!function(Error)} errorCallback A callback where errors will be
 *     passed to.
 * @constructor
 * @extends {promptPanels.PanelBase}
 */
promptPanels.EncryptSign = function(actionExecutor, content, errorCallback) {
  goog.base(this, chrome.i18n.getMessage('promptEncryptSignTitle'),
      content, errorCallback);

  this.actionExecutor_ = actionExecutor;
  this.errorCallback_ = errorCallback;

  /**
   * A timer to automatically save drafts.
   * TODO(radi): Optimize the frequency of which auto-save triggers as it will
   * cause additional CPU (and possibly network) utilization.
   * @type {!goog.Timer}
   * @private
   */
  this.autoSaveTimer_ = new goog.Timer(constants.AUTOSAVE_INTERVAL);
  this.registerDisposable(this.autoSaveTimer_);

  /**
   * A holder for the intended recipients of a PGP message.
   * @type {panels.ChipHolder}
   * @private
   */
  this.chipHolder_ = null;
};
goog.inherits(promptPanels.EncryptSign, promptPanels.PanelBase);


/** @override */
promptPanels.EncryptSign.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);

  var origin = this.getContent().origin;
  var signInsertLabel = /^https:\/\/mail\.google\.com$/.test(origin) ?
      chrome.i18n.getMessage('promptEncryptSignInsertIntoGmailLabel') :
      chrome.i18n.getMessage('promptEncryptSignInsertLabel');

  soy.renderElement(elem, templates.renderEncrypt, {
    insertCheckboxEnabled: this.getContent().canInject,
    signerCheckboxTitle: chrome.i18n.getMessage('promptSignMessageAs'),
    fromLabel: chrome.i18n.getMessage('promptFromLabel'),
    passphraseEncryptionLinkTitle: chrome.i18n.getMessage(
        'promptEncryptionPassphraseLink'),
    actionButtonTitle: chrome.i18n.getMessage(
        'promptEncryptSignActionLabel'),
    cancelButtonTitle: chrome.i18n.getMessage('actionCancelPgpAction'),
    saveDraftButtonTitle: chrome.i18n.getMessage(
        'promptEncryptSignSaveDraftLabel'),
    insertButtonTitle: signInsertLabel
  });
};


/** @override */
promptPanels.EncryptSign.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var origin = this.getContent().origin;

  // Populate the UI with the available encryption keys.
  this.renderEncryptionKeys_();

  // Populate the UI with the available signing keys.
  this.renderSigningKeys_();

  // Load saved draft. If not, load selected content.
  this.loadSavedDraftOrSelectedContent_();

  this.getHandler().listen(
      this.autoSaveTimer_, goog.Timer.TICK,
      goog.partial(this.saveDraft_, origin));

  this.getHandler().listen(
      goog.dom.getElement(constants.ElementId.PASSPHRASE_ENCRYPTION_LINK),
      goog.events.EventType.CLICK, this.renderEncryptionPassphraseDialog_);

  this.getHandler().listen(
      this.getElementByClass(constants.CssClass.ACTION),
      goog.events.EventType.CLICK,
      goog.bind(this.encryptSign_, this));

  if (this.getContent().canInject) {
    this.getHandler().listen(
        this.getElementByClass(constants.CssClass.SAVE),
        goog.events.EventType.CLICK, goog.partial(this.saveDraft_, origin));

    this.getHandler().listen(
        this.getElementByClass(constants.CssClass.INSERT),
        goog.events.EventType.CLICK,
        goog.partial(this.insertMessageIntoPage_, origin));
  }

  if (preferences.isAutoSaveEnabled()) {
    var textArea = /** @type {HTMLTextAreaElement} */
        (this.getElement().querySelector('textarea'));
    this.getHandler().listenOnce(textArea, goog.events.EventType.KEYDOWN,
        goog.bind(this.autoSaveTimer_.start, this.autoSaveTimer_));
  }
};


/**
 * Renders the available encryption keys in the UI.
 * @private
 */
promptPanels.EncryptSign.prototype.renderEncryptionKeys_ = function() {
  this.actionExecutor_.execute(/** @type {!messages.ApiRequest} */ ({
    action: constants.Actions.LIST_KEYS,
    content: 'public'
  }), this, goog.bind(function(searchResult) {
    var providedRecipients = this.getContent().recipients || [];
    var intendedRecipients = [];
    var allAvailableRecipients = goog.object.getKeys(searchResult);
    var recipientsEmailMap =
        this.getRecipientsEmailMap_(allAvailableRecipients);
    goog.array.forEach(providedRecipients, function(recipient) {
      if (recipientsEmailMap.hasOwnProperty(recipient)) {
        goog.array.extend(intendedRecipients, recipientsEmailMap[recipient]);
      }
    });

    this.chipHolder_ = new panels.ChipHolder(
        intendedRecipients, allAvailableRecipients);
    this.addChild(this.chipHolder_, false);
    this.chipHolder_.decorate(
        goog.dom.getElement(constants.ElementId.CHIP_HOLDER));
  }, this), goog.bind(function(error) {
    this.chipHolder_ = new panels.ChipHolder([], []);
    this.addChild(this.chipHolder_, false);
    this.chipHolder_.decorate(
        goog.dom.getElement(constants.ElementId.CHIP_HOLDER));
    this.errorCallback_(error);
  }, this));
};


/**
 * Renders the available signing keys in the UI.
 * @private
 */
promptPanels.EncryptSign.prototype.renderSigningKeys_ = function() {
  this.actionExecutor_.execute(/** @type {!messages.ApiRequest} */ ({
    action: constants.Actions.LIST_KEYS,
    content: 'private'
  }), this, goog.bind(function(privateKeyResult) {
    var availableSigningKeys = goog.object.getKeys(privateKeyResult);
    var signerSelect = goog.dom.getElement(constants.ElementId.SIGNER_SELECT);
    var signCheck = goog.dom.getElement(constants.ElementId.SIGN_MESSAGE_CHECK);

    if (availableSigningKeys.length == 0) {
      signCheck.disabled = true;
      signerSelect.disabled = true;
      var noKeysLabel = document.createTextNode(
          chrome.i18n.getMessage('promptNoPrivateKeysFound'));
      var fromHolder = goog.dom.getElement(constants.ElementId.FROM_HOLDER);
      fromHolder.appendChild(noKeysLabel);
    } else {
      signCheck.checked = true;
    }

    goog.array.forEach(availableSigningKeys, function(key) {
      var keyElem = document.createElement('option');
      keyElem.textContent = key;
      signerSelect.appendChild(keyElem);
    });
  }, this));
};


/**
 * Extracts user addresses from user IDs and creates an email to user IDs map.
 * Ignores user IDs without a valid e-mail address.
 * @param  {!Array.<string>} recipients user IDs of recipients
 * @return {!Object.<string, !Array.<string>>} email to user IDs map
 * @private
 */
promptPanels.EncryptSign.prototype.getRecipientsEmailMap_ =
    function(recipients) {
  var map = {};
  goog.array.forEach(recipients, function(recipient) {
      var email = utils.text.extractValidEmail(recipient);
      if (email) {
        if (!map.hasOwnProperty(email)) {
          map[email] = [];
        }
        map[email].push(recipient);
      }
  });
  return map;
};


/**
 * Renders the UI elements needed for requesting a passphrase for symmetrically
 * encrypting the current message.
 * @private
 */
promptPanels.EncryptSign.prototype.renderEncryptionPassphraseDialog_ =
    function() {
  var passphraseDialog = new dialogs.Generic(
      chrome.i18n.getMessage('promptEncryptionPassphraseMessage'),
      goog.bind(function(passphrase) {
        goog.dispose(passphraseDialog);
        if (passphrase.length > 0) {
          this.renderEncryptionPassphraseConfirmDialog_(passphrase);
        }
      }, this),
      dialogs.InputType.SECURE_TEXT,
      '',
      chrome.i18n.getMessage('actionEnterPassphrase'),
      chrome.i18n.getMessage('actionCancelPgpAction'));
  this.renderDialog(passphraseDialog);
};


/**
 * Renders the UI elements needed for requesting a passphrase for symmetrically
 * encrypting the current message.
 * @param {string} passphrase The original passphrase
 * @private
 */
promptPanels.EncryptSign.prototype.renderEncryptionPassphraseConfirmDialog_ =
    function(passphrase) {
  var confirmDialog = new dialogs.Generic(
      chrome.i18n.getMessage('promptEncryptionPassphraseConfirmMessage'),
      goog.bind(function(confirmedPassphrase) {
        goog.dispose(confirmDialog);
        if (passphrase == confirmedPassphrase) {
          var chip = new panels.Chip(passphrase, true);
          this.chipHolder_.addChip(chip);
        } else {
          var errorDialog = new dialogs.Generic(
              chrome.i18n.getMessage('keyMgmtPassphraseMismatchLabel'),
              function() {
                goog.dispose(errorDialog);
              },
              dialogs.InputType.NONE);
          this.renderDialog(errorDialog);
        }
      }, this),
      dialogs.InputType.SECURE_TEXT,
      '',
      chrome.i18n.getMessage('actionEnterPassphrase'),
      chrome.i18n.getMessage('actionCancelPgpAction'));
  this.renderDialog(confirmDialog);
};


/**
 * Renders the original message to which the user wants to reply.
 * @param {HTMLTextAreaElement} textArea The text area where the reply body will
 *     be displayed.
 * @param {string} originalMsg The original message.
 * @private
 */
promptPanels.EncryptSign.prototype.renderReply_ =
    function(textArea, originalMsg) {
  var replyLineToken = '\n> ';
  var replyBody = utils.text.prettyTextWrap(
      originalMsg, (78 - replyLineToken.length));
  textArea.value = goog.string.format(
      '\n\n%s:\n%s',
      chrome.i18n.getMessage('promptEncryptSignReplyHeader'),
      replyLineToken + replyBody.split('\n').join(replyLineToken));
  textArea.setSelectionRange(0, 0);
};


/**
 * Executes the ENCRYPT_SIGN action.
 * @private
 */
promptPanels.EncryptSign.prototype.encryptSign_ = function() {
  var textArea = /** @type {HTMLTextAreaElement} */
      (this.getElement().querySelector('textarea'));
  var origin = this.getContent().origin;
  var request = /** @type {!messages.ApiRequest} */ ({
    action: constants.Actions.ENCRYPT_SIGN,
    content: textArea.value,
    currentUser: goog.dom.getElement(constants.ElementId.SIGNER_SELECT).value
  });

  if (this.chipHolder_) {
    request.recipients = this.chipHolder_.getSelectedUids();
    request.encryptPassphrases = this.chipHolder_.getProvidedPassphrases();
  }

  var signerCheck = goog.dom.getElement(constants.ElementId.SIGN_MESSAGE_CHECK);
  request.signMessage = signerCheck && signerCheck.checked;

  this.actionExecutor_.execute(request, this, goog.bind(function(encrypted) {
    textArea.disabled = true;
    textArea.value = encrypted;
    this.chipHolder_.lock();
    var passphraseEncryptionLink = goog.dom.getElement(
        constants.ElementId.PASSPHRASE_ENCRYPTION_LINK);
    goog.dom.classlist.add(
        passphraseEncryptionLink, constants.CssClass.INVISIBLE);
    var signCheckbox = goog.dom.getElement(
        constants.ElementId.SIGN_MESSAGE_CHECK);
    signCheckbox.disabled = true;
    this.clearSavedDraft_(origin);
    this.renderDismiss();
    var insertButton = this.getElementByClass(constants.CssClass.INSERT);
    if (insertButton) {
      goog.dom.classlist.remove(insertButton, constants.CssClass.HIDDEN);
    }
  }, this));
};


/**
 * Inserts the encrypted content into the page.
 * @param {string} origin The web origin for which the PGP action is performed.
 * @private
 */
promptPanels.EncryptSign.prototype.insertMessageIntoPage_ = function(origin) {
  var textArea = this.getElement().querySelector('textarea');
  var recipients = this.chipHolder_.getSelectedUids();
  utils.action.updateSelectedContent(
      textArea.value, recipients, origin, false,
      goog.partial(goog.dispose, this.getParent()), this.errorCallback_);
};


/**
 * Shows the Settings/Options page.
 * @private
 */
promptPanels.EncryptSign.prototype.showOptions_ = function() {
  chrome.tabs.create({
    url: 'settings.html',
    active: false
  }, goog.nullFunction);
};


/**
 * Loads the last saved draft. If none is available, loads the content that the
 * user has selected.
 * @private
 */
promptPanels.EncryptSign.prototype.loadSavedDraftOrSelectedContent_ =
    function() {
  var origin = this.getContent().origin;
  var textArea = /** @type {HTMLTextAreaElement} */
      (this.getElement().querySelector('textarea'));
  if (drafts.hasDraft(origin)) {
    var dialog = new dialogs.Generic(
        chrome.i18n.getMessage('promptEncryptSignRestoreDraftMsg'),
        goog.bind(function(dialogResult) {
          if (goog.isDef(dialogResult)) {
            // A passed object signals that the user has clicked the
            // 'OK' button.
            var draft = drafts.getDraft(origin);
            this.actionExecutor_.execute( /** @type {!messages.ApiRequest} */ ({
              action: constants.Actions.DECRYPT_VERIFY,
              content: draft,
              passphraseCallback: goog.bind(this.renderPassphraseDialog, this)
            }), this, goog.bind(function(decrypted) {
              textArea.value = decrypted;
              this.renderDismiss();
            }, this));
          } else {
            drafts.clearDraft(origin);
          }

          goog.dispose(dialog);
        }, this),
        dialogs.InputType.NONE,
        '',
        chrome.i18n.getMessage('promptEncryptSignRestoreDraftLabel'),
        chrome.i18n.getMessage('promptEncryptSignDiscardDraftLabel'));
    this.renderDialog(dialog);
  } else {
    var content = this.getContent().selection || '';
    var sniffedAction = utils.text.getPgpAction(
        content, preferences.isActionSniffingEnabled());
    if (sniffedAction == constants.Actions.DECRYPT_VERIFY) {
      this.actionExecutor_.execute(/** @type {!messages.ApiRequest} */ ({
        action: constants.Actions.DECRYPT_VERIFY,
        content: content,
        passphraseCallback: goog.bind(this.renderPassphraseDialog, this)
      }), this, goog.bind(function(decrypted) {
        if (e2e.openpgp.asciiArmor.isDraft(content)) {
          textArea.value = decrypted;
        } else {
          this.renderReply_(textArea, decrypted);
        }
      }, this));
    }
  }
};


/**
 * Encrypts the current draft and persists it into the web app that the user is
 * interacting with.
 * @param {string} origin The web origin where the message was created.
 * @param {goog.events.Event} evt The event that triggers the saving of the
 *     draft.
 * @private
 */
promptPanels.EncryptSign.prototype.saveDraft_ = function(origin, evt) {
  var formText = /** @type {HTMLTextAreaElement} */
      (this.getElement().querySelector('textarea'));

  this.actionExecutor_.execute(/** @type {!messages.ApiRequest} */ ({
    action: constants.Actions.ENCRYPT_SIGN,
    content: formText.value,
    currentUser: goog.dom.getElement(constants.ElementId.SIGNER_SELECT).value
  }), this, goog.bind(function(encrypted) {
    var draft = e2e.openpgp.asciiArmor.markAsDraft(encrypted);
    if (evt.type == goog.events.EventType.CLICK) {
      utils.action.updateSelectedContent(
          draft, [], origin, true, goog.nullFunction, this.errorCallback_);
    } else {
      drafts.saveDraft(draft, origin);
    }
  }, this), goog.bind(function(error) {
    if (evt.type == goog.events.EventType.CLICK &&
        error.messageId == 'promptNoEncryptionTarget') {
      var dialog = new dialogs.Generic(
          chrome.i18n.getMessage('promptNoEncryptionKeysFound'),
          function() {
            goog.dispose(dialog);
          },
          dialogs.InputType.NONE);
      this.renderDialog(dialog);
    }

    // NOTE(radi): Errors are silenced here on purpose.
  }, this));
};


/**
 * Clears the saved draft and disables auto-save.
 * @param {string} origin The origin for which the drafts are to be removed.
 * @private
 */
promptPanels.EncryptSign.prototype.clearSavedDraft_ = function(origin) {
  this.autoSaveTimer_.stop();
  drafts.clearDraft(origin);
};

}); // goog.scope
