/**
 * @license
 * Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Implements the looking glass that allows decrypted PGP messages
 * to be securely displayed inside the original web applications.
 */

goog.provide('e2e.ext.ui.Glass');

goog.require('e2e.ext.constants.Actions');
/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.ext.messages.ApiRequest');
goog.require('e2e.ext.ui.templates.glass');
goog.require('e2e.random');
goog.require('goog.events.MouseWheelHandler');
goog.require('goog.style');
goog.require('goog.ui.Component');
goog.require('soy');

goog.scope(function() {
var constants = e2e.ext.constants;
var messages = e2e.ext.messages;
var templates = e2e.ext.ui.templates.glass;
var ui = e2e.ext.ui;



/**
 * Constructor for the looking glass.
 * @param {string} pgpMessage The encrypted PGP message that needs to be
 *     decrypted and displayed to the user.
 * @constructor
 * @extends {goog.ui.Component}
 */
ui.Glass = function(pgpMessage) {
  goog.base(this);

  /**
   * The encrypted PGP message that needs to be decrypted and displayed to
   * the user.
   * @type {string}
   * @private
   */
  this.pgpMessage_ = pgpMessage;

  /**
   * The communication channel with the extension.
   * @type {Port}
   * @private
   */
  this.port_ = null;
};
goog.inherits(ui.Glass, goog.ui.Component);


/**
 * The offset to use when scrolling up/down.
 * @type {number}
 * @private
 * @const
 */
ui.Glass.prototype.SCROLL_OFFSET_ = 10;


/** @override */
ui.Glass.prototype.disposeInternal = function() {
  if (this.port_) {
    this.port_.disconnect();
    this.port_ = null;
  }

  goog.base(this, 'disposeInternal');
};


/** @override */
ui.Glass.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);

  if (!this.port_) {
    this.port_ = chrome.runtime.connect();
  }

  window.setTimeout(goog.bind(/** @this ui.Glass */ function() {
    if (this.port_) {
      this.port_.postMessage({
        content: this.pgpMessage_,
        action: constants.Actions.DECRYPT_VERIFY
      });
    } else {
      this.renderContents_({
        completedAction: constants.Actions.DECRYPT_VERIFY,
        error: chrome.i18n.getMessage('glassCannotDecrypt')
      });
    }
  }, this), e2e.random.getRandomBytes(1, [0])[0]);

  this.port_.onDisconnect.addListener(goog.bind(function() {
    this.port_ = null;
  }, this));

  this.port_.onMessage.addListener(goog.bind(function(response) {
    window.setTimeout(
        goog.bind(this.renderContents_, this, response),
        e2e.random.getRandomBytes(1, [0])[0]);
  }, this));
};


/**
 * Renders the contents of the looking glass.
 * @param {messages.ApiResponse} response The response from the extension to
 *     render.
 * @private
 */
ui.Glass.prototype.renderContents_ = function(response) {
  var elem = this.getElement();
  soy.renderElement(elem, templates.contentFrame, {
    label: chrome.i18n.getMessage('extName'),
    content: response.content || this.pgpMessage_,
    error: response.error
  });
  var styles = elem.querySelector('link');
  styles.href = chrome.runtime.getURL('glass_styles.css');
};


/** @override */
ui.Glass.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var mouseWheelHandler = new goog.events.MouseWheelHandler(
      this.getElement(), true);
  this.registerDisposable(mouseWheelHandler);

  this.getHandler().listen(
      mouseWheelHandler,
      goog.events.MouseWheelHandler.EventType.MOUSEWHEEL,
      this.scroll_);
};


/**
 * Scrolls the looking glass up/down.
 * @param {goog.events.MouseWheelEvent} evt The mouse wheel event to
 *     scroll up/down.
 * @private
 */
ui.Glass.prototype.scroll_ = function(evt) {
  var fieldset = this.getElement().querySelector('fieldset');
  var position = goog.style.getPosition(fieldset);

  var newY = position.y - evt.deltaY * 5;
  // Set upper boundary.
  newY = Math.min(0, newY);
  // Set lower boundary.
  newY = Math.max(window.innerHeight * -1, newY);

  goog.style.setPosition(fieldset, 0, newY);
};

});  // goog.scope
