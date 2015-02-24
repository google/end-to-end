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
 * @fileoverview Defines the message formats used throughout the extension.
 */

goog.provide('e2e.ext.messages.ApiRequest');
goog.provide('e2e.ext.messages.ApiResponse');
goog.provide('e2e.ext.messages.BridgeMessageRequest');
goog.provide('e2e.ext.messages.BridgeMessageResponse');
goog.provide('e2e.ext.messages.GetSelectionRequest');


goog.scope(function() {
var messages = e2e.ext.messages;


/**
 * The message type passed from a content script to the extension when a bridge
 * port is used.
 * @typedef {{
 *   selection: string,
 *   recipients: Array.<string>,
 *   action: (e2e.ext.constants.Actions|undefined),
 *   request: boolean,
 *   origin: string,
 *   subject: (string|undefined),
 *   canInject: boolean,
 *   canSaveDraft: boolean
 * }}
 */
messages.BridgeMessageRequest;


/**
 * The message type passed from the extension to a content script when a bridge
 * port is used.
 * @typedef {{
 *   value: string,
 *   response: boolean,
 *   origin: string,
 *   subject: (string|undefined),
 *   send: boolean,
 *   recipients: !Array.<string>
 * }}
 */
messages.BridgeMessageResponse;


/**
 * The message type passed to the helper when a request for the current
 * selection is made.
 * @typedef {{
 *   enableLookingGlass: boolean
 * }}
 */
messages.GetSelectionRequest;



/**
 * Defines a request message to the context API.
 * @interface
 * @template T
 */
messages.ApiRequest = function() {};


/** @type {T} */
messages.ApiRequest.prototype.content;


/** @type {!Array.<string>|undefined} */
messages.ApiRequest.prototype.recipients;


/** @type {!Array.<string>|undefined} */
messages.ApiRequest.prototype.encryptPassphrases;


/** @type {string|undefined} */
messages.ApiRequest.prototype.decryptPassphrase;


/** @type {!function(string, function(string))|undefined} */
messages.ApiRequest.prototype.passphraseCallback;


/** @type {string|undefined} */
messages.ApiRequest.prototype.currentUser;


/** @type {boolean|undefined} */
messages.ApiRequest.prototype.signMessage;


/** @type {e2e.ext.constants.Actions} */
messages.ApiRequest.prototype.action;


/**
 * Defines the response message from the context API.
 * @typedef {{
 *   content: (string|undefined),
 *   completedAction: e2e.ext.constants.Actions,
 *   selectedUid: (string|undefined),
 *   error: (string | undefined),
 *   retry: boolean
 * }}
 */
messages.ApiResponse;

});  // goog.scope
