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
 * @fileoverview Provides the UI that embeds a website in a <webview> element
 * and provides encryption/decryption capabilities to it.
 */

goog.provide('e2e.ext.ui.WebsiteContainer');

goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.constants.ElementId');
goog.require('e2e.ext.ui.Prompt');
goog.require('e2e.ext.ui.templates.webview');
goog.require('e2e.ext.utils');
goog.require('e2e.ext.utils.WebviewHelperProxy');
goog.require('e2e.ext.utils.action');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.object');
goog.require('goog.ui.Component');
goog.require('soy');


goog.scope(function() {
var ext = e2e.ext;
var ui = e2e.ext.ui;
var constants = e2e.ext.constants;
var templates = e2e.ext.ui.templates.webview;
var utils = e2e.ext.utils;



/**
 * Embeds a website in a Webview element.
 * @constructor
 * @extends {goog.ui.Component}
 * @param {string} startUrl URL to load in a webview.
 */
ui.WebsiteContainer = function(startUrl) {
  goog.base(this);
  /**
   * Helper proxy attached to the displayed Webview.
   * @type {e2e.ext.utils.WebviewHelperProxy}
   * @private
   */
  this.helperProxy_ = null;
  /**
   * Prompt object.
   * @type {ui.Prompt}
   * @private
   */
  this.prompt_ = null;
  /**
   * Bound focus stealer.
   * @type {function(!Event)}
   * @private
   */
  this.boundFocusStealer_ = goog.bind(this.focusStealerListener_, this);
  /**
   * True iff interaction with the web application in webview is suppressed.
   * @type {!boolean}
   * @private
   */
  this.interactionSuppressed_ = false;
  /**
   * True iff the toggle suppress key is currently down.
   * @type {!boolean}
   * @private
   */
  this.toggleInteractionSuppressKeyDown_ = false;
  /**
   * URL to load in a webview.
   * @type {string}
   * @private
   */
  this.startUrl_ = startUrl;
};
goog.inherits(ui.WebsiteContainer, goog.ui.Component);


/**
 * Types of events that are captured when interaction with the webview is
 * suppressed.
 * @type {!Array<!goog.events.EventType>}
 */
ui.WebsiteContainer.capturedEventTypes = [
  goog.events.EventType.KEYPRESS,
  goog.events.EventType.KEYDOWN,
  goog.events.EventType.KEYUP,
  goog.events.EventType.FOCUS
];


/** @override */
ui.WebsiteContainer.prototype.createDom = function() {
  goog.base(this, 'createDom');
  this.decorateInternal(this.getElement());
};


/** @override */
ui.WebsiteContainer.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);
  soy.renderElement(elem, templates.main, {});
  var webview = /** @type {!Webview} */ (
      goog.dom.getElement(constants.ElementId.WEBVIEW));
  webview.addEventListener('newwindow',
      goog.bind(this.webviewNewWindowHandler_, this));
  webview.addEventListener('contentload',
      goog.bind(this.enterInteractionSuppressedMode_, this));
  var toggleListenter = goog.bind(this.toggleKeyListenener_, this);
  document.body.addEventListener(
      goog.events.EventType.KEYDOWN,
      toggleListenter,
      true);
  document.body.addEventListener(
      goog.events.EventType.KEYUP,
      toggleListenter,
      true);

  webview.src = this.startUrl_;
  this.helperProxy_ = new e2e.ext.utils.WebviewHelperProxy(false, webview);
  this.helperProxy_.setWebsiteRequestHandler(goog.bind(
      this.handleWebsiteRequest_, this));
  this.getHandler().listen(
      goog.dom.getElement('show-prompt'),
      goog.events.EventType.CLICK,
      goog.bind(this.togglePrompt_, this)
  );
  this.getHandler().listen(
      goog.dom.getElement('options'),
      goog.events.EventType.CLICK,
      goog.bind(this.showSettingsPage_, this)
  );

};


/**
 * Handles incoming web application request.
 * @param {!e2e.ext.messages.BridgeMessageRequest} request Request from the
 *    web application displayed in the webview.
 * @private
 */
ui.WebsiteContainer.prototype.handleWebsiteRequest_ = function(request) {
  if (request.request && goog.object.containsKey(request, 'action')) {
    // This is an openCompose request.
    if (!this.isPromptDisplayed_()) {
      this.openPrompt_(request);
    }
  }
};


