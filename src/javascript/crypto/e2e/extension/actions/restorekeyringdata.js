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
 * @fileoverview Restores keyring data based on backup code.
 */

goog.provide('e2e.ext.actions.RestoreKeyringData');

goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.ext.actions.Action');
goog.require('e2e.openpgp.KeyGenerator');
goog.require('goog.crypt.base64');

goog.scope(function() {
var actions = e2e.ext.actions;



/**
 * Constructor for the action.
 * @constructor
 * @implements {e2e.ext.actions.Action.<{data: string, email: string}, string>}
 */
actions.RestoreKeyringData = function() {};


/** @inheritDoc */
/* TODO(rcc): Remove email when we can use keyserver for lookups. */
actions.RestoreKeyringData.prototype.execute =
    function(ctx, request, requestor, callback, errorCallback) {
  var data = goog.crypt.base64.decodeStringToByteArray(request.content.data);

  if (data[0] & 0x80) {
    errorCallback(new e2e.error.InvalidArgumentsError('Invalid version bit'));
    return;
  }

  if (data.length != e2e.openpgp.KeyGenerator.ECC_SEED_SIZE + 1) {
    errorCallback(
        new e2e.error.InvalidArgumentsError('Backup data has invalid length'));
    return;
  }

  ctx.restoreKeyring({
    seed: data.slice(1),
    count: (data[0] & 0x7F) * 2 /* x2 since we store # of key PAIRS */
  }, request.content.email);

  callback(request.content.email);
};

});  // goog.scope
