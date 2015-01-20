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
 * @fileoverview Encrypts and signs a message using the provided recipients and
 * signer information.
 */

goog.provide('e2e.ext.actions.EncryptSign');

goog.require('e2e.ext.actions.Action');
goog.require('e2e.ext.utils.Error');
goog.require('goog.array');
goog.require('goog.string');

goog.scope(function() {
var actions = e2e.ext.actions;
var utils = e2e.ext.utils;



/**
 * Constructor for the action.
 * @constructor
 * @implements {e2e.ext.actions.Action.<string, string>}
 */
actions.EncryptSign = function() {};


/** @inheritDoc */
actions.EncryptSign.prototype.execute =
    function(ctx, request, requestor, callback, errorCallback) {
  var recipients = request.recipients || [];
  var passphrases = request.encryptPassphrases || [];
  var currentUser = request.currentUser || '';

  if (currentUser &&
      (recipients.length > 0 || passphrases.length > 0) &&
      !goog.array.contains(recipients, currentUser)) {
    // If encrypting the message, always add the sender key for him
    // to be able to decrypt.
    recipients.push(currentUser);
  }

  this.getEncryptKeys_(ctx, recipients, function(encryptionKeys) {
    if (passphrases.length == 0 &&
        encryptionKeys.length == 0 &&
        recipients.length > 0) {
      errorCallback(new utils.Error(
          'No pasphrases nor keys available to encrypt.',
          'promptNoEncryptionTarget'));
      return;
    }

    ctx.searchPrivateKey(currentUser).addCallback(function(privKeys) {
      var signingKey = null;
      if (request.signMessage && privKeys && privKeys.length > 0) {
        // Just choose one private key for now.
        signingKey = privKeys[0];
      }

      ctx.encryptSign(
          request.content,
          [], // Options.
          encryptionKeys, // Keys to encrypt to.
          passphrases, // For symmetrically-encrypted session keys.
          signingKey // Key to sign with.
      ).addCallback(callback).addErrback(errorCallback);
    }).addErrback(errorCallback);
  }, errorCallback);
};


/**
 * Parses string and looks up keys for encrypting objects in keyring.
 * @param {!e2e.openpgp.ContextImpl} ctx A PGP context that can be used to
 *     complete the action.
 * @param {!Array.<string>} recipients A list of recipients to get keys for.
 * @param {!function(!Array.<!e2e.openpgp.Key>)} callback The callback where the
 *      resulting array of key objects is to be passed.
 * @param {!function(Error)} errorCallback A callback where errors will be
 *     passed to.
 * @private
 */
actions.EncryptSign.prototype.getEncryptKeys_ =
    function(ctx, recipients, callback, errorCallback) {
  var keys = [];
  var userIds = goog.array.slice(recipients, 0, recipients.length);

  var queryFunc = function() {
    if (goog.array.isEmpty(userIds)) {
      callback(keys);
    } else {
      var userId = goog.string.trim(userIds.pop());
      if (userId) {
        ctx.searchPublicKey(userId).addCallback(function(found) {
          if (found) {
            goog.array.extend(keys, found);
          }
          queryFunc();
        }).addErrback(errorCallback);
      }
    }
  };
  queryFunc();
};

});  // goog.scope