/**
 * Opens a new window in the browser tab.
 * @param  {!Event} event The event.
 * @private
 */
ui.WebsiteContainer.prototype.webviewNewWindowHandler_ = function(event) {
  var e = /** type {!chrome.NewWindowEvent} */ (event);
  e.preventDefault();
  var removeWebviewTimeout;
  if (e.targetUrl) {
    if (e.targetUrl == 'about:blank') {
      // Add a temporary webview element, looking for redirection URLs
      var aWebview = /** @type {Webview} */ (document.createElement('webview'));
      document.body.appendChild(aWebview);

      aWebview.request.onBeforeRequest.addListener(function(event) {
        var response = /** @type {!BlockingResponse} */ ({ cancel: false });
        if (event.url == 'about:blank') {
          return response;
        }
        if (event.type !== 'main_frame') {
          return response;
        }
        clearTimeout(removeWebviewTimeout);
        document.body.removeChild(aWebview);
        // Create a new tab in the browser.
        window.open(event.url);
        response.cancel = true;
        return response;
      }, /** @type {!RequestFilter} */ ({urls: ['*://*/*'] }), ['blocking']);
      e.window.attach(aWebview);
      removeWebviewTimeout = setTimeout(function() {
        document.body.removeChild(aWebview);
      }, 5000); // Remove dangling webviews.
    } else {
      window.open(e.targetUrl);
    }
  }
};


/**
 * Toggles the prompt element.
 * @param  {Event=} opt_event The event.
 * @private
 */
ui.WebsiteContainer.prototype.togglePrompt_ = function(opt_event) {
  if (this.isPromptDisplayed_()) {
    this.closePrompt_();
  } else {
    this.openPrompt_();
  }
};


/**
 * Toggles the prompt element.
 * @param  {Event=} opt_event The event.
 * @private
 */
ui.WebsiteContainer.prototype.showSettingsPage_ = function(opt_event) {
  e2e.ext.utils.action.getLauncher(function(launcher) {
    launcher.createWindow('settings.html', true);
  }, this.displayError_, this);
};


/**
 * Opens the prompt element.
 * @param  {e2e.ext.messages.BridgeMessageRequest=} opt_content Content to
 *    initialize the prompt with.
 * @private
 */
ui.WebsiteContainer.prototype.openPrompt_ = function(opt_content) {
  var promptElement = goog.dom.getElement('prompt');
  this.prompt_ = new e2e.ext.ui.Prompt(
      goog.asserts.assertObject(this.helperProxy_), false);
  if (goog.isDef(opt_content)) {
    this.prompt_.injectContent(opt_content);
  }
  this.prompt_.addOnDisposeCallback(goog.bind(function() {
    goog.dom.classlist.add(promptElement, constants.CssClass.HIDDEN);
  }, this));
  this.addChildAt(this.prompt_, 0, false);
  this.prompt_.render(promptElement);
  goog.dom.classlist.remove(promptElement, constants.CssClass.HIDDEN);
  this.enterInteractionSuppressedMode_();
};


/**
 * Closes the prompt element.
 * @private
 */
ui.WebsiteContainer.prototype.closePrompt_ = function() {
  this.removeChildAt(0, false);
  this.prompt_.dispose();
  this.prompt_ = null;
};


/**
 * Checks if prompt element is visible to the user.
 * @return {boolean} True iff prompt element is displayed.
 * @private
 */
ui.WebsiteContainer.prototype.isPromptDisplayed_ = function() {
  return Boolean(this.prompt_) && !this.prompt_.isDisposed();
};


/**
 * Toggles the interaction suppress mode if the toggle key is tapped.
 * @param  {!Event} event
 * @private
 */
ui.WebsiteContainer.prototype.toggleKeyListenener_ = function(
    event) {
  if (this.isPromptDisplayed_()) {
    return; // Disallow toggling when the prompt is displayed.
  }
  // Detect toggle key.
  if (event instanceof KeyboardEvent) {
    if (event.keyCode == goog.events.KeyCodes.CTRL &&
        (event.keyIdentifier == 'U+00A2' || // OSX
         event.keyIdentifier == 'Control')
        ) { // Left Ctrl
      if (event.type == goog.events.EventType.KEYDOWN) {
        this.toggleInteractionSuppressKeyDown_ = true;
      } else if (event.type == goog.events.EventType.KEYUP &&
          this.toggleInteractionSuppressKeyDown_) {
        this.toggleInteractionSuppressKeyDown_ = false;
        this.toggleInteractionSuppressedMode_();
        return;
      }
    } else {
      this.toggleInteractionSuppressKeyDown_ = false; // Some other key.
    }
  }
};


