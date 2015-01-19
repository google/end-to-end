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
 * @fileoverview Provides the UI that allows the user to interact with the
 * extension. Handles all main use cases: import key, encrypt/sign,
 * decrypt/verify.
 */

goog.provide('e2e.ext.ui.Prompt');

goog.require('e2e.ext.DraftManager');
goog.require('e2e.ext.actions.Executor');
goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.constants.ElementId');
goog.require('e2e.ext.constants.StorageKey');
goog.require('e2e.ext.ui.dialogs.Generic');
goog.require('e2e.ext.ui.dialogs.InputType');
goog.require('e2e.ext.ui.panels.prompt.DecryptVerify');
goog.require('e2e.ext.ui.panels.prompt.EncryptSign');
goog.require('e2e.ext.ui.panels.prompt.ImportKey');
goog.require('e2e.ext.ui.panels.prompt.PanelBase');
goog.require('e2e.ext.ui.templates.prompt');
goog.require('e2e.ext.utils');
goog.require('e2e.ext.utils.action');
goog.require('e2e.ext.utils.text');
goog.require('e2e.openpgp.asciiArmor');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.events.EventType');
goog.require('goog.positioning.Corner');
goog.require('goog.style');
goog.require('goog.ui.Component');
goog.require('goog.ui.MenuItem');
goog.require('goog.ui.PopupMenu');
goog.require('soy');

goog.scope(function() {
var constants = e2e.ext.constants;
var dialogs = e2e.ext.ui.dialogs;
var ext = e2e.ext;
var messages = e2e.ext.messages;
var panels = e2e.ext.ui.panels;
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

  /**
   * The End-to-End actions that the user can select in the prompt UI.
   * @type {!Array.<!Object.<constants.Actions,string>>}
   * @private
   */
  this.selectableActions_ = [{
    value: constants.Actions.ENCRYPT_SIGN,
    title: chrome.i18n.getMessage('promptEncryptSignTitle')
  }, {
    value: constants.Actions.DECRYPT_VERIFY,
    title: chrome.i18n.getMessage('promptDecryptVerifyTitle')
  }, {
    value: constants.Actions.IMPORT_KEY,
    title: chrome.i18n.getMessage('promptImportKeyTitle')
  }, {
    value: constants.Actions.CONFIGURE_EXTENSION,
    title: chrome.i18n.getMessage('actionConfigureExtension')
  }];
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
    extName: chrome.i18n.getMessage('extName'),
    menuLabel: chrome.i18n.getMessage('actionOpenMenu')
  });

  var styles = elem.querySelector('link');
  styles.href = chrome.runtime.getURL('prompt_styles.css');

  utils.action.getLauncher(function(launcher) {
    this.pgpLauncher_ = launcher || this.pgpLauncher_;
  }, this.displayFailure_, this);
  // Ignore the error to also show the prompt for pages for which we cannot
  // inject code.
  utils.action.getSelectedContent(
      this.processSelectedContent_, function(error) {
        this.processSelectedContent_(null);
      }, this);
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
        utils.text.getPgpAction(content,
            this.pgpLauncher_.getPreferences().isActionSniffingEnabled());
    origin = contentBlob.origin;
    if (e2e.openpgp.asciiArmor.isDraft(content)) {
      action = constants.Actions.ENCRYPT_SIGN;
    }
    recipients = contentBlob.recipients || [];
    contentBlob.action = action;
    canInject = contentBlob.canInject;
    contentBlob.subject = contentBlob.subject || undefined;
  }

  if (!this.pgpLauncher_.hasPassphrase() &&
      action != ext.constants.Actions.GET_PASSPHRASE) {
    this.processSelectedContent_(
        contentBlob, ext.constants.Actions.GET_PASSPHRASE);
    return;
  }

  var promptPanel = null;
  var elem = goog.dom.getElement(constants.ElementId.BODY);
  var title = goog.dom.getElement(constants.ElementId.TITLE);
  title.textContent = this.getTitle_(action) || title.textContent;
  switch (action) {
    case constants.Actions.ENCRYPT_SIGN:
      promptPanel = new panels.prompt.EncryptSign(
          this.actionExecutor_,
          /** @type {!messages.BridgeMessageRequest} */ (contentBlob || {}),
          this.pgpLauncher_.getPreferences(),
          new ext.DraftManager(this.pgpLauncher_.getStorage(
              constants.StorageKey.DRAFTS)),
          goog.bind(this.displayFailure_, this));
      break;
    case constants.Actions.DECRYPT_VERIFY:
      promptPanel = new panels.prompt.DecryptVerify(
          this.actionExecutor_,
          /** @type {!messages.BridgeMessageRequest} */ (contentBlob || {}),
          goog.bind(this.displayFailure_, this));
      break;
    case constants.Actions.IMPORT_KEY:
      promptPanel = new panels.prompt.ImportKey(
          this.actionExecutor_,
          /** @type {!messages.BridgeMessageRequest} */ (contentBlob || {}),
          goog.bind(this.displayFailure_, this));
      break;
    case constants.Actions.GET_PASSPHRASE:
      this.hideMenuButton_();
      this.renderKeyringPassphrase_(elem, contentBlob);
      return;
    case constants.Actions.USER_SPECIFIED:
      this.showMenuInline_(this.renderMenu_(elem, contentBlob));
      return;
    case constants.Actions.CONFIGURE_EXTENSION:
      this.pgpLauncher_.createWindow('settings.html', false, goog.nullFunction);
      return;
    case constants.Actions.NO_OP:
      this.close();
      return;
  }

  if (promptPanel) {
    this.addChild(promptPanel, false);
    promptPanel.decorate(elem);
    title.textContent = promptPanel.getTitle();
  }

  this.getHandler().listen(
      elem, goog.events.EventType.CLICK,
      goog.bind(this.buttonClick_, this, action, origin, contentBlob));

  this.renderMenu_(elem, promptPanel);
};


