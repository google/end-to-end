// Copyright 2014 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Implements a key client that searches, imports and verifies
 *    keys from/to http key server.
 * @author quannguyen@google.com (Quan Nguyen)
 */
goog.provide('e2e.openpgp.KeyClient');

goog.require('e2e');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.AES');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.all');
goog.require('e2e.hash.Sha1');
goog.require('e2e.openpgp.block.TransferableKey');
goog.require('e2e.openpgp.block.TransferablePublicKey');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.ECDSA');
goog.require('goog.Uri.QueryData');
goog.require('goog.net.XhrIo');

/**
 * Implements a key client that searches, imports and verifies keys from/to http
 *    key server. This class implements the client side according to the
 *    following RFC: http://tools.ietf.org/html/draft-shaw-openpgp-hkp-00.
 *    Furthermore, it also verifies the consistency of the blob key's proof
 *    from the http key server, using blob transparency architecture.
 * @param {string} keyServerUrl The url of http key server.
 * @constructor
 */
e2e.openpgp.KeyClient = function(keyServerUrl) {
  this.keyServerUrl_ = keyServerUrl;
};

/**
 * The url of http key server.
 * @type {string}
 * @private
 */
e2e.openpgp.KeyClient.prototype.keyServerUrl_;

/**
 * The relative path of key search request.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.SEARCH_REL_PATH_ = '/pks/lookup';

/**
 * The relative path of key import request.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.ADD_REL_PATH_ = '/pks/add';

/**
 * The ASCII armored key text parameter.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.KEY_TEXT_PARAM_ = 'keytext';

/**
 * The operation parameter.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.OP_PARAM_ = 'op';

/**
 * The 'get' operation to search for keys associated with an email.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.GET_OP_PARAM_ = 'get';

/**
 * The email parameter to search for keys with the 'get' operation.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.X_EMAIL_PARAM_ = 'x-email';

/**
 * Imports a public key to the key server.
 * @param {string| e2e.openpgp.block.TransferablePublicKey} key The ASCII
 *    armored or {e2e.openpgp.block.TransferablePublicKey} key to import.
 * @return {e2e.async.Result.<boolean>} True if importing key is succeeded.
 */
e2e.openpgp.KeyClient.prototype.importPublicKey = function(key) {
  var result = new e2e.async.Result();
  if (key instanceof e2e.openpgp.block.TransferablePublicKey) {
    key = e2e.openpgp.asciiArmor.encode(
        'PUBLIC KEY BLOCK',
        key.serialize());
  }
  var data = new goog.Uri.QueryData();
  data.add(e2e.openpgp.KeyClient.KEY_TEXT_PARAM_, key);
  goog.net.XhrIo.send(this.keyServerUrl_ +
      e2e.openpgp.KeyClient.ADD_REL_PATH_,
      goog.bind(function(e) {
        result.callback(e.target.getStatus() == 200);
      }, this),
      'POST', data.toString());
  return result;
};

/**
 * Searches a public key based on an email.
 * @param {string} email The email which is used to search for the
 *    corresponding public keys.
 * @return {e2e.async.Result.<Array.<e2e.openpgp.block.TransferableKey>>}
 *    The public keys correspond to the email or [] if not found.
 */
e2e.openpgp.KeyClient.prototype.searchPublicKey = function(email) {
  var resultPubKeys = new e2e.async.Result();
  var data = new goog.Uri.QueryData();
  data.add(e2e.openpgp.KeyClient.OP_PARAM_,
      e2e.openpgp.KeyClient.GET_OP_PARAM_);
  data.add(e2e.openpgp.KeyClient.X_EMAIL_PARAM_, email);
  goog.net.XhrIo.send(this.keyServerUrl_ +
      e2e.openpgp.KeyClient.SEARCH_REL_PATH_ + '?' + data.toString(),
      goog.bind(function(e) {
        if (e.target.getStatus() == 200) {
          try {
            var receivedPubKeys = e2e.openpgp.block.factory
              .parseAsciiMulti(e.target.getResponseText());
            // TODO(user): Get the public key blob's proof and verify the
            // consistency of the proof.
            resultPubKeys.callback(receivedPubKeys);
          } catch (error) {
            resultPubKeys.callback([]);
          }
        } else {
          resultPubKeys.callback([]);
        }
      }, this), 'GET');
  return resultPubKeys;
};
