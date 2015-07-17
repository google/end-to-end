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
 * @fileoverview Definition of an async service exposed over a
 * {@link MessagePort} interacting with an OpenPGP ContextImpl.
 */
goog.provide('e2e.openpgp.ContextService');

goog.require('e2e.async.Result');
goog.require('e2e.async.Service');
goog.require('goog.array');



/**
 * Constructor for the ContextService. It will expose OpenPGP Context functions,
 * dispatching them to a Context implementation resolved in a promise passed
 * during instantiation.
 * @param {e2e.async.Result<!e2e.openpgp.Context>} contextPromise Promise of
 *    Context.
 * @param {MessagePort} port The port to use for the service.
 * @extends {e2e.async.Service}
 * @constructor
 */
e2e.openpgp.ContextService = function(contextPromise, port) {
  goog.base(this, port);
  /**
   * Bid response, resolved when the context is ready.
   * @private {!e2e.async.Result.<!e2e.async.BidResponse>}
   */
  this.bidResponse_ = new e2e.async.Result();
  contextPromise.addCallback(function(context) {
    this.initializeContext_(context);
  }, this);
};
goog.inherits(e2e.openpgp.ContextService, e2e.async.Service);


/**
 * Initializes the context.
 * @param  {!e2e.openpgp.Context} context The OpenPGP context.
 * @private
 */
e2e.openpgp.ContextService.prototype.initializeContext_ = function(context) {
  this.bindContextMethods_(context);
  var response = /** @type {!e2e.async.BidResponse} */ ({
    'name': this.name
  });
  this.bidResponse_.callback(response);
};


/**
 * Binds exposed OpenPGP service methods to a given Context object.
 * @param {!e2e.openpgp.Context} context The OpenPGP context.
 * @private
 */
e2e.openpgp.ContextService.prototype.bindContextMethods_ = function(context) {
  goog.array.forEach(e2e.openpgp.ContextService.allowedMethods_, function(
      method) {
        if (goog.isFunction(context[method])) {
          this['_public_' + method] = goog.bind(context[method], context);
        }
      }, this);
};


/**
 * Name of the service in a static context.
 * @type {string}
 * @export
 */
e2e.openpgp.ContextService.NAME = 'e2e.openpgp.ContextService';


/**
 * Name of the service.
 * @type {string}
 */
e2e.openpgp.ContextService.prototype.name = e2e.openpgp.ContextService.NAME;


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
  'initializeKeyRing',
  'restoreKeyring',
  'searchKey',
  'searchPrivateKey',
  'searchPublicKey',
  'setArmorHeader',
  'setKeyRingPassphrase',
  'verifyDecrypt'
];


/**
 * Registers a ContextService.
 * @param {!e2e.async.Peer} peer Peer to register the service in.
 * @param {!e2e.async.Result<!e2e.openpgp.Context>} contextPromise Promise of a
 * Context implementation that will handle all the requests coming to a peer.
 */
e2e.openpgp.ContextService.launch = function(peer, contextPromise) {
  peer.registerService(e2e.openpgp.ContextService.NAME,
      goog.bind(e2e.openpgp.ContextService, null, contextPromise));
};


/** @override */
e2e.openpgp.ContextService.prototype.getResponse = function(bid) {
  return this.bidResponse_;
};
