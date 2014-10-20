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
 * @fileoverview Defines the common characteristics of an End-to-End action.
 */

goog.provide('e2e.ext.actions.Action');

/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.ext.messages.ApiRequest');

goog.scope(function() {
var actions = e2e.ext.actions;



/**
 * Interface that defines the common characteristics of an End-to-End action.
 * @interface
 * @template REQUEST_CONTENT, RESPONSE_CONTENT
 */
actions.Action = function() {};


/**
 * Executes the action.
 * @param {!e2e.openpgp.ContextImpl} ctx A PGP context that can be used to
 *     complete the action.
 * @param {!e2e.ext.messages.ApiRequest.<REQUEST_CONTENT>} request The content
 *     with which the action is to be executed.
 * @param {!goog.ui.Component} requestor The UI component through which the
 *     action was invoked.
 * @param {!function(RESPONSE_CONTENT)} callback A callback where successful
 *     results will be passed to.
 * @param {!function(Error)} errorCallback A callback where errors will be
 *     passed to.
 */
actions.Action.prototype.execute;

});  // goog.scope
