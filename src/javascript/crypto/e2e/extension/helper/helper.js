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
goog.require('e2e.ext.gmonkey');
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
 * @param {!e2e.ext.gmonkey} gmonkey Gmonkey instance to use
 * @extends {goog.Disposable}
 */
ext.Helper = function(gmonkey) {
  goog.base(this);

  /**
   * The handler to get the value of the selected element.
   * @type {function(...)}
   * @private
   */
  this.boundMessageHandler_ = goog.bind(this.handleMessage_, this);

  /**
   * @type {!e2e.ext.gmonkey} Gmonkey instance to send queries through.
   * @private
   */
  this.gmonkey_ = gmonkey;

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
 * @private
 */
ext.Helper.prototype.handleMessage_ = function(req, sender, sendResponse) {
  if (goog.object.containsKey(req, 'enableLookingGlass')) {
    this.getSelectedContent_(req, sendResponse);
  } else if (goog.object.containsKey(req, 'value')) {
    this.setValue_(req, sendResponse);
  }
  return true; // Returns true to mark that the response is sent anynchronously.
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
 * @param {!function(boolean)} sendResponse Function sending back the response.
 * @private
 */
ext.Helper.prototype.setValue_ = function(msg, sendResponse) {
  this.gmonkey_.updateSelectedContent(msg.recipients, msg.value, sendResponse);
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
 * @param {!function(e2e.ext.messages.BridgeMessageRequest)} sendResponse
 *     Function sending back the response.
 * @private
 */
ext.Helper.prototype.getSelectedContent_ = function(req, sendResponse) {
  if (req.enableLookingGlass) {
    this.startGlassListener_();
  }

  var origin = this.getOrigin_();

  this.gmonkey_.getSelectedContent(function(recipients, msgBody, canInject) {
    var selectionBody =
        e2e.openpgp.asciiArmor.extractPgpBlock(msgBody);
    var action = utils.text.getPgpAction(selectionBody, true);
    // Send response back to the extension.
    var response = /** @type {e2e.ext.messages.BridgeMessageRequest} */ ({
      selection: selectionBody,
      recipients: recipients,
      action: action,
      request: true,
      origin: origin,
      canInject: Boolean(canInject)
    });
    sendResponse(response);
  });
};


/**
 * Enables the looking glass for the current message in Gmail.
 * @private
 */
ext.Helper.prototype.enableLookingGlass_ = function() {
  if (!this.isGmail_()) {
    return;
  }

  this.gmonkey_.getCurrentMessage(goog.bind(function(messageElemId) {
    var messageElem = document.getElementById(messageElemId);
    if (!messageElem || Boolean(messageElem.lookingGlass)) {
      return;
    }
    var selectionBody = e2e.openpgp.asciiArmor.extractPgpBlock(
        messageElem.innerText);
    var action = utils.text.getPgpAction(selectionBody, true);
    if (action == constants.Actions.DECRYPT_VERIFY) {
      var glass = new ui.GlassWrapper(messageElem);
      this.registerDisposable(glass);
      glass.installGlass();
    }
  }, this));
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

});  // goog.scope

// Create the helper and start it.
if (!!chrome.extension && !goog.isDef(window.helper)) {
  /** @type {!e2e.ext.Helper} */
  window.helper = new e2e.ext.Helper(new e2e.ext.gmonkey());
}
