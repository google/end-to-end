/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
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
 * @fileoverview Provides HelperProxy objects that allow for communicating with
 * content scripts.
 */

goog.provide('e2e.ext.utils.HelperProxy');
goog.provide('e2e.ext.utils.TabsHelperProxy');
goog.provide('e2e.ext.utils.WebviewHelperProxy');

goog.require('e2e.ext.utils.CallbacksMap');
goog.require('goog.asserts');
goog.require('goog.net.XhrIo');



/**
 * Object allowing for communication with a Helper injected into a content
 * script.
 * @param {boolean} isLookingGlassEnabled Indicates whether the looking glass is
 *     enabled.
 * @constructor
 */
e2e.ext.utils.HelperProxy = function(isLookingGlassEnabled) {

  /**
   * @private
   * @type {boolean}
   */
  this.isLookingGlassEnabled_ = isLookingGlassEnabled;
};


/**
 * Delay in ms needed to initialize message listeners in helper.
 * @type {number}
 * @const
 */
e2e.ext.utils.HelperProxy.HELPER_INIT_DELAY = 50;


/**
 * Indicates whether the looking glass feature is enabled.
 * @return {boolean} True if the looking glass is enabled for this HelperProxy.
 */
e2e.ext.utils.HelperProxy.prototype.isLookingGlassEnabled = function() {
  return this.isLookingGlassEnabled_;
};


/**
 * Retrieves the content that the user has selected.
 * @param {!function(...)} callback The callback where the selected content will
 *     be passed.
 * @param {!function(Error)} errorCallback The callback to invoke if an error is
 *     encountered.
 * @expose
 */
e2e.ext.utils.HelperProxy.prototype.getSelectedContent = function(callback,
    errorCallback) {
  this.sendMessage_({
    enableLookingGlass: this.isLookingGlassEnabled()
  }, callback, errorCallback);
};


/**
 * Sets the provided content into the element on the page that the user has
 * selected.
 * Note: This function might not work while debugging the extension.
 * @param {string} content The content to write inside the selected element.
 * @param {!Array.<string>} recipients The recipients of the message.
 * @param {string} origin The web origin where the original message was created.
 * @param {boolean} shouldSend True iff the protected message should be sent
 *     by the web application to the recipients.
 * @param {!function(...)} callback The function to invoke once the content has
 *     been updated.
 * @param {!function(Error)} errorCallback The callback to invoke if an error is
 *     encountered.
 * @param {string=} opt_subject The subject of the message if applicable.
 * @expose
 */
e2e.ext.utils.HelperProxy.prototype.updateSelectedContent =
    function(content, recipients, origin, shouldSend, callback,
    errorCallback, opt_subject) {
  this.sendMessage_({
    value: content,
    response: true,
    send: shouldSend,
    origin: origin,
    recipients: recipients,
    subject: opt_subject
  }, callback, errorCallback);
};


/**
 * Sends the payload to the helper.
 * @param  {*} payload Message payload.
 * @param {!function(...)} callback The function to invoke with the response.
 * @param {!function(Error)} errorCallback Function to invoke on error
 *     conditions.
 * @private
 */
e2e.ext.utils.HelperProxy.prototype.sendMessage_ = function(payload, callback,
    errorCallback)  {
  this.setupConnection(goog.bind(function() {
    this.sendMessageImpl(payload, goog.bind(function(response) {
      if (arguments.length == 0 && chrome.runtime.lastError) {
        errorCallback(new Error(chrome.runtime.lastError.message));
      } else if (response instanceof Error) {
        errorCallback(response);
      } else {
        callback(response);
      }
    }, this), errorCallback);
  }, this), errorCallback);
};


/**
 * Returns an identifier of the remote helper. Used to pass the same helper
 * endpoint parameters to different callers (e.g. in popouts in Chrome
 * Extension).
 * @return {string}
 */
e2e.ext.utils.HelperProxy.prototype.getHelperId = goog.abstractMethod;


/**
 * Finds the current web application and determines if a helper script is
 * running inside of it. If no helper script is running, then one is
 * injected.
 * @param {!function()} callback The function to invoke once the active
 *     tab is found.
 * @param {!function(Error)} errorCallback Function to invoke on error
 *     conditions.
 * @protected
 */
e2e.ext.utils.HelperProxy.prototype.setupConnection = goog.abstractMethod;


