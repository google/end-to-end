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
 * @fileoverview Implements a key client that searches, imports and verifies
 *    keys from/to http key server.
 * @author quannguyen@google.com (Quan Nguyen)
 */
goog.provide('e2e.openpgp.KeyClient');

goog.require('e2e.async.Result');
goog.require('e2e.openpgp.asciiArmor');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.random');
goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.crypt');
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
 * The user id parameter during key import. The key server will extract the
 * email from it.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.X_USER_ID_PARAM_ = 'x-userid';


/**
 * A random nonce to identify the key being uploaded.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.NONCE_PARAM_ = 'nonce';


/**
 * The origin parameter to identify the extension.
 * @type {string}
 * @const
 * @private
 */
e2e.openpgp.KeyClient.ORIGIN_PARAM_ = 'origin';


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
  var nonce = goog.crypt.byteArrayToHex(e2e.random.getRandomBytes(16));
  var serializedKey = e2e.openpgp.asciiArmor.encode(
      'PUBLIC KEY BLOCK', key.serialize());
  return this.getOpenIdCredentials_(uids[0], nonce).addCallback(
      goog.bind(this.importKeyWithCredentials_, this, nonce, serializedKey));
};


/**
 * Obtains the OpenID credentials for the given email address and a nonce.
 * @param {string} email The email address.
 * @param {string} nonce The random nonce.
 * @return {!e2e.async.Result.<{port: MessagePort, credentials: {
 *     requestUri: string, postBody: string}}>} The port and credentials.
 * @private
 */
e2e.openpgp.KeyClient.prototype.getOpenIdCredentials_ = function(
    email, nonce) {
  var result = new e2e.async.Result();
  var doc = goog.global.document;
  if (goog.isDef(doc)) {
    var url = this.getRegistrationUrl_(email, nonce);
    var iframe = doc.createElement('iframe');
    doc.documentElement.appendChild(iframe);
    iframe.src = url;
    var win = iframe.contentWindow;
    goog.global.addEventListener('message', goog.bind(function(e) {
      if (e.source == win && e.origin == this.keyServerUrl_ && e.ports[0]) {
        var port = e.ports[0];
        port.onmessage = function(e) {
          result.callback({
            credentials: e.data,
            port: port
          });
        };
      }
    }, this));
  } else {
    result.errback('Document not available.');
  }
  return result;
};


/**
 * Obtains the URL to register the user.
 * @param {string} userid The user id.
 * @param {string} nonce The random nonce.
 * @return {string} the URL.
 * @private
 */
e2e.openpgp.KeyClient.prototype.getRegistrationUrl_ = function(
    userid, nonce) {
  var data = new goog.Uri.QueryData();
  data.add(e2e.openpgp.KeyClient.X_USER_ID_PARAM_, userid);
  data.add(e2e.openpgp.KeyClient.NONCE_PARAM_, nonce);
  data.add(e2e.openpgp.KeyClient.ORIGIN_PARAM_, goog.global.location.origin);
  return (
      this.keyServerUrl_ +
      e2e.openpgp.KeyClient.REGISTER_REL_PATH_ +
      '?' + data);
};


/**
 * Imports the given key with the provided credentials.
 * @param {string} nonce The random nonce.
 * @param {string} serializedKey The serialized OpenPGP public key.
 * @param {{port: MessagePort, credentials: {requestUri: string,
 *     postBody: string}}} response The response object from the call.
 * @return {!e2e.async.Result.<boolean>} True if importing key is succeeded.
 * @private
 */
e2e.openpgp.KeyClient.prototype.importKeyWithCredentials_ = function(
    nonce, serializedKey, response) {
  var result = new e2e.async.Result();
  var data = new goog.Uri.QueryData();
  data.add(e2e.openpgp.KeyClient.KEY_TEXT_PARAM_, serializedKey);
  data.add(e2e.openpgp.KeyClient.NONCE_PARAM_, nonce);
  data.add(
      e2e.openpgp.KeyClient.REQUEST_URI_PARAM_,
      response.credentials.requestUri);
  data.add(
      e2e.openpgp.KeyClient.POST_BODY_PARAM_,
      response.credentials.postBody);
  goog.net.XhrIo.send(
      this.keyServerUrl_ + e2e.openpgp.KeyClient.ADD_REL_PATH_,
      function(e) {
        var status = e.target.getStatus();
        if (status == 200) {
          response.port.close();
          result.callback(true);
        } else if (status == 500) {
          response.port.close();
          result.callback(false);
        }
      },
      'POST', data.toString(), undefined, undefined, true);
  return result;
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
            var keydata = e2e.openpgp.asciiArmor.parse(
                e.target.getResponseText());
            // Assumes that any errors in the keyring we get from the
            // keyserver is fatal, and rejects all the returned keys.
            var receivedPubKeys =
                e2e.openpgp.block.factory.parseByteArrayAllTransferableKeys(
                    keydata.data, false, keydata.charset);
            goog.array.forEach(receivedPubKeys, function(key) {
              key.processSignatures();
            });
            // TODO(user): Get the public key blob's proof and verify the
            // consistency of the proof.
            resultPubKeys.callback(receivedPubKeys);
          } catch (error) {
            resultPubKeys.callback([]);
          }
        } else {
          resultPubKeys.callback([]);
        }
      }, this), 'GET', undefined, undefined, undefined, true);
  return resultPubKeys;
};