/**
 * Hides the menu button.
 * @private
 */
ui.Prompt.prototype.hideMenuButton_ = function() {
  var menuContainer = goog.dom.getElement(constants.ElementId.MENU_CONTAINER);
  goog.dom.classlist.add(menuContainer, constants.CssClass.HIDDEN);
};


/**
 * Show the menu in the prompt document inline, hiding the menu container
 *     button.
 * @param {!goog.ui.PopupMenu} menu Menu element.
 * @private
 */
ui.Prompt.prototype.showMenuInline_ = function(menu) {
  var menuContainer = goog.dom.getElement(constants.ElementId.MENU_CONTAINER);
  this.hideMenuButton_();
  menu.detach(menuContainer);
  // Show the menu inline instead and restyle it.
  goog.dom.classlist.remove(menu.getElement(), 'goog-menu');
  goog.style.setStyle(menu.getElement(), {
    'display': 'block',
    'outline': 'none',
    'position': 'relative',
    'top': '-10px'
  });
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
    }
  }
};


/**
 * Renders the main menu.
 * @param {Element} elem The element into which the UI elements are to be
 *     rendered.
 * @param {panels.prompt.PanelBase|messages.BridgeMessageRequest} blob The
 *     prompt UI panel that is displayed to the user or the content blob that
 *     the user has selected.
 * @return {!goog.ui.PopupMenu} Created menu
 * @private
 */
ui.Prompt.prototype.renderMenu_ = function(elem, blob) {
  var contentBlob;
  if (blob instanceof panels.prompt.PanelBase) {
    contentBlob = blob.getContent();
  } else {
    contentBlob = blob || null;
  }

  var menu = new goog.ui.PopupMenu();
  goog.array.forEach(this.selectableActions_, function(action) {
    var menuItem = new goog.ui.MenuItem(action.title);
    menuItem.setValue(action.value);
    menu.addChild(menuItem, true);
  });
  this.addChild(menu, false);
  menu.render(goog.dom.getElement(constants.ElementId.BODY));

  this.getHandler().listen(
      menu,
      goog.ui.Component.EventType.ACTION,
      goog.partial(this.selectAction_, contentBlob));

  var menuContainer = goog.dom.getElement(constants.ElementId.MENU_CONTAINER);

  menu.setToggleMode(true);
  menu.attach(
      menuContainer,
      goog.positioning.Corner.TOP_LEFT,
      goog.positioning.Corner.BOTTOM_LEFT);

  return menu;
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
 * @param {!goog.events.Event} evt The event generated by the user's
 *     selection.
 * @private
 */
ui.Prompt.prototype.selectAction_ = function(contentBlob, evt) {
  var menuContainer = goog.dom.getElement(constants.ElementId.MENU_CONTAINER);
  goog.dom.classlist.remove(menuContainer, constants.CssClass.HIDDEN);
  this.removeChildren();

  this.processSelectedContent_(
      contentBlob,
      /** @type {constants.Actions} */ (evt.target.getValue()));
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


});  // goog.scope

// Create the settings page.
if (Boolean(chrome.runtime) && location.protocol === 'chrome-extension:') {
  /** @type {!e2e.ext.ui.Prompt} */
  window.promptPage = new e2e.ext.ui.Prompt();
  window.promptPage.decorate(document.documentElement);
}
