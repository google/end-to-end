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

goog.require('e2e');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.ext.actions.Action');
goog.require('e2e.openpgp.KeyGenerator');
goog.require('goog.crypt.Sha1');
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

  // Switch on code version.
  switch (data[0]) {
    case 1:
      this.restoreVersion1_(ctx, request.content.email, data, callback,
          errorCallback);
      break;

    default:
      errorCallback(new e2e.error.InvalidArgumentsError('Invalid version'));
      return;
  }
};


/**
  * @private
  * Executes the action.
  * @param {!e2e.openpgp.ContextImpl} ctx A PGP context that can be used to
  *     complete the action.
  * @param {!e2e.ext.messages.ApiRequest.<REQUEST_CONTENT>} email The email
  *     associated with the restored keys.
  * @param {!e2e.ByteArray} data The data to restore.
  * @param {!function(RESPONSE_CONTENT)} callback A callback where successful
  *     results will be passed to.
  * @param {!function(Error)} errorCallback A callback where errors will be
  *     passed to.
  */
actions.RestoreKeyringData.prototype.restoreVersion1_ =
    function(ctx, email, data, callback, errorCallback) {
  var seed, count;
  switch (data.length) {
    // e2e code.
    case e2e.openpgp.KeyGenerator.ECC_SEED_SIZE + 4:
      seed = data.slice(2, -2);
      count = data[1] * 2; /* x2 since we store # of key PAIRS */
      break;

    // e2email code.
    case e2e.openpgp.KeyGenerator.ECC_SEED_SIZE + 3:
      seed = data.slice(1, -2);
      count = 2; /* Default to one pair of keys. */
      break;

    default:
      errorCallback(new e2e.error.InvalidArgumentsError(
          'Backup data has invalid length'));
      return;
  }

  var sha1 = new goog.crypt.Sha1();
  sha1.update(data.slice(0, -2));
  var checksum = sha1.digest().slice(0, 2);

  if (!e2e.compareByteArray(checksum, data.slice(-2))) {
    errorCallback(new e2e.error.InvalidArgumentsError(
        'Backup data has invalid checksum'));
    return;
  }

  ctx.restoreKeyring({
    seed: seed,
    count: count
  }, email);
  callback(email);
};

});  // goog.scope
