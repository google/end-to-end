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

goog.require('e2e.async.Result');
goog.require('e2e.openpgp.asciiArmor');
goog.require('e2e.openpgp.block.TransferablePublicKey');
goog.require('e2e.openpgp.block.factory');
goog.require('goog.Uri');
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
 * The relative path of user registration.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.REGISTER_REL_PATH_ = '/userauth';

/**
 * The ASCII armored key text parameter.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.KEY_TEXT_PARAM_ = 'keytext';

/**
 * The URL where the Identity Provider sent the user to.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.REQUEST_URI_PARAM_ = 'requestUri';

/**
 * The POST body included in the Identity Provider response.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.POST_BODY_PARAM_ = 'postBody';

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
 * The origin parameter to identify the extension.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.ORIGIN_PARAM_ = 'origin';

/**
 * Obtains the URL to register the user.
 * @param {string} email The email address.
 * @return {string} the URL.
 * @private
 */
e2e.openpgp.KeyClient.prototype.getRegistrationUrl_ = function(email) {
  var data = new goog.Uri.QueryData();
  data.add(e2e.openpgp.KeyClient.X_EMAIL_PARAM_, email);
  data.add(e2e.openpgp.KeyClient.ORIGIN_PARAM_, goog.global.location.origin);
  return (
      this.keyServerUrl_ +
      e2e.openpgp.KeyClient.REGISTER_REL_PATH_ +
      '?' + data);
};

/**
 * Obtains the OpenID credentials for the given email address.
 * @param {string} email The email address.
 * @return {!e2e.async.Result.<{requestUri: string, postBody: string}>} The
 *     OpenID credentials.
 * @private
 */
e2e.openpgp.KeyClient.prototype.getOpenIdCredentials_ = function(email) {
  var result = new e2e.async.Result();
  if (goog.isDef(goog.global.open)) {
    var url = this.getRegistrationUrl_(email);
    var win = goog.global.open(url);
    goog.global.addEventListener('message', function(e) {
      if (e.source == win && e.origin == this.keyServerUrl_) {
        win.close();
        result.callback(e.data);
      }
    });
  } else {
    result.errback('Window.open not available.');
  }
  return result;
};

/**
 * Imports a public key to the key server.
 * @param {!e2e.openpgp.block.TransferablePublicKey} key The ASCII
 *    armored or {e2e.openpgp.block.TransferablePublicKey} key to import.
 * @return {!e2e.async.Result.<boolean>} True if importing key is succeeded.
 */
e2e.openpgp.KeyClient.prototype.importPublicKey = function(key) {
  var uids = key.getUserIds();
  if (uids.length != 1) {
    throw new Error('Invalid user ID for key import.');
  }
  return this.getOpenIdCredentials_(uids[0]).addCallback(function(creds) {
    var result = new e2e.async.Result();
    var serializedKey = e2e.openpgp.asciiArmor.encode(
        'PUBLIC KEY BLOCK',
        key.serialize());
    var data = new goog.Uri.QueryData();
    data.add(e2e.openpgp.KeyClient.KEY_TEXT_PARAM_, serializedKey);
    data.add(e2e.openpgp.KeyClient.REQUEST_URI_PARAM_, creds.requestUri);
    data.add(e2e.openpgp.KeyClient.POST_BODY_PARAM_, creds.postBody);
    goog.net.XhrIo.send(this.keyServerUrl_ +
        e2e.openpgp.KeyClient.ADD_REL_PATH_,
        function(e) {
          result.callback(e.target.getStatus() == 200);
        },
        'POST', data.toString());
    return result;
  }, this);
};

/**
 * Searches a public key based on an email.
 * @param {string} email The email which is used to search for the
 *    corresponding public keys.
 * @return {!e2e.async.Result.<!Array.<!e2e.openpgp.block.TransferableKey>>}
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
            // resultPubKeys.callback(receivedPubKeys);
          } catch (error) {
            resultPubKeys.callback([]);
          }
        } else {
          resultPubKeys.callback([]);
        }
      }, this), 'GET');
  return resultPubKeys;
};
