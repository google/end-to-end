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

goog.provide('e2e.ext.actions.ListAllUids');

goog.require('e2e.ext.actions.Action');
goog.require('goog.array');

goog.scope(function() {
var actions = e2e.ext.actions;



/**
 * Constructor for the action.
 * @constructor
 * @implements {e2e.ext.actions.Action.<string, !Array>}
 */
actions.ListAllUids = function() {};


/** @inheritDoc */
actions.ListAllUids.prototype.execute =
    function(ctx, request, requestor, callback, errorCallback) {
  ctx.getAllKeys(request.content === 'private').
      addCallback(function(result) {
        var uids = [];
        var getUidsFromKey = function(key) {
          if (key && key.uids) {
            goog.array.extend(uids, key.uids);
          }
        };
        for (var keyId in result) {
          if (result.hasOwnProperty(keyId)) {
            var keys = result[keyId];
            goog.array.forEach(keys, getUidsFromKey);
          }
        }
        callback(uids);
      }).
      addErrback(errorCallback);
};

});  // goog.scope
