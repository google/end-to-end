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
 * @fileoverview The launcher for the End-To-End extension. Establishes
 * communication with the content scripts. Instantiates the required UI bits
 * that allow the user to interact with the extension.
 */

goog.provide('e2e.ext.AppLauncher');
goog.provide('e2e.ext.ExtensionLauncher');
goog.provide('e2e.ext.Launcher');

goog.require('e2e.ext.Preferences');
goog.require('e2e.ext.api.Api');

goog.scope(function() {
var ext = e2e.ext;
var constants = e2e.ext.constants;
var messages = e2e.ext.messages;



/**
 * Base class for the End-To-End launcher.
 * @param {!e2e.openpgp.Context} pgpContext The OpenPGP context to use.
 * @param {!goog.storage.mechanism.IterableMechanism} preferencesStorage
 *    Storage mechanism for user preferences.
 * @constructor
 */
ext.Launcher = function(pgpContext, preferencesStorage) {

  /**
   * Whether the launcher was started correctly.
   * @type {boolean}
   * @private
   */
  this.started_ = false;

  /**
   * The OpenPGP context used by the extension.
   * @type {!e2e.openpgp.Context}
   * @private
   */
  this.pgpContext_ = pgpContext;

  /**
   * Object for accessing user preferences.
   * @type {!e2e.ext.Preferences}
   * @private
   */
  this.preferences_ = new e2e.ext.Preferences(preferencesStorage);


  /**
   * The context API that the rest of the extension can use to communicate with
   * the PGP context.
   * @type {!ext.api.Api}
   * @private
   */
  this.ctxApi_ = new ext.api.Api();
};


/**
 * Asks for the keyring passphrase and start the launcher. Will throw an
 * exception if the password is wrong.
 * @param {string=} opt_passphrase The passphrase of the keyring.
 * @expose
 */
ext.Launcher.prototype.start = function(opt_passphrase) {
  this.start_(opt_passphrase || '');
};


/**
 * Starts the launcher.
 * @param {string} passphrase The passphrase of the keyring.
 * @private
 */
ext.Launcher.prototype.start_ = function(passphrase) {
  this.pgpContext_.setKeyRingPassphrase(passphrase).addCallback(function() {
    if (goog.global.chrome &&
        goog.global.chrome.runtime &&
        goog.global.chrome.runtime.getManifest) {
      var manifest = chrome.runtime.getManifest();
      this.pgpContext_.setArmorHeader(
          'Version',
          manifest.name + ' v' + manifest.version).addCallback(
              this.completeStart_, this);
    } else {
      this.completeStart_();
    }
  }, this);
};


/** @private */
ext.Launcher.prototype.completeStart_ = function() {
  this.ctxApi_.installApi();
  this.started_ = true;
  this.preferences_.initDefaults();

  this.showWelcomeScreen();
  this.updatePassphraseWarning();
};


/**
 * Returns the PGP context used within the extension.
 * @return {e2e.openpgp.Context} The PGP context.
 * @expose
 */
ext.Launcher.prototype.getContext = function() {
  return this.pgpContext_;
};


/**
 * Returns the Preferences object used within the extension.
 * @return {e2e.ext.Preferences} The Preferences object.
 * @expose
 */
ext.Launcher.prototype.getPreferences = function() {
  return this.preferences_;
};


/**
 * Indicates if the keyring was loaded with the correct passphrase.
 * @return {boolean} True if the keyring was loaded with the correct passphrase.
 * @expose
 */
ext.Launcher.prototype.hasPassphrase = function() {
  return this.started_;
};


/**
 * Display a warning to the user if there is no available passphrase to access
 * the keyring.
 * @protected
 */
ext.Launcher.prototype.updatePassphraseWarning = goog.abstractMethod;


/**
 * Creates a window displaying a document from an internal End-To-End URL.
 * @param {string} url URL of the document.
 * @param {boolean} isForeground Should the focus be moved to the new window.
 * @param {!function(...)} callback Function to call once the window has been
 *     created.
 * @protected
 */
ext.Launcher.prototype.createWindow = goog.abstractMethod;


/**
 * Shows the welcome screen to first-time users.
 * @protected
 */
ext.Launcher.prototype.showWelcomeScreen = function() {
  if (this.preferences_.isWelcomePageEnabled()) {
    this.createWindow('welcome.html', true, goog.nullFunction);
  }
};



/**
 * Constructor to use in End-To-End Chrome extension.
 * @param {!e2e.openpgp.Context} pgpContext The OpenPGP context to use.
 * @param {!goog.storage.mechanism.IterableMechanism} preferencesStorage Storage
 * mechanism for user preferences.
 * @constructor
 * @extends {ext.Launcher}
 */
ext.ExtensionLauncher = function(pgpContext, preferencesStorage) {
  ext.ExtensionLauncher.base(this, 'constructor', pgpContext,
      preferencesStorage);
};
goog.inherits(ext.ExtensionLauncher, ext.Launcher);


/** @override */
ext.ExtensionLauncher.prototype.updatePassphraseWarning = function() {
  if (this.hasPassphrase()) {
    chrome.browserAction.setBadgeText({text: ''});
    chrome.browserAction.setTitle({
      title: chrome.i18n.getMessage('extName')
    });
  } else {
    chrome.browserAction.setBadgeText({text: '!'});
    chrome.browserAction.setTitle({
      title: chrome.i18n.getMessage('passphraseEmptyWarning')
    });
  }
};


/** @override */
ext.ExtensionLauncher.prototype.createWindow = function(url, isForeground,
    callback) {
  chrome.tabs.create({
    url: url,
    active: isForeground
  }, callback);
};



/**
 * Constructor to use in End-To-End Chrome app.
 * @param {!e2e.openpgp.Context} pgpContext The OpenPGP context to use.
 * @param {!goog.storage.mechanism.IterableMechanism} preferencesStorage Storage
 * mechanism for user preferences.
 * @constructor
 * @extends {ext.Launcher}
 */
ext.AppLauncher = function(pgpContext, preferencesStorage) {
  ext.AppLauncher.base(this, 'constructor', pgpContext, preferencesStorage);
  chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('webview.html', {
      innerBounds: {
        width: 960,
        height: 580
      }
    });
  });
};
goog.inherits(ext.AppLauncher, ext.Launcher);


/** @override */
ext.AppLauncher.prototype.updatePassphraseWarning = function() {
  // TODO(evn): Implement.
};


/** @override */
ext.AppLauncher.prototype.createWindow = function(url, isForeground, callback) {
  chrome.app.window.create(url, {
    focused: isForeground,
    innerBounds: {
      width: 900,
      height: 700
    }
  }, callback);
};


});  // goog.scope
