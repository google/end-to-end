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
 * @fileoverview Provides cipher operations asynchronously in a Worker.
 */

goog.provide('e2e.cipher.WorkerService');

goog.require('e2e.async.Result');
goog.require('e2e.async.Service');
goog.require('e2e.async.WorkerSelf');
goog.require('e2e.cipher.factory');
goog.require('e2e.random');



/**
 * Executes ciphers inside a worker.
 * @param {MessagePort} port The port to register the service at.
 * @constructor
 * @extends {e2e.async.Service}
 */
e2e.cipher.WorkerService = function(port) {
  goog.base(this, port);
};
goog.inherits(e2e.cipher.WorkerService, e2e.async.Service);


/**
 * Instantiates a new cipher based on an algorithm, key, and PRNG seed.
 * @param {Object} bid The bid of the request.
 * @return {Object} The response to the bid.
 */
e2e.cipher.WorkerService.prototype.getResponse = function(bid) {
  if (this.cipher_) {
    throw new Error('WorkerService can only be used once.');
  }
  var response = goog.base(this, 'getResponse', bid);
  var algorithm = bid['algorithm'];
  var key = bid['key'] || undefined;
  var seed = bid['seed'];
  e2e.random.seedRandomBytes(seed);
  this.cipher_ = e2e.cipher.factory.require(algorithm, key);
  return response;
};


/**
 * Encrypts data with the key of cipher_.
 * @param {e2e.ByteArray} data The data to encrypt.
 * @return {!e2e.async.Result.<!Object.<e2e.ByteArray>>} The result
 *     of the encryption.
 * @expose
 */
e2e.cipher.WorkerService.prototype._public_encrypt = function(data) {
  return this.cipher_.encrypt(data);
};


/**
 * Decrypts data with the key of cipher_.
 * @param {e2e.ByteArray} data The data to decrypt.
 * @return {!e2e.async.Result.<!Object.<e2e.ByteArray>>} The result
 *     of the decryption.
 * @expose
 */
e2e.cipher.WorkerService.prototype._public_decrypt = function(data) {
  return this.cipher_.decrypt(data);
};


/**
 * Sets the key for the cipher_.
 * @param {Object.<string, e2e.ByteArray>} data The key.
 * @expose
 */
e2e.cipher.WorkerService.prototype._public_setKey = function(data) {
  this.cipher_.setKey(data);
};


/** @inheritDoc */
e2e.cipher.WorkerService.prototype.name =
    'https://www.google.com/e2e/crypt/cipher/WorkerService';


/** Initializes the Worker Service */
e2e.cipher.WorkerService.init = function() {
  var peer = new e2e.async.WorkerSelf;
  peer.registerService(
      e2e.cipher.WorkerService.prototype.name,
      e2e.cipher.WorkerService);
};
