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
 * @fileoverview Provides the UI for the extension's settings page.
 */

goog.provide('e2e.ext.ui.Settings');

goog.require('e2e.cipher.Algorithm');
goog.require('e2e.ext.Launcher');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.templates');
goog.require('e2e.ext.ui.Dialog');
goog.require('e2e.ext.ui.panels.GenerateKey');
goog.require('e2e.ext.ui.panels.KeyringMgmtFull');
goog.require('e2e.ext.ui.panels.PreferencesPanel');
goog.require('e2e.ext.ui.preferences');
goog.require('e2e.ext.utils');
goog.require('e2e.openpgp.Context');
goog.require('e2e.signer.Algorithm');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.events.Event');
goog.require('goog.events.EventType');
goog.require('goog.string.format');
goog.require('goog.ui.Component');
goog.require('soy');

goog.scope(function() {
var ext = e2e.ext;
var constants = e2e.ext.constants;
var panels = e2e.ext.ui.panels;
var preferences = e2e.ext.ui.preferences;
var templates = e2e.ext.templates;
var ui = e2e.ext.ui;
var utils = e2e.ext.utils;



/**
 * Constructor for the settings page.
 * @constructor
 * @extends {goog.ui.Component}
 */
ui.Settings = function() {
  goog.base(this);
};
goog.inherits(ui.Settings, goog.ui.Component);


/**
 * The PGP context used by the extension.
 * @type {e2e.openpgp.Context}
 * @private
 */
ui.Settings.prototype.pgpContext_ = null;


/**
 * The extension's launcher.
 * @type {ext.Launcher}
 * @private
 */
ui.Settings.prototype.pgpLauncher_ = null;


/**
 * The panel to list and manage all stored PGP keys.
 * @type {panels.KeyringMgmtFull}
 * @private
 */
ui.Settings.prototype.keyringMgmtPanel_ = null;


/** @override */
ui.Settings.prototype.getContentElement = function() {
  return goog.dom.getElement(constants.ElementId.BODY) || this.getElement();
};


/** @override */
ui.Settings.prototype.decorateInternal = function(elem) {
  this.setElementInternal(elem);

  chrome.runtime.getBackgroundPage(goog.bind(function(page) {
    if (page) {
      this.pgpLauncher_ = page.launcher;
      this.pgpContext_ = page.launcher.getContext();
      if (!this.pgpContext_.hasPassphrase()) {
        window.alert(chrome.i18n.getMessage('settingsKeyringLockedError'));
        window.close();
      } else {
        this.pgpContext_.getAllKeys()
            .addCallback(this.renderTemplate_, this)
            .addErrback(this.displayFailure_, this);
      }
    } else {
      console.error(chrome.runtime.lastError);
    }
  }, this));
};


/**
 * Renders the settings page.
 * @param {!Object} pgpKeys The existing PGP keys in the keyring.
 * @private
 */
ui.Settings.prototype.renderTemplate_ = function(pgpKeys) {
  var elem = this.getElement();

  soy.renderElement(elem, templates.Settings, {
    extName: chrome.i18n.getMessage('extName'),
    pageTitle: chrome.i18n.getMessage('settingsTitle')
  });

  var styles = elem.querySelector('link');
  styles.href = chrome.extension.getURL('settings_styles.css');

  this.addChild(new panels.PreferencesPanel(), true);

  var generateKeyPanel =
      new panels.GenerateKey(goog.bind(this.generateKey_, this));
  this.addChild(generateKeyPanel, true);

  this.keyringMgmtPanel_ = new panels.KeyringMgmtFull(
      pgpKeys,
      goog.bind(this.exportKeyring_, this),
      goog.bind(this.importKeyring_, this),
      goog.bind(this.updateKeyringPassphrase_, this),
      goog.bind(this.exportKey_, this),
      goog.bind(this.removeKey_, this));
  this.addChild(this.keyringMgmtPanel_, true);
  this.keyringMgmtPanel_.setKeyringEncrypted(
      this.pgpContext_.isKeyRingEncrypted());

  this.getHandler().listen(
      this.getElement(), goog.events.EventType.CLICK, this.clearFailure_);
};


/**
 * Generates a new PGP key using the information that is provided by the user.
 * @param {panels.GenerateKey} panel The panel where the user has provided the
 *     information for the new key.
 * @param {string} name The name to use.
 * @param {string} email The email to use.
 * @param {string} comments The comments to use.
 * @param {number} expDate The expiration date to use.
 * @private
 * @return {goog.async.Deferred}
 */
ui.Settings.prototype.generateKey_ =
    function(panel, name, email, comments, expDate) {
  var keyAlgo = e2e.signer.Algorithm['ECDSA'];
  var keyLength = 256;

  var subkeyAlgo = e2e.cipher.Algorithm['ECDH'];
  var subkeyLength = 256;

  return this.pgpContext_.generateKey(
      keyAlgo, keyLength, subkeyAlgo, subkeyLength, name, comments, email,
      expDate).addCallback(goog.bind(function(key) {
    this.renderNewKey_(key[0].uids[0]);
    panel.reset();
  }, this)).addErrback(this.displayFailure_, this);
};


/**
 * Removes a PGP key.
 * @param {string} keyUid The ID of the key to remove.
 * @private
 */
ui.Settings.prototype.removeKey_ = function(keyUid) {
  this.pgpContext_
      .searchPrivateKey(keyUid)
      .addCallback(function(privateKeys) {
        // TODO(evn): This message should be localized.
        var prompt = 'Deleting all keys for ' + keyUid;
        if (privateKeys && privateKeys.length > 0) {
          prompt += '\n\nWARNING: This will delete some private keys!';
        }
        if (window.confirm(prompt)) {
          this.pgpContext_.deleteKey(keyUid);
          this.keyringMgmtPanel_.removeKey(keyUid);
        }
      }, this)
      .addErrback(this.displayFailure_, this);
};


/**
 * Exports a PGP key.
 * @param {string} keyUid The ID of the key to export.
 * @private
 */
ui.Settings.prototype.exportKey_ = function(keyUid) {
  this.pgpContext_.searchPublicKey(keyUid).addCallback(function(keys) {
    var armoredKey = e2e.openpgp.asciiArmor.encode(
        'PUBLIC KEY BLOCK',
        goog.array.flatten(goog.array.map(
            keys, function(key) {
          return key.serialized;
        })));
    var filename = keyUid.replace(/[\/\\]/g, '.') + '-public.asc';

    utils.WriteToFile(filename, armoredKey, function(fileUrl) {
      var anchor = document.createElement('a');
      anchor.download = filename;
      anchor.href = fileUrl;
      anchor.click();
    });
  }, this).addErrback(this.displayFailure_, this);
};


/**
 * Renders a new PGP key into the settings page.
 * @param {string} keyUid The key UID to render.
 * @private
 */
ui.Settings.prototype.renderNewKey_ = function(keyUid) {
  this.pgpContext_
      .searchKey(keyUid)
      .addCallback(function(pgpKeys) {
        this.keyringMgmtPanel_.addNewKey(keyUid, pgpKeys);
      }, this)
      .addErrback(this.displayFailure_, this);
};


/**
 * Imports a keyring from a file and appends it to the current keyring.
 * @param {File} file The file to import.
 * @private
 */
ui.Settings.prototype.importKeyring_ = function(file) {
  utils.ReadFile(file, goog.bind(function(contents) {
    // TODO(adhintz) try/catch here to alert on failed key import?
    var keyDescription =
        this.pgpLauncher_.getContext().getKeyDescription(contents);
    // TODO(evn): All these messages should be localized.
    if (window.confirm('Do you want to import the following keys?\n\n' +
        keyDescription)) {
      // TODO(radi): Add a proper callback to request a passphrase if needed.
      this.pgpContext_
          .importKey(goog.bind(this.renderPassphraseCallback_, this), contents)
          .addCallback(function(res) {
            if (res.length > 0) {
              this.pgpLauncher_.showNotification(
                  'Key import success for ' + res.toString(),
                  goog.bind(function() {
                    goog.array.forEach(res, function(keyUid) {
                      this.renderNewKey_(keyUid);
                    }, this);
                    this.keyringMgmtPanel_.resetControls();
                  }, this));
            } else {
              this.displayFailure_(
                  new utils.Error('Import key error', 'promptImportKeyError'));

            }
          }, this)
          .addErrback(this.displayFailure_, this);
    }
  }, this));
};


/**
 * Renders the UI elements needed for requesting the passphrase of an individual
 * PGP key.
 * @param {string} uid The UID of the PGP key.
 * @param {!function(string)} callback The callback to invoke when the
 *     passphrase has been provided.
 * @private
 */
ui.Settings.prototype.renderPassphraseCallback_ = function(uid, callback) {
  var popupElem = goog.dom.getElement(constants.ElementId.CALLBACK_DIALOG);
  var dialog = new ui.Dialog(
      goog.string.format(
          chrome.i18n.getMessage('promptPassphraseCallbackMessage'), uid),
      function(passphrase) {
        goog.dispose(dialog);
        callback(/** @type {string} */ (passphrase));
      },
      // Use a password field to ask for the passphrase.
      ui.Dialog.InputType.SECURE_TEXT,
      '',
      chrome.i18n.getMessage('actionEnterPassphrase'),
      chrome.i18n.getMessage('actionCancelPgpAction'));

  this.addChild(dialog, false);
  dialog.render(popupElem);
};


/**
 * Exports the entire keyring to a file.
 * @private
 */
ui.Settings.prototype.exportKeyring_ = function() {
  var filename = (
      this.pgpContext_.isKeyRingEncrypted() ?
      'keyring-private' : 'UNENCRYPTED-keyring-private');
  filename += '-' + new Date().getTime() + '.asc';
  this.pgpContext_.exportKeyring(true).addCallback(function(armoredKey) {
    utils.WriteToFile(
        filename, armoredKey, function(fileUrl) {
      var anchor = document.createElement('a');
      anchor.download = filename;
      anchor.href = fileUrl;
      anchor.click();
    });
  }, this).addErrback(this.displayFailure_, this);
};


/**
 * Updates the passphrase to the existing keyring.
 * @param {string} passphrase The new passphrase to apply.
 * @private
 */
ui.Settings.prototype.updateKeyringPassphrase_ = function(passphrase) {
  this.pgpContext_.changeKeyRingPassphrase(passphrase);
  this.pgpLauncher_.showNotification(
      chrome.i18n.getMessage('keyMgmtChangePassphraseSuccessMsg'),
      function() {/* No-op */});
  this.keyringMgmtPanel_.setKeyringEncrypted(
      this.pgpContext_.isKeyRingEncrypted());
};


/**
 * Displays an error message to the user.
 * @param {Error} error The error to display.
 * @private
 */
ui.Settings.prototype.displayFailure_ = function(error) {
  var errorDiv = goog.dom.getElement(constants.ElementId.ERROR_DIV);
  var errorMsg = goog.isDef(error.messageId) ?
      chrome.i18n.getMessage(error.messageId) : error.message;
  utils.errorHandler(error);
  errorDiv.textContent = errorMsg;
};


/**
 * Clears the error message notfication area.
 * @private
 */
ui.Settings.prototype.clearFailure_ = function() {
  var errorDiv = goog.dom.getElement(constants.ElementId.ERROR_DIV);
  errorDiv.textContent = '';
};


}); // goog.scope


// Create the settings page.
if (Boolean(chrome.extension)) {
  /** @type {!e2e.ext.ui.Settings} */
  window.settingsPage = new e2e.ext.ui.Settings();
  window.settingsPage.decorate(document.documentElement);
}
