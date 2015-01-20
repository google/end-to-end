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

goog.require('e2e.async.Result');
goog.require('e2e.ext.Preferences');
goog.require('e2e.ext.api.Api');
goog.require('e2e.ext.constants.StorageKey');
goog.require('e2e.openpgp.ContextImpl');
goog.require('goog.storage.mechanism.HTML5LocalStorage');
goog.require('goog.storage.mechanism.PrefixedMechanism');

goog.scope(function() {
var ext = e2e.ext;
var constants = e2e.ext.constants;
var messages = e2e.ext.messages;



/**
 * Base class for the End-To-End launcher.
 * @param {!goog.storage.mechanism.IterableMechanism} storage Storage mechanism
 *     for persistent data.
 * @constructor
 */
ext.Launcher = function(storage) {
  /**
   * The ID of the last used tab.
   * @type {number}
   * @private
   */
  this.lastTabId_ = window.NaN;

  /**
   * Whether the launcher was started correctly.
   * @type {boolean}
   * @private
   */
  this.started_ = false;

  /**
   * The PGP context used by the extension.
   * @type {e2e.openpgp.Context}
   * @private
   */
  this.pgpContext_ = new e2e.openpgp.ContextImpl(storage);

  /**
   * Storage mechanism for persistent data.
   * @type {!goog.storage.mechanism.IterableMechanism}
   * @private
   */
  this.storage_ = storage;

  /**
   * Object for accessing user preferences.
   * @type {e2e.ext.Preferences}
   * @private
   */
  this.preferences_ = new e2e.ext.Preferences(this.getStorage(
      constants.StorageKey.PREFERENCES));

  /**
   * The context API that the rest of the extension can use to communicate with
   * the PGP context.
   * @type {!ext.api.Api}
   * @private
   */
  this.ctxApi_ = new ext.api.Api();
};


/**
 * Delay in ms needed to initialize message listeners in helper.
 * @type {number}
 * @const
 */
ext.Launcher.HELPER_CALLBACK_DELAY = 50;


/**
 * Sets the provided content into the element on the page that the user has
 * selected.
 * Note: This function might not work while debugging the extension.
 * @param {string} content The content to write inside the selected element.
 * @param {!Array.<string>} recipients The recipients of the message.
 * @param {string} origin The web origin where the original message was created.
 * @param {boolean} expectMoreUpdates True if more updates are expected. False
 *     if this is the final update to the selected content.
 * @param {!function(...)} callback The function to invoke once the content has
 *     been updated.
 * @param {!function(Error)} errorCallback The callback to invoke if an error is
 *     encountered.
 * @param {string=} opt_subject The subject of the message if applicable.
 * @param {number=} opt_tabId Tab ID of the tab to update the content in.
 *     Defaults to active tab.
 * @expose
 */
ext.Launcher.prototype.updateSelectedContent = goog.abstractMethod;


/**
 * Retrieves the content that the user has selected.
 * @param {!function(...)} callback The callback where the selected content will
 *     be passed.
 * @param {!function(Error)} errorCallback The callback to invoke if an error is
 *     encountered.
 * @param {number=} opt_tabId Tab ID of the tab to get the content from.
 *     Defaults to active tab.
 * @expose
 */
ext.Launcher.prototype.getSelectedContent = goog.abstractMethod;


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
  this.pgpContext_.setKeyRingPassphrase(passphrase);
  if (goog.global.chrome &&
      goog.global.chrome.runtime &&
      goog.global.chrome.runtime.getManifest) {
    var manifest = chrome.runtime.getManifest();
    this.pgpContext_.setArmorHeader(
        'Version',
        manifest.name + ' v' + manifest.version);
  }
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
 * Returns storage mechanism for a given namespace.
 * @param  {string} namespace The namespace.
 * @return {!goog.storage.mechanism.PrefixedMechanism}
 */
ext.Launcher.prototype.getStorage = function(namespace) {
  return new goog.storage.mechanism.PrefixedMechanism(this.storage_,
      namespace);
};



/**
 * @param {goog.storage.mechanism.IterableMechanism=} opt_storage
 * @constructor
 * @extends {ext.Launcher}
 */
ext.ExtensionLauncher = function(opt_storage) {
  var storage = opt_storage || new goog.storage.mechanism.HTML5LocalStorage();
  ext.ExtensionLauncher.base(this, 'constructor', storage);
};
goog.inherits(ext.ExtensionLauncher, ext.Launcher);


/**
 * Finds the tab of with a current web application and determines if a helper
 * script is running inside of it. If no helper script is running, then one is
 * injected.
 * @param {!function(number)} callback The function to invoke once the active
 *     tab is found.
 * @param {number=} opt_tabId If present, forces query of a given tab ID instead
 *     of the current tab.
 * @protected
 */
ext.ExtensionLauncher.prototype.getWebsiteTab = function(callback, opt_tabId) {
  if (goog.isDefAndNotNull(opt_tabId)) {
    this.connectToTab_(callback, opt_tabId);
  } else {
    // Query active tab.
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, goog.bind(function(tabs) {
      var tabId = tabs[0] ? tabs[0].id : undefined;
      this.connectToTab_(callback, tabId);
    }, this));
  }
};


/**
 * Connects to the helper in a given tab.
 * @param {!function(number)} callback The function to invoke once the active
 *     tab is found.
 * @param {number=} opt_tabId Tab ID to connect to.
 * @private
 */
ext.ExtensionLauncher.prototype.connectToTab_ = function(callback, opt_tabId) {
  if (!goog.isDef(opt_tabId)) {
    // NOTE(radi): In some operating systems (OSX, CrOS), the query will be
    // executed against the window holding the browser action. In such
    // situations we'll provide the last used tab.
    callback(this.lastTabId_);
    return;
  } else {
    this.lastTabId_ = opt_tabId;
    chrome.tabs.executeScript(opt_tabId, {
      file: 'helper_binary.js'
    }, function() {
      setTimeout(function() {
        callback(/** @type {number} */ (opt_tabId));
      }, ext.Launcher.HELPER_CALLBACK_DELAY);
    });
  }
};


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
ext.ExtensionLauncher.prototype.getSelectedContent =
    function(callback, errorCallback, opt_tabId) {
  this.getWebsiteTab(goog.bind(function(tabId) {
    chrome.tabs.sendMessage(tabId, {
      enableLookingGlass: this.preferences_.isLookingGlassEnabled()
    }, function(response) {
      if (arguments.length == 0 && chrome.runtime.lastError) {
        errorCallback(new Error(chrome.runtime.lastError.message));
      } else if (response instanceof Error) {
        errorCallback(response);
      } else {
        if (goog.isObject(response)) {
          response.tabId = tabId;
        }
        callback(response);
      }
    });
  }, this), opt_tabId);
};


/** @override */
ext.ExtensionLauncher.prototype.updateSelectedContent =
    function(content, recipients, origin, expectMoreUpdates, callback,
    errorCallback, opt_subject, opt_tabId) {
  this.getWebsiteTab(goog.bind(function(tabId) {
    chrome.tabs.sendMessage(tabId, {
      value: content,
      response: true,
      detach: !Boolean(expectMoreUpdates),
      origin: origin,
      recipients: recipients,
      subject: opt_subject
    }, function(response) {
      if (arguments.length == 0 && chrome.runtime.lastError) {
        errorCallback(new Error(chrome.runtime.lastError.message));
      } else if (response instanceof Error) {
        errorCallback(response);
      } else {
        callback(response);
      }
    });
  }, this), opt_tabId);
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
 * @param {!goog.storage.mechanism.IterableMechanism} storage
 * @constructor
 * @extends {ext.Launcher}
 */
ext.AppLauncher = function(storage) {
  ext.AppLauncher.base(this, 'constructor', storage);
  this.webViewChannel = {
    send: function(ignored) {
      return e2e.async.Result.toError(new Error('Not implemented'));
    }
  };
  chrome.app.runtime.onLaunched.addListener(function() {
    // TODO(evn): This should be webview.html rather than prompt.html
    chrome.app.window.create('prompt.html', {
      innerBounds: {
        width: 680,
        height: 480
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
ext.AppLauncher.prototype.getSelectedContent =
    function(callback, errorCallback, opt_tabId) {
  this.webViewChannel.send({
    enableLookingGlass: this.preferences_.isLookingGlassEnabled()
  }).addCallback(function(response) {
    if (arguments.length == 0 && chrome.runtime.lastError) {
      errorCallback(new Error(chrome.runtime.lastError.message));
    } else {
      callback(response);
    }
  }).addErrback(function(error) {
    errorCallback(error);
  });
};


/** @override */
ext.AppLauncher.prototype.updateSelectedContent =
    function(content, recipients, origin, expectMoreUpdates, callback,
    errorCallback, opt_subject, opt_tabId) {
  this.webViewChannel.send({
    value: content,
    response: true,
    detach: !Boolean(expectMoreUpdates),
    origin: origin,
    recipients: recipients,
    subject: opt_subject
  }).addCallback(function(response) {
    if (arguments.length == 0 && chrome.runtime.lastError) {
      errorCallback(new Error(chrome.runtime.lastError.message));
    } else {
      callback(response);
    }
  }).addErrback(function(error) {
    errorCallback(error);
  });
};


/** @override */
ext.AppLauncher.prototype.createWindow = function(url, isForeground, callback) {
  chrome.app.window.create(url, {
    focused: isForeground
  }, callback);
};

});  // goog.scope
