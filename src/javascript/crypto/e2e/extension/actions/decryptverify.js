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
 * @fileoverview Decrypts the contents of and verifies the signers of
 * a PGP message.
 */

goog.provide('e2e.ext.actions.DecryptVerify');

goog.require('e2e');
goog.require('e2e.ext.actions.Action');
goog.require('e2e.ext.utils');
goog.require('e2e.ext.utils.Error');
goog.require('e2e.ext.utils.action');

goog.scope(function() {
var actions = e2e.ext.actions;
var utils = e2e.ext.utils;



/**
 * Constructor for the action.
 * @constructor
 * @implements {e2e.ext.actions.Action.<string, string>}
 */
actions.DecryptVerify = function() {};


/** @inheritDoc */
actions.DecryptVerify.prototype.execute =
    function(ctx, request, requestor, callback, errorCallback) {
  if (!goog.isFunction(request.passphraseCallback)) {
    errorCallback(new utils.Error(
        'Unable to decrypt and verify the message.', 'errorUnableToImportKey'));
    return;
  }

  ctx.verifyDecrypt(request.passphraseCallback, request.content).
      addCallback(function(result) {
        e2e.byteArrayToStringAsync(
            result.decrypt.data, result.decrypt.options.charset).
            addCallback(/** @param {string} decrypted */ function(decrypted) {
              var successMsgs = [
                result.decrypt.wasEncrypted ?
                    chrome.i18n.getMessage('promptDecryptionSuccessMsg') :
                    chrome.i18n.getMessage('promptMessageNotEncryptedMsg')
              ];

              if (goog.isDef(result.verify)) {
                if (result.verify.failure.length > 0) {
                  errorCallback(new Error(chrome.i18n.getMessage(
                      'promptVerificationFailureMsg',
                      utils.action.extractUserIds(result.verify.failure))));
                }

                if (result.verify.success.length > 0) {
                  successMsgs.push(chrome.i18n.getMessage(
                      'promptVerificationSuccessMsg',
                      utils.action.extractUserIds(result.verify.success)));
                }
              }

              utils.showNotification(
                  successMsgs.join('\n\n'), goog.nullFunction);
              callback(decrypted);
            });
      }).
      addErrback(errorCallback);
};

});  // goog.scope
