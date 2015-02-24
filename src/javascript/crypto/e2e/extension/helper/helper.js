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
 * @fileoverview A content script that allows interaction with the page where
 * End-To-End is to be used.
 */

goog.provide('e2e.ext.Helper');

goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.ui.GlassWrapper');
goog.require('e2e.ext.utils.text');
goog.require('e2e.openpgp.asciiArmor');
goog.require('goog.Disposable');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.object');


goog.scope(function() {
var ext = e2e.ext;
var constants = ext.constants;
var messages = ext.messages;
var ui = ext.ui;
var utils = e2e.ext.utils;



/**
 * Constructor for the Helper class.
 * @constructor
 * @param {!e2e.ext.WebsiteApi} api Website API connector instance to use
 * @extends {goog.Disposable}
 */
ext.Helper = function(api) {
  goog.base(this);

  /**
   * The handler to get the value of the selected element.
   * @type {function(...)}
   * @private
   */
  this.boundMessageHandler_ = goog.bind(this.handleMessage_, this);

  /**
   * @type {!e2e.ext.WebsiteApi} Website API connector instance to send queries
   *     through.
   * @private
   */
  this.api_ = api;

  chrome.runtime.onMessage.addListener(this.boundMessageHandler_);
};
goog.inherits(ext.Helper, goog.Disposable);


/**
 * The key that corresponds to the event listener attached to Gmail's active
 * view element.
 * @type {goog.events.Key}
 * @private
 */
ext.Helper.prototype.activeViewListenerKey_ = null;


/**
 * Handles messages sent from the extension.
 * @param {!e2e.ext.messages.GetSelectionRequest|
 *     !e2e.ext.messages.BridgeMessageResponse} req The request.
 * @param {!MessageSender} sender The sender of the request.
 * @param {!function(*)} sendResponse A callback function sending the response
 *     back.
 * @return {boolean} Returns true to mark that the response is sent
 *     asynchronously.
 * @private
 */
ext.Helper.prototype.handleMessage_ = function(req, sender, sendResponse) {
  if (goog.object.containsKey(req, 'enableLookingGlass')) {
    this.getSelectedContent_(req, sendResponse);
  } else if (goog.object.containsKey(req, 'value')) {
    this.setValue_(req, sendResponse);
  }
  return true;
};


/** @override */
ext.Helper.prototype.disposeInternal = function() {
  chrome.runtime.onMessage.removeListener(this.boundMessageHandler_);

  if (this.activeViewListenerKey_) {
    goog.events.unlistenByKey(this.activeViewListenerKey_);
    this.activeViewListenerKey_ = null;
  }

  goog.base(this, 'disposeInternal');
};


/**
 * Sets the value into the active element.
 * @param {e2e.ext.messages.BridgeMessageResponse} msg The response bridge
 *     message from the extension.
 * @param {!function(boolean)|!function(Error)} sendResponse Function sending
 *     back the response.
 * @private
 */
ext.Helper.prototype.setValue_ = function(msg, sendResponse) {
  this.api_.updateSelectedContent(msg.recipients, msg.value, msg.send,
      sendResponse, goog.bind(this.errorHandler_, this, sendResponse),
      msg.subject);
};


/**
 * Attaches click listener enabling a looking glass for current message in
 *     Gmail.
 * @private
 */
ext.Helper.prototype.startGlassListener_ = function() {
  if (this.isGmail_() && !window.ENABLED_LOOKING_GLASS) {
    this.activeViewListenerKey_ = goog.events.listen(
        document.body,
        goog.events.EventType.CLICK,
        this.enableLookingGlass_,
        true,
        this);
  }

  /** @type {boolean} */
  window.ENABLED_LOOKING_GLASS = true;
};


/**
 * Retrieves OpenPGP content selected by the user.
 * @param {!e2e.ext.messages.GetSelectionRequest} req The request to get the
 *     user-selected content.
 * @param {!function(e2e.ext.messages.BridgeMessageRequest)|!function(Error)}
 *     sendResponse Function sending back the response.
 * @private
 */
ext.Helper.prototype.getSelectedContent_ = function(req, sendResponse) {
  if (req.enableLookingGlass) {
    this.startGlassListener_();
  }

  var origin = this.getOrigin_();

  this.api_.getSelectedContent(function(recipients, msgBody, canInject,
      msgSubject) {
        var selectionBody =
            e2e.openpgp.asciiArmor.extractPgpBlock(msgBody);
        var action = utils.text.getPgpAction(selectionBody);
        // Send response back to the extension.
        var response = /** @type {e2e.ext.messages.BridgeMessageRequest} */ ({
          selection: selectionBody,
          recipients: recipients,
          action: action,
          request: true,
          origin: origin,
          subject: msgSubject,
          canInject: Boolean(canInject),
          canSaveDraft: Boolean(canInject)
        });
        sendResponse(response);
      }, goog.bind(this.errorHandler_, this, sendResponse));
};


/**
 * Enables the looking glass for the current message in Gmail.
 * @private
 */
ext.Helper.prototype.enableLookingGlass_ = function() {
  if (!this.isGmail_()) {
    return;
  }

  this.api_.getCurrentMessage(goog.bind(function(messageElemSelector) {
    try {
      var messageElem = document.querySelector(messageElemSelector);
      if (!messageElem || Boolean(messageElem.lookingGlass)) {
        return;
      }
    } catch (e) { // document.querySelector might throw.
      return;
    }
    var selectionBody = e2e.openpgp.asciiArmor.extractPgpBlock(
        messageElem.innerText);
    var action = utils.text.getPgpAction(selectionBody);
    if (action == constants.Actions.DECRYPT_VERIFY) {
      var glass = new ui.GlassWrapper(messageElem);
      this.registerDisposable(glass);
      glass.installGlass();
    }
  }, this), goog.bind(this.errorHandler_, this, goog.nullFunction));
};


/**
 * Indicates if the current web app is Gmail.
 * @return {boolean} True if Gmail. Otherwise false.
 * @private
 */
ext.Helper.prototype.isGmail_ = function() {
  return utils.text.isGmailOrigin(this.getOrigin_());
};


/**
 * Returns the origin for the current page.
 * @return {string} The origin for the current page.
 * @private
 */
ext.Helper.prototype.getOrigin_ = function() {
  return window.location.origin;
};


/**
 * Error handler, sending the error response back to the caller.
 * @param  {!function(*)} sendResponse Function sending the response.
 * @param  {Error} error Error to send.
 * @private
 */
ext.Helper.prototype.errorHandler_ = function(sendResponse, error) {
  console.error(error);
  sendResponse(error);
};


/**
 * Handles requests sent from the Chrome App (Chrome App calls this function
 * directly).
 * @param {!e2e.ext.messages.GetSelectionRequest|
 *     !e2e.ext.messages.BridgeMessageResponse} req The request.
 * @param {string} requestId Identifier of the request to send it back in the
 *     response.
 * @expose
 */
ext.Helper.prototype.handleAppRequest = function(req, requestId) {
  // NOTE(koto): We pass an empty sender object. handleMessage_ does not
  // validate the sender anyway, as it's only listening for messages from the
  // current extension/app only.
  this.handleMessage_(req, /** @type {!MessageSender} */ ({}),
      goog.partial(this.sendResponse_, requestId));
};


/**
 * Handles success responses to Website API requests sent from the Chrome App
 * (Chrome App calls this function directly).
 * @param {string} requestId The request ID.
 * @param {*} response The response.
 * @expose
 */
ext.Helper.prototype.handleAppResponse = function(requestId, response) {
  this.api_.sendEndToEndResponse(requestId, response);
};


/**
 * Handles error responses to Website API requests sent from the Chrome App
 * (Chrome App calls this function directly).
 * @param {string} requestId The request ID.
 * @param {string} errorMsg Error message.
 * @expose
 */
ext.Helper.prototype.handleAppErrorResponse = function(requestId, errorMsg) {
  this.api_.sendEndToEndErrorResponse(requestId, errorMsg);
};


/**
 * Sends a response to the extension by chrome.runtime.sendMessage
 * @param {string} requestId Request ID
 * @param {*} response Response
 * @private
 */
ext.Helper.prototype.sendResponse_ = function(requestId, response) {
  chrome.runtime.sendMessage(chrome.runtime.id, {
    requestId: requestId,
    response: response
  });
};


/**
 * Sends the request from the web application to the extension.
 * @param  {e2e.ext.WebsiteApi.Request} request
 * @private
 */
ext.Helper.prototype.sendWebsiteRequest_ = function(request) {
  if (goog.object.containsKey(request, 'id') &&
      !goog.object.containsKey(request, 'requestId')) {
    switch (request.call) {
      case 'openCompose':
        chrome.runtime.sendMessage(chrome.runtime.id,
            this.convertOpenComposeRequest_(request));
        break;
    }
  }
};


/**
 * Converts a WebsiteAPI request to BridgeMessageRequest.
 * @param  {e2e.ext.WebsiteApi.Request} request
 * @return {e2e.ext.messages.BridgeMessageRequest} Request
 * @private
 */
ext.Helper.prototype.convertOpenComposeRequest_ = function(request) {
  return /** @type {e2e.ext.messages.BridgeMessageRequest} */ ({
    selection: request.args.body,
    recipients: request.args.recipients,
    action: utils.text.getPgpAction(request.args.body),
    request: true,
    origin: this.getOrigin_(),
    subject: request.args.subject,
    canInject: true,
    canSaveDraft: true
  });
};


/**
 * Enables handling requests from web applications.
 */
ext.Helper.prototype.enableWebsiteRequests = function() {
  this.api_.setWebsiteRequestForwarder(
      goog.bind(this.sendWebsiteRequest_, this));
};


/**
 * Disables handling requests from web applications (the default state).
 */
ext.Helper.prototype.disableWebsiteRequests = function() {
  this.api_.setWebsiteRequestForwarder(null);
};


/**
 * Sets the stub file contents for the Website API object. Used in the
 * Chrome App in which the website cannot access chrome-extension:// URLs.
 * @param {string} stubUrl Stub file URL.
 * @param {string} contents Stub file contents.
 * @expose
 */
ext.Helper.prototype.setApiStub = function(stubUrl, contents) {
  this.api_.setStub(stubUrl, contents);
};


});  // goog.scope
