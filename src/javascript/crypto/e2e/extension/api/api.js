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
 *
 * @fileoverview Provides context APIs that all parts (e.g. browser actions,
 * other extension pages, content scripts, etc.) of the extension can use.
 *
 */

goog.provide('e2e.ext.api.Api');

goog.require('e2e.async.Result');
goog.require('e2e.ext.actions.Executor');
goog.require('e2e.ext.api.RequestThrottle');
goog.require('e2e.ext.constants.Actions');
/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.ext.messages.ApiRequest');
goog.require('goog.ui.Component');

goog.scope(function() {
var api = e2e.ext.api;
var constants = e2e.ext.constants;
var messages = e2e.ext.messages;



/**
 * Constructor for the context API.
 * @constructor
 * @extends {goog.ui.Component}
 */
api.Api = function() {
  goog.base(this);

  /**
   * The handler to process incoming requests from other parts of the extension.
   * @type {!function(Port)}
   * @private
   */
  this.requestHandler_ = goog.bind(this.openPort_, this);

  /**
   * A request throttle for incoming decrypt requests.
   * @type {!api.RequestThrottle}
   * @private
   */
  this.requestThrottle_ = new api.RequestThrottle(
      api.Api.REQUEST_THRESHOLD_);

  /**
   * Executor for the End-to-End actions.
   * @type {!e2e.ext.actions.Executor}
   * @private
   */
  this.actionExecutor_ = new e2e.ext.actions.Executor();

};
goog.inherits(api.Api, goog.ui.Component);


/**
 * The number of allowed requests per minute.
 * @type {number}
 * @private
 * @const
 */
api.Api.REQUEST_THRESHOLD_ = 500;


/** @override */
api.Api.prototype.disposeInternal = function() {
  this.removeApi();

  goog.base(this, 'disposeInternal');
};


/**
 * Installs the API.
 */
api.Api.prototype.installApi = function() {
  chrome.runtime.onConnect.addListener(this.requestHandler_);
};


/**
 * Removes the API.
 */
api.Api.prototype.removeApi = function() {
  chrome.runtime.onConnect.removeListener(this.requestHandler_);
};


/**
 * Opens a port with the connecting counterpart.
 * @param {Port} port The port through which communication should carried with
 *     the counterpart.
 * @private
 */
api.Api.prototype.openPort_ = function(port) {
  port.onMessage.addListener(
      goog.bind(this.executeAction_, this, goog.bind(port.postMessage, port)));
};


/**
 * Executes the PGP action and passed the result to the provided callback.
 * @param {function(*)} callback A callback to pass the result of the action to.
 * @param {*} req The execution request.
 * @private
 */
api.Api.prototype.executeAction_ = function(callback, req) {
  var incoming = /** @type {!messages.ApiRequest.<string>} */ (req);
  var outgoing = {
    completedAction: incoming.action
  };

  // Ensure that only certain actions are exposed via the API.
  switch (incoming.action) {
    case constants.Actions.ENCRYPT_SIGN:
    case constants.Actions.DECRYPT_VERIFY:
      // Propagate the decryptPassphrase if needed.
      incoming.passphraseCallback = function(uid) {
        // Note: The passphrase needs to be known when calling executeAction_.
        return e2e.async.Result.toResult(incoming.decryptPassphrase || '');
      };
      break;
    default:
      outgoing.error = chrome.i18n.getMessage('errorUnsupportedAction');
      callback(outgoing);
      return;
  }

  if (window.launcher && !window.launcher.hasPassphrase()) {
    callback({
      error: chrome.i18n.getMessage('glassKeyringLockedError')
    });
    return;
  }

  if (!this.requestThrottle_.canProceed()) {
    outgoing.error = chrome.i18n.getMessage('throttleErrorMsg');
    callback(outgoing);
    return;
  }

  this.actionExecutor_.execute(incoming, this, function(resp) {
    outgoing.content = resp;
    callback(outgoing);
  }, function(error) {
    outgoing.error = chrome.i18n.getMessage(error.messageId);
    callback(outgoing);
  });
};

});  // goog.scope
