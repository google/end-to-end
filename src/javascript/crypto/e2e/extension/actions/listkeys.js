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
 * @fileoverview Lists all public or private keys (never both) in the extension.
 */

goog.provide('e2e.ext.actions.ListKeys');

goog.require('e2e.ext.actions.Action');
goog.require('e2e.ext.utils.Error');
goog.require('goog.object');

goog.scope(function() {
var actions = e2e.ext.actions;
var utils = e2e.ext.utils;



/**
 * Constructor for the action.
 * @constructor
 * @implements {e2e.ext.actions.Action.<string, !e2e.openpgp.KeyRingMap>}
 */
actions.ListKeys = function() {};


/** @inheritDoc */
actions.ListKeys.prototype.execute =
    function(ctx, request, requestor, callback, errorCallback) {
  ctx.getAllKeys(request.content == 'private').
      addCallback(function(result) {
        if (request.content == 'private') {
          // If true, the action is listing private keys.
          if (goog.object.isEmpty(result)) {
            errorCallback(new utils.Error(
                'No available private keys.', 'promptNoPrivateKeysFound'));
          }
        }

        callback(result);
      }).
      addErrback(errorCallback);
};

});  // goog.scope
