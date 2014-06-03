// Copyright 2014 Google Inc. All rights reserved.
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
 *
 * @fileoverview Provides context APIs that all parts (e.g. browser actions,
 * other extension pages, content scripts, etc.) of the extension can use.
 *
 */

goog.provide('e2e.ext.api.Api');

goog.require('e2e.ext.api.RequestThrottle');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.messages');
goog.require('e2e.openpgp.Context');
goog.require('e2e.openpgp.KeyRing');
goog.require('e2e.openpgp.packet.Key');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.string');

goog.scope(function() {
var api = e2e.ext.api;
var constants = e2e.ext.constants;
var messages = e2e.ext.messages;



/**
 * Constructor for the context API.
 * @param {!e2e.openpgp.Context} pgpCtx The PGP context used by the
 *     extension.
 * @constructor
 * @extends {goog.Disposable}
 */
api.Api = function(pgpCtx) {
  goog.base(this);

  /**
   * The PGP context used by the extension.
   * @type {!e2e.openpgp.Context}
   * @private
   */
  this.pgpCtx_ = goog.asserts.assert(pgpCtx);

  /**
   * The handler to process incoming requests from other parts of the extension.
   * @type {!function(Port)}
   * @private
   */
  this.requestHandler_ = goog.bind(this.openPort_, this);

  /**
   * A request throttle for incoming decrypt requests.
   * @type {!api.RequestThrottle}
   * @private
   */
  this.decryptRequestThrottle_ = new api.RequestThrottle(
      api.Api.REQUEST_THRESHOLD_);

  /**
   * A request throttle for incoming encrypt requests.
   * @type {!api.RequestThrottle}
   * @private
   */
  this.encryptRequestThrottle_ = new api.RequestThrottle(
      api.Api.REQUEST_THRESHOLD_);
};
goog.inherits(api.Api, goog.Disposable);


/**
 * The number of allowed requests per minute.
 * @type {number}
 * @private
 * @const
 */
api.Api.REQUEST_THRESHOLD_ = 500;


/** @override */
api.Api.prototype.disposeInternal = function() {
  this.removeApi();

  goog.base(this, 'disposeInternal');
};


/**
 * Installs the API.
 */
api.Api.prototype.installApi = function() {
  chrome.runtime.onConnect.addListener(this.requestHandler_);
};


/**
 * Removes the API.
 */
api.Api.prototype.removeApi = function() {
  chrome.runtime.onConnect.removeListener(this.requestHandler_);
};


/**
 * Opens a port with the connecting counterpart.
 * @param {Port} port The port through which communication should carried with
 *     the counterpart.
 * @private
 */
api.Api.prototype.openPort_ = function(port) {
  port.onMessage.addListener(
      goog.bind(this.executeAction_, this, goog.bind(port.postMessage, port)));
};


/**
 * Executes the PGP action and passed the result to the provided callback.
 * @param {function(*)} callback A callback to pass the result of the action to.
 * @param {*} req The execution request.
 * @private
 */
api.Api.prototype.executeAction_ = function(callback, req) {
  var incoming = /** @type {!messages.ApiRequest} */ (req);
  var outgoing = {
    completedAction: incoming.action
  };

  if (window.launcher && !window.launcher.hasPassphrase()) {
    callback({
      error: chrome.i18n.getMessage('glassKeyringLockedError')
    });
    return;
  }

  switch (incoming.action) {
    case constants.Actions.ENCRYPT_ONLY:
    case constants.Actions.SIGN_ONLY:
    case constants.Actions.ENCRYPT_SIGN:
      if (!this.encryptRequestThrottle_.canProceed()) {
        outgoing.error = chrome.i18n.getMessage('throttleErrorMsg');
        break;
      }

      outgoing.error = this.runWrappedProcessor_(
          /** @this api.Api */ function() {
            var signer = incoming.currentUser || '';

            var signMessage = incoming.action == constants.Actions.SIGN_ONLY ||
                incoming.action == constants.Actions.ENCRYPT_SIGN;

            var keys;
            var passphrases;
            switch (incoming.action) {
              case constants.Actions.ENCRYPT_ONLY:
              case constants.Actions.ENCRYPT_SIGN:
                keys = this.getEncryptKeys_(incoming.recipients || []);
                passphrases = incoming.encryptPassphrases || [];
                break;
              default:
                keys = [];
                passphrases = [];
            }

            this.pgpCtx_
                .searchPrivateKey(signer)
                .addCallback(goog.bind(function(privateKeys) {
                  var signingKey = null;
                  if (signMessage) {
                    if (privateKeys && privateKeys.length > 0) {
                      // Just choose one private key for now.
                      signingKey = privateKeys[0];
                    }

                    if (keys.length > 0) {  // if no recipients, do sign-only
                      goog.array.extend(keys, this.getEncryptKeys_([signer]));
                    }
                  }

                  this.pgpCtx_.encryptSign(
                      incoming.content,
                      [], // Options.
                      keys, // Keys to encrypt to.
                      passphrases, // For symmetrically-encrypted session keys.
                      signingKey // Key to sign with.
                  ).addCallback(function(result) {
                    outgoing.content = result;
                    callback(outgoing);
                  });
                }, this));
          });
      break;
    case constants.Actions.DECRYPT_VERIFY:
      if (!this.decryptRequestThrottle_.canProceed()) {
        outgoing.error = chrome.i18n.getMessage('throttleErrorMsg');
        break;
      }

      outgoing.error = this.runWrappedProcessor_(
          /** @this api.Api */ function() {
            this.pgpCtx_.verifyDecrypt(function(uid, passphraseCallback) {
              if (incoming.decryptPassphrase) {
                passphraseCallback(incoming.decryptPassphrase);
              }

              outgoing.selectedUid = uid;
              outgoing.retry = true;
              callback(outgoing);
            }, incoming.content).addCallback(function(result) {
              return e2e.byteArrayToStringAsync(
                  result.decrypt.data,
                  result.decrypt.options.charset).addCallback(
                  function(str) {
                    outgoing.content = str;
                    callback(outgoing);
                  });
            }).addErrback(function(error) {
              outgoing.error = error.toString();
              callback(outgoing);
            });
          });
      break;
    case constants.Actions.GET_KEY_DESCRIPTION:
      outgoing.error = this.runWrappedProcessor_(
          /** @this api.Api */ function() {
            outgoing.content = this.pgpCtx_.getKeyDescription(incoming.content);
            callback(outgoing);
          });
      break;
    case constants.Actions.IMPORT_KEY:
      outgoing.error = this.runWrappedProcessor_(
          /** @this api.Api */ function() {
            this.pgpCtx_.importKey(function(uid, passphraseCallback) {
              if (incoming.decryptPassphrase) {
                passphraseCallback(incoming.decryptPassphrase);
              }

              outgoing.selectedUid = uid;
              outgoing.retry = true;
              callback(outgoing);
            }, incoming.content).addCallback(function(result) {
              outgoing.content = result.toString();
              callback(outgoing);
            });
          });
      break;
  }

  if (outgoing.error) {
    callback(outgoing);
  }
};


/**
 * Executes the provided processor function into a try/catch block and returns
 * error messages if needed.
 * @param {!function()} processorFunc The processor function to execute.
 * @return {string|undefined} Error messages if any.
 * @private
 */
api.Api.prototype.runWrappedProcessor_ = function(processorFunc) {
  try {
    goog.bind(processorFunc, this).call();
  } catch (error) {
    // TODO(radi): i18n
    return error.message;
  }
};


/**
 * Parses string and looks up keys for encrypting objects in keyring.
 * @param {!Array.<string>} userIds A list of user IDs to get keys for.
 * @return {!Array.<e2e.openpgp.packet.Key>} Array of key objects.
 * @private
 */
api.Api.prototype.getEncryptKeys_ = function(userIds) {
  var keys = [];
  goog.array.forEach(userIds, function(userId) {
    var trimmedUid = goog.string.trim(userId);
    if (trimmedUid) {
      // TODO(evn): This will break as soon as searchKey becomes really async.
      this.pgpCtx_.searchPublicKey(trimmedUid).addCallback(
          goog.bind(function(found) {
            if (found) {
              goog.array.extend(keys, found);
            }
          }, this));
    }
  }, this);

  return keys;
};

}); // goog.scope