/**
 * @param  {*} payload  Payload to send.
 * @param  {function(*)} callback
 * @param {!function(Error)} errorCallback Function to invoke on error
 *     conditions.
 * @protected
 */
e2e.ext.utils.HelperProxy.prototype.sendMessageImpl = goog.abstractMethod;



/**
 * Helper proxy that connects with a helper injected via chrome.tabs API.
 * To be used in a Chrome Extension.
 * @param {boolean} isLookingGlassEnabled Indicates whether the looking glass is
 *     enabled.
 * @param {number=} opt_tabId Tab ID to communicate with. Defaults
 *     to ID of the current tab in a current window.
 * @constructor
 * @extends {e2e.ext.utils.HelperProxy}
 */
e2e.ext.utils.TabsHelperProxy = function(isLookingGlassEnabled,
    opt_tabId) {
  goog.base(this, isLookingGlassEnabled);
  /**
   * @type {number|undefined} Tab ID to connect to.
   * @private
   */
  this.tabId_ = opt_tabId;
};
goog.inherits(e2e.ext.utils.TabsHelperProxy, e2e.ext.utils.HelperProxy);


/** @override */
e2e.ext.utils.TabsHelperProxy.prototype.setupConnection = function(
    callback, errorCallback) {
  if (goog.isDefAndNotNull(this.tabId_)) {
    this.connectToHelper_(callback, errorCallback);
  } else {
    // Query active tab.
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, goog.bind(function(tabs) {
      if (!tabs || tabs.length !== 1) {
        errorCallback(new Error('Cannot determine the active tab.'));
        return;
      }
      var tabId = tabs[0] ? tabs[0].id : undefined;
      this.tabId_ = tabId;
      this.connectToHelper_(callback, errorCallback);
    }, this));
  }
};


/** @override */
e2e.ext.utils.TabsHelperProxy.prototype.sendMessageImpl = function(
    payload, callback, errorCallback) {
  try {
    chrome.tabs.sendMessage(goog.asserts.assertNumber(this.tabId_), payload,
        callback);
  } catch (e) {
    errorCallback(e);
  }
};


/**
 * Connects to the helper, injecting it if the connection has not yet been
 *     setup.
 * @param {!function()} callback The function to invoke once the
 *     connection is established.
 * @param {!function(Error)} errorCallback Function to invoke if error occurred.
 * @private
 */
e2e.ext.utils.TabsHelperProxy.prototype.connectToHelper_ = function(
    callback, errorCallback) {
  // chrome.tabs.executeScript in a view page doesn't call the callback if
  // the injection did not succeed (while it does in the background page).
  // As a workaround, move the actual code injection task into the background
  // page.
  var tabId = /** @type {number} */ (this.tabId_);
  chrome.runtime.getBackgroundPage(function(ignore) {
    chrome.tabs.executeScript(goog.asserts.assertNumber(tabId),
        {code: 'typeof window.helper'},
        function(results) {
          // Assure that code injection was successful.
          if (chrome.runtime.lastError) {
            errorCallback(new Error(chrome.runtime.lastError.message));
            return;
          } else if (!goog.isDef(results)) {
            errorCallback(new Error('Content script injection failed.'));
            return;
          }
          if (results[0] === 'object') { // Helper already present.
            callback();
          } else {
            chrome.tabs.executeScript(tabId, {
              file: 'helper_binary.js'
            }, function() {
              setTimeout(function() {
                callback();
              }, e2e.ext.utils.HelperProxy.HELPER_INIT_DELAY);
            });
          }
        });
  });

};


/** @override */
e2e.ext.utils.TabsHelperProxy.prototype.getHelperId = function() {
  return this.tabId_ ? this.tabId_.toString() : '';
};



/**
 * Helper proxy that connects to a helper injected into a given Webview
 * element.
 * To be used in a Chrome App.
 * @param {boolean} isLookingGlassEnabled Indicates whether the looking glass is
 *     enabled.
 * @param {!Webview} webview Webview to communicate with.
 * @constructor
 * @extends {e2e.ext.utils.HelperProxy}
 */
