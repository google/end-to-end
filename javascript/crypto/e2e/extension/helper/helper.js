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
 * @fileoverview A content script that allows interaction with the page where
 * End-To-End is to be used.
 */

goog.provide('e2e.ext.Helper');

goog.require('e2e.ext.constants');
goog.require('e2e.ext.gmonkey');
goog.require('e2e.ext.messages');
goog.require('e2e.ext.ui.GlassWrapper');
goog.require('e2e.ext.utils.text');
goog.require('e2e.openpgp.asciiArmor');
goog.require('goog.Disposable');
goog.require('goog.Uri');
goog.require('goog.asserts');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.events.Key');
goog.require('goog.html.utils');
goog.require('goog.string');
goog.require('goog.string.format');
goog.require('goog.structs.Map');

goog.scope(function() {
var ext = e2e.ext;
var constants = ext.constants;
var gmonkey = ext.gmonkey;
var messages = ext.messages;
var ui = ext.ui;
var utils = e2e.ext.utils;



/**
 * Constructor for the Helper class.
 * @constructor
 * @extends {goog.Disposable}
 */
ext.Helper = function() {
  goog.base(this);

  /**
   * The URL of the current page.
   * @type {!goog.Uri}
   * @private
   */
  this.currentUri_ = new goog.Uri(window.location.href);

  /**
   * The handler to get the value of the selected element.
   * @type {function(...)}
   * @private
   */
  this.getValueHandler_ = goog.bind(this.getSelectedContent_, this);
};
goog.inherits(ext.Helper, goog.Disposable);


/**
 * The handler to set a new value into the selected element.
 * @type {function(...)}
 * @private
 */
ext.Helper.prototype.setValueHandler_ = goog.nullFunction;


/**
 * The key that corresponds to the event listener attached to Gmail's active
 * view element.
 * @type {goog.events.Key}
 * @private
 */
ext.Helper.prototype.activeViewListenerKey_ = null;


/**
 * A flag indicating whether the helper has already executed or not.
 * @type {boolean}
 * @private
 */
ext.Helper.prototype.executed_ = false;


/** @override */
ext.Helper.prototype.disposeInternal = function() {
  if (this.getValueHandler_ != goog.nullFunction) {
    chrome.runtime.onMessage.removeListener(this.getValueHandler_);
    this.getValueHandler_ = goog.nullFunction;
  }

  if (this.setValueHandler_ != goog.nullFunction) {
    chrome.runtime.onMessage.removeListener(this.setValueHandler_);
    this.setValueHandler_ = goog.nullFunction;
  }

  if (this.activeViewListenerKey_) {
    goog.events.unlistenByKey(this.activeViewListenerKey_);
    this.activeViewListenerKey_ = null;
  }

  goog.base(this, 'disposeInternal');
};


/**
 * Returns the element that is currently in focus on the page.
 * @return {Element} the active element on the page.
 * @private
 */
ext.Helper.prototype.getActiveElement_ = function() {
  var activeElement = document.activeElement;
  try {
    while (activeElement.contentDocument) {
      activeElement = activeElement.contentDocument.activeElement;
    }
  } catch (e) {}

  return activeElement;
};


/**
 * Returns the current selection that the user has made on the page.
 * @return {string} the current selection on the page.
 * @private
 */
ext.Helper.prototype.getSelection_ = function() {
  var currentView =
      this.getActiveElement_().ownerDocument.defaultView || window;
  return currentView.getSelection().toString();
};


/**
 * Indicates if an element is editable.
 * @param {Element} elem The element to check.
 * @return {boolean} True if the element is editable.
 * @private
 */
ext.Helper.prototype.isEditable_ = function(elem) {
  return elem.value !== undefined || elem.contentEditable == 'true';
};


/**
 * Sets the value into the active element.
 * @param {Element} elem The element where the value must be set.
 * @param {messages.BridgeMessageResponse} msg The response bridge message from
 *     the extension.
 * @private
 */
ext.Helper.prototype.setValue_ = function(elem, msg) {
  if (msg.response && msg.origin == this.getOrigin_()) {
    elem.value = msg.value;
    elem.innerText = msg.value;
  }
  if (msg.detach) {
    chrome.runtime.onMessage.removeListener(this.setValueHandler_);
    this.setValueHandler_ = goog.nullFunction;
  }
};


/**
 * Sets the recipients and message body into a Gmail compose window.
 * @param {messages.BridgeMessageResponse} msg The response bridge message from
 *     the extension.
 * @private
 */
ext.Helper.prototype.setGmailValue_ = function(msg) {
  if (msg.response && msg.origin == this.getOrigin_()) {
    gmonkey.setActiveDraft(msg.recipients, msg.value);
  }

  chrome.runtime.onMessage.removeListener(this.setValueHandler_);
  this.setValueHandler_ = goog.nullFunction;
};


/**
 * Runs the extension helper (which actually runs inside a content script) once.
 */
ext.Helper.prototype.runOnce = function() {
  chrome.runtime.onMessage.addListener(this.getValueHandler_);

  if (this.isGmail_() && !window.ENABLED_LOOKING_GLASS) {
    this.activeViewListenerKey_ = goog.events.listen(
        document.body,
        goog.events.EventType.CLICK,
        this.enableLookingGlass_,
        true,
        this);

    /** @type {boolean} */
    window.ENABLED_LOOKING_GLASS = true;
  }
};


/**
 * Retrieves the selected content by the user.
 * @param {*} req The request to get the user-selected content.
 * @param {!MessageSender} sender The sender of the initialization request.
 * @param {function(*)} callback A callback to pass the selected content to.
 * @private
 */
ext.Helper.prototype.getSelectedContent_ = function(req, sender, callback) {
  // TODO(radi): Split into smaller methods.
  if (this.executed_) {
    goog.dispose(this);
    return;
  } else {
    this.executed_ = true;
  }

  var selectionRequest = /** @type {!messages.GetSelectionRequest} */ (req);
  var activeElem = this.getActiveElement_();
  var selection = this.getSelection_() || activeElem.value || '';
  var recipients = [];

  if (!Boolean(this.getSelection_()) && this.isGmail_()) {
    this.attachSetValueHandler_(goog.bind(this.setGmailValue_, this));

    gmonkey.hasActiveDraft(goog.bind(function(hasDraft) {
      if (hasDraft) {
        gmonkey.getActiveDraft(goog.bind(function(recipients, msgBody) {
          var selectionBody =
              e2e.openpgp.asciiArmor.extractPgpBlock(msgBody);
          if (utils.text.getPgpAction(selectionBody, true) ==
              constants.Actions.ENCRYPT_SIGN) {
            selectionBody = goog.html.utils.stripHtmlTags(selectionBody);
          }

          callback({
            action: constants.Actions.ENCRYPT_SIGN,
            selection: selectionBody,
            recipients: recipients,
            request: true,
            origin: this.getOrigin_(),
            canInject: true
          });
        }, this));
      } else {
        gmonkey.getCurrentMessage(goog.bind(function(messageElem) {
          var selectionBody = selection;

          if (messageElem) {
            selectionBody = e2e.openpgp.asciiArmor.extractPgpBlock(
                goog.isDef(messageElem.lookingGlass) ?
                messageElem.lookingGlass.getOriginalContent() :
                messageElem.innerText);
          }

          var action = utils.text.getPgpAction(selectionBody, true);
          if (messageElem && !goog.isDef(messageElem.lookingGlass) &&
              action == constants.Actions.DECRYPT_VERIFY) {
            var glass = new ui.GlassWrapper(messageElem);
            this.registerDisposable(glass);
            glass.installGlass();

            action = constants.Actions.NO_OP;
          }

          callback({
            action: action,
            selection: selectionBody,
            recipients: recipients,
            request: true,
            origin: this.getOrigin_(),
            canInject: true
          });

        }, this));
      }
    }, this));
  } else {

    var canInject = this.isEditable_(activeElem);
    if (canInject && selectionRequest.editableElem) {
      this.attachSetValueHandler_(goog.bind(this.setValue_, this, activeElem));
    }

    if (selection.length == 0 && canInject) {
      selection = activeElem.innerText;
    }

    callback({
      selection: selection,
      recipients: recipients,
      request: true,
      origin: this.getOrigin_(),
      canInject: canInject
    });
  }

  chrome.runtime.onMessage.removeListener(this.getValueHandler_);
  return true;
};


/**
 * Attaches a handler to enable the setting of values inside the page.
 * @param {!function(...)} handler The handler to use when setting values inside
 *     the page.
 * @private
 */
ext.Helper.prototype.attachSetValueHandler_ = function(handler) {
  if (this.setValueHandler_) {
    chrome.runtime.onMessage.removeListener(this.setValueHandler_);
  }

  this.setValueHandler_ = handler;
  chrome.runtime.onMessage.addListener(this.setValueHandler_);
};


/**
 * Enables the looking glass for the current message in Gmail.
 * @private
 */
ext.Helper.prototype.enableLookingGlass_ = function() {
  if (!this.isGmail_()) {
    return;
  }

  gmonkey.getCurrentMessage(goog.bind(function(messageElem) {
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
  return this.currentUri_.getDomain() == 'mail.google.com';
};


/**
 * Returns the origin for the current page.
 * @return {string} The origin for the current page.
 * @private
 */
ext.Helper.prototype.getOrigin_ = function() {
  var origin = goog.string.format(
      '%s://%s', this.currentUri_.getScheme(), this.currentUri_.getDomain());

  if (this.currentUri_.hasPort()) {
    origin = goog.string.format(
        '%s:%s', origin, /** @type {number} */ (this.currentUri_.getPort()));
  }

  return origin;
};

}); // goog.scope

// Create the helper and start it.
if (!!chrome.extension) {
  /** @type {!e2e.ext.Helper} */
  window.helper = new e2e.ext.Helper();
  window.helper.runOnce();
}
