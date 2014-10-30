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
goog.provide('e2e.ext.messages.e2ebindDraft');
goog.provide('e2e.ext.messages.e2ebindRequest');
goog.provide('e2e.ext.messages.e2ebindResponse');


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
 *   canInject: boolean
 * }}
 */
messages.BridgeMessageRequest;


/**
 * The message type passed from the extension to a content script when a bridge
 * port is used.
 * @typedef {{
 *   value: string,
 *   response: boolean,
 *   detach: boolean,
 *   origin: string,
 *   recipients: !Array.<string>
 * }}
 */
messages.BridgeMessageResponse;


/**
 * The message type passed to the helper when a request for the current
 * selection is made.
 * @typedef {{
 *   editableElem: boolean,
 *   enableLookingGlass: boolean,
 *   composeGlass: (boolean|undefined)
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


/**
 * Defines the request message from the e2ebind API to a provider and from
 *   provider to e2ebind API.
 * @typedef {{
 *   api: string,
 *   source: string,
 *   action: string,
 *   args: (Object|undefined),
 *   hash: string
 * }}
 */
messages.e2ebindRequest;


/**
 * Defines the response message from the e2ebind API to a provider and from
 *   provider to e2ebind API.
 * @typedef {{
 *   api: string,
 *   source: string,
 *   success: boolean,
 *   action: string,
 *   hash: string,
 *   result: Object
 * }}
 */
messages.e2ebindResponse;


/**
 * Defines e2ebind draft format that the provider receives.
 * @typedef {{
 *   body: string,
 *   to: !Array.<string>,
 *   cc: Array.<string>,
 *   bcc: Array.<string>,
 *   subject: (string|undefined)
 * }}
 */
messages.e2ebindDraft;

});  // goog.scope