e2e.ext.utils.WebviewHelperProxy = function(isLookingGlassEnabled,
    webview) {
  goog.base(this, isLookingGlassEnabled);
  /**
   * The Webview element to communicate with.
   * @type {!Webview}
   * @private
   */
  this.webview_ = webview;

  /**
   * Object storing response callbacks for API calls in progress
   * @type {!e2e.ext.utils.CallbacksMap}
   * @private
   */
  this.pendingCallbacks_ = new e2e.ext.utils.CallbacksMap();

  /**
   * @private
   * @type {function(*,MessageSender):undefined}
   */
  this.boundListener_ = goog.bind(this.helperMessageListener_, this);
  /**
   * Handler processing requests from the web application. Set to null to
   * disable handling web application requests.
   * @type {?function(!e2e.ext.messages.BridgeMessageRequest)}
   * @private
   */
  this.websiteRequestHandler_ = null;
};
goog.inherits(e2e.ext.utils.WebviewHelperProxy, e2e.ext.utils.HelperProxy);


/** @override */
e2e.ext.utils.WebviewHelperProxy.prototype.setupConnection = function(
    callback, errorCallback) {
  if (goog.isDefAndNotNull(this.webview_)) {
    this.connectToHelper_(callback);
  }
};


/** @override */
e2e.ext.utils.WebviewHelperProxy.prototype.sendMessageImpl = function(
    payload, callback, errorCallback) {
  var requestId = this.pendingCallbacks_.addCallbacks(callback, errorCallback);
  this.webview_.executeScript({code: 'helper.handleAppRequest(' +
        JSON.stringify(payload) + ',' + JSON.stringify(requestId) + ')'});
};


/**
 * Sets the function to process the website-originating requests.
 * @param {?function(!e2e.ext.messages.BridgeMessageRequest)} requestHandler
 *    Handler processing requests from the web application.
 */
e2e.ext.utils.WebviewHelperProxy.prototype.setWebsiteRequestHandler = function(
    requestHandler) {
  this.websiteRequestHandler_ = requestHandler;
};


/**
 * Processes message sent by the helper, calling appropriate response callbacks.
 * @param  {*} message Received message.
 * @param  {MessageSender} sender The sender.
 * @private
 */
e2e.ext.utils.WebviewHelperProxy.prototype.helperMessageListener_ = function(
    message, sender) {
  if (sender.id !== chrome.runtime.id) {
    return;
  }
  // Request from the web application.
  if (message.request && goog.isFunction(this.websiteRequestHandler_)) {
    this.websiteRequestHandler_(
        /** @type {!e2e.ext.messages.BridgeMessageRequest} */ (message));
    return;
  }
  // Response from the web application.
  if (!message.requestId ||
      !this.pendingCallbacks_.containsKey(message.requestId)) {
    return;
  }
  var callbacks = this.pendingCallbacks_.getAndRemove(message.requestId);
  callbacks.callback(message.response);
};


/**
 * Connects to the helper, injecting it if the connection has not yet been
 *     setup.
 * @param {!function()} callback The function to invoke once the
 *     connection is established.
 * @private
 */
e2e.ext.utils.WebviewHelperProxy.prototype.connectToHelper_ = function(
    callback) {
  this.webview_.executeScript({code: 'typeof window.helper'}, goog.bind(
      function(results) {
        if (!chrome.runtime.onMessage.hasListener(this.boundListener_)) {
          chrome.runtime.onMessage.addListener(this.boundListener_);
        }
        if (results[0] === 'object') { // Helper already present.
          callback();
        } else {
          this.webview_.executeScript({
            file: 'helper_binary.js'
          }, goog.bind(function() {
            // NOTE(koto): A workaround - send gmonkeystub to the helper,
            // as in a Chrome App the helper cannot access chrome-extension://
            // URLs.
            setTimeout(goog.bind(this.sendStubToHelper_, this, 'gmonkeystub.js',
            callback), e2e.ext.utils.HelperProxy.HELPER_INIT_DELAY);
          }, this));
        }
      }, this));
};


/**
 * Send to the Helper the contents of a given stub file to inject into the web
 * application.
 * @param {string} stubUrl URL of the stub file.
 * @param {function()} callback The function to invoke when stub
 *     contents has been sent.
 * @private
 */
e2e.ext.utils.WebviewHelperProxy.prototype.sendStubToHelper_ = function(stubUrl,
    callback) {
  goog.net.XhrIo.send(stubUrl, goog.bind(function(ev) {
    var contents = ev.target.getResponseText();
    this.webview_.executeScript({code: 'helper.setApiStub(' +
          JSON.stringify(stubUrl) + ',' + JSON.stringify(contents) + ')'},
        callback);
  }, this));
};


/** @override */
e2e.ext.utils.WebviewHelperProxy.prototype.getHelperId = function() {
  return 'webview';
};