/**
 * Prevents keypresses from reaching the document in the webview by focusing
 * an invisible element.
 * @param  {!Event} event
 * @private
 */
ui.WebsiteContainer.prototype.focusStealerListener_ = function(event) {
  // Space, Tab, ENTER, ESC, arrow keys.
  var allowedKeycodes = [
    goog.events.KeyCodes.TAB,
    goog.events.KeyCodes.SPACE,
    goog.events.KeyCodes.ENTER,
    goog.events.KeyCodes.ESC,
    goog.events.KeyCodes.LEFT,
    goog.events.KeyCodes.UP,
    goog.events.KeyCodes.RIGHT,
    goog.events.KeyCodes.DOWN
  ];

  if (!(goog.array.contains(allowedKeycodes, event.keyCode))) {
    if (event.type == goog.events.EventType.KEYPRESS) {
      this.notifyOfSuppression_();
    }
    goog.dom.getElement('focus-stealer').focus();
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
};


/**
 * Notifies the user that interaction with the web application was suppressed.
 * @private
 */
ui.WebsiteContainer.prototype.notifyOfSuppression_ = function() {
  if (this.interactionSuppressed_) {
    goog.dom.classlist.add(goog.dom.getElement('webview'), 'blurred');
    if (!this.isPromptDisplayed_()) {
      this.displayError_('interactionSuppressed');
    }
    setTimeout(function() {
      goog.dom.classlist.remove(goog.dom.getElement('webview'), 'blurred');
    }, 100); // Remove the blurring transformation after 100ms.
  }
};


/**
 * Toggles interaction suppression mode.
 * @private
 */
ui.WebsiteContainer.prototype.toggleInteractionSuppressedMode_ = function() {
  if (!this.isPromptDisplayed_()) {
    if (!this.interactionSuppressed_) {
      this.enterInteractionSuppressedMode_();
    } else {
      this.leaveInteractionSuppressedMode_();
    }
  }
};


/**
 * Allows only for limited interaction with the web application in a webview.
 * @private
 */
ui.WebsiteContainer.prototype.enterInteractionSuppressedMode_ = function() {
  if (!this.interactionSuppressed_) {
    goog.array.forEach(ui.WebsiteContainer.capturedEventTypes, function(type) {
      goog.dom.getElement('webview').addEventListener(
          type,
          this.boundFocusStealer_,
          true
      );
    }, this);

    goog.dom.classlist.remove(
        goog.dom.getElement('webview-container'),
        'typing-allowed');
  }
  this.interactionSuppressed_ = true;
  this.clearError_();
};


/**
 * Allows for full interaction with the web application in a webview.
 * @private
 */
ui.WebsiteContainer.prototype.leaveInteractionSuppressedMode_ = function() {
  if (this.interactionSuppressed_) {
    goog.array.forEach(ui.WebsiteContainer.capturedEventTypes, function(type) {
      goog.dom.getElement('webview').removeEventListener(
          type,
          this.boundFocusStealer_,
          true
      );
    }, this);
    goog.dom.classlist.add(
        goog.dom.getElement('webview-container'),
        'typing-allowed');
  }
  this.interactionSuppressed_ = false;
  this.displayError_('interactionEnabled');
};


/**
 * Displays an error message to the user.
 * @param {Error|string} error The error to display.
 * @private
 */
ui.WebsiteContainer.prototype.displayError_ = function(error) {
  var errorDiv = goog.dom.getElement(constants.ElementId.ERROR_DIV);
  if (error) {
    var errorMsg;
    if (goog.isString(error)) {
      errorMsg = chrome.i18n.getMessage(error);
    } else {
      errorMsg = goog.isDef(error.messageId) ?
          chrome.i18n.getMessage(error.messageId) : error.message;
    }
    utils.errorHandler(error);
    errorDiv.textContent = errorMsg;
  } else {
    errorDiv.textContent = '';
  }
};


/**
 * Clears the error message displayed to the user.
 * @private
 */
ui.WebsiteContainer.prototype.clearError_ = function() {
  this.displayError_('');
};


});  // goog.scope
