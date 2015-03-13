/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http,//www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * @fileoverview Definition of a messaging service interacting with an
 * OpenPGP ContextImpl. Meant to be used in a WebWorker.
 */
goog.provide('e2e.openpgp.ContextService');

goog.require('e2e.messaging.AsyncRespondingChannel');
goog.require('goog.array');



/**
 * Service exposing an OpenPGP Context over Closure messaging channel.
 * @param {!e2e.openpgp.Context} contextImpl OpenPGP context
 * @param {!goog.messaging.PortChannel} portChannel Messaging channel that the
 *     service will listen at.
 * @constructor
 */
e2e.openpgp.ContextService = function(contextImpl, portChannel) {
  /**
   * @type {!e2e.openpgp.Context}
   * @private
   */
  this.context_ = contextImpl;
  /**
   * @type {!e2e.messaging.AsyncRespondingChannel}
   * @private
   */
  this.channel_ = new e2e.messaging.AsyncRespondingChannel(portChannel);
  this.channel_.registerService(e2e.openpgp.ContextService.SERVICE_NAME,
      goog.bind(this.handleMessage_, this));
};


/**
 * Name of the service.
 * @type {string}
 */
e2e.openpgp.ContextService.SERVICE_NAME = 'e2e-context';


/**
 * List of methods in OpenPGP ContextImpl that can be called externally.
 * @type {!Array.<string>}
 * @private
 */
e2e.openpgp.ContextService.allowedMethods_ = [
  'changeKeyRingPassphrase',
  'deleteKey',
  'encryptSign',
  'exportKeyring',
  'generateKey',
  'getAllKeys',
  'getKeyDescription',
  'getKeyringBackupData',
  'hasPassphrase',
  'isKeyRingEncrypted',
  'restoreKeyring',
  'searchKey',
  'searchPrivateKey',
  'searchPublicKey',
  'setArmorHeader',
  'setKeyRingPassphrase',
  'verifyDecrypt'
];


/**
 * Forwards all incoming messages to an OpenPGP context.
 * @param  {Object} message The message
 * @return {?} Responses from the internal context.
 * @private
 */
e2e.openpgp.ContextService.prototype.handleMessage_ = function(message) {
  var incomingMessage = /** @type {{name:string, params:Array.<?>}} */ (
      message);
  if (goog.array.contains(e2e.openpgp.ContextService.allowedMethods_,
      incomingMessage.name) && goog.isArray(incomingMessage.params)) {
    return this.context_[incomingMessage.name].apply(
        this.context_, incomingMessage.params);
  }
};
