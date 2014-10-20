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
 * @fileoverview Executes End-to-End actions.
 */

goog.provide('e2e.ext.actions.Executor');

goog.require('e2e.ext.actions.DecryptVerify');
goog.require('e2e.ext.actions.EncryptSign');
goog.require('e2e.ext.actions.GetKeyDescription');
goog.require('e2e.ext.actions.GetKeyringBackupData');
goog.require('e2e.ext.actions.ImportKey');
goog.require('e2e.ext.actions.ListKeys');
goog.require('e2e.ext.actions.RestoreKeyringData');
goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.utils.Error');
goog.require('e2e.ext.utils.action');

goog.scope(function() {
var actions = e2e.ext.actions;
var constants = e2e.ext.constants;
var messages = e2e.ext.messages;
var utils = e2e.ext.utils;



/**
 * Constructor for the action executor.
 * @param {!function(...)=} opt_errorCallback If set, this is the default
 *     callback to call when an error is encountered.
 * @constructor
 */
actions.Executor = function(opt_errorCallback) {

  /**
   * The default callback to call when an error is encountered.
   * @private
   */
  this.errorCallback_ = opt_errorCallback || goog.nullFunction;
};


/**
 * Executes an action of the specified type using the provided request.
 * @param {!messages.ApiRequest} request The input to the action.
 * @param {!goog.ui.Component} requestor The UI component through which the
 *     action was invoked.
 * @param {function(...)=} opt_callback The callback to invoke once the action
 *     completes.
 * @param {function(Error)=} opt_errorCallback The callback to invoke if an
 *     error is encountered. If omitted, the default error callback will be
 *     invoked.
 */
actions.Executor.prototype.execute =
    function(request, requestor, opt_callback, opt_errorCallback) {
  var action = this.getAction_(request.action);
  var callback = opt_callback || goog.nullFunction;
  var errorCallback = opt_errorCallback || this.errorCallback_;

  if (action) {
    utils.action.getContext(function(ctx) {
      try {
        action.execute(ctx, request, requestor, callback, errorCallback);
      } catch (error) {
        errorCallback(error);
      }
    }, errorCallback, this);
  } else {
    errorCallback(new utils.Error(
        'Unsupported End-to-End action.', 'errorUnsupportedAction'));
  }

};


/**
 * Returns the action that corresponds to the provided action type.
 * @param {constants.Actions} actionType The type of the action.
 * @return {actions.Action} The action.
 * @private
 */
actions.Executor.prototype.getAction_ = function(actionType) {
  switch (actionType) {
    case constants.Actions.DECRYPT_VERIFY:
      return new actions.DecryptVerify();
    case constants.Actions.ENCRYPT_SIGN:
      return new actions.EncryptSign();
    case constants.Actions.GET_KEY_DESCRIPTION:
      return new actions.GetKeyDescription();
    case constants.Actions.GET_KEYRING_BACKUP_DATA:
      return new actions.GetKeyringBackupData();
    case constants.Actions.IMPORT_KEY:
      return new actions.ImportKey();
    case constants.Actions.LIST_KEYS:
      return new actions.ListKeys();
    case constants.Actions.RESTORE_KEYRING_DATA:
      return new actions.RestoreKeyringData();
  }
  return null;
};

});  // goog.scope
