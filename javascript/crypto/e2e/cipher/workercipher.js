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
 * @fileoverview Provides a cipher within a worker.
 */

goog.provide('e2e.cipher.WorkerCipher');

goog.require('e2e.Algorithm');
goog.require('e2e.async.Client');
goog.require('e2e.async.Result');
goog.require('e2e.async.Worker');
goog.require('e2e.cipher.AsymmetricCipher');
goog.require('e2e.random');



/**
 * Class that implements ciphers inside a worker.
 * @param {e2e.cipher.Algorithm} algorithm The algorithm to retrieve.
 * @param {e2e.cipher.key.Key=} opt_key The public or private key.
 * @constructor
 * @implements {e2e.cipher.AsymmetricCipher}
 * @extends {e2e.AlgorithmImpl}
 */
e2e.cipher.WorkerCipher = function(algorithm, opt_key) {
  if (e2e.cipher.WorkerCipher.PATH == '') {
    throw new Error('Worker service path missing.');
  }
  /** @private */
  this.pendingQueue_ = [];

  /**
   * Old calls that need to be persisted across invocations. Only used for
   *     setKey at the moment.
   * @private
   */
  this.oldCalls_ = [];

  goog.base(this, algorithm, opt_key);
};
goog.inherits(e2e.cipher.WorkerCipher, e2e.AlgorithmImpl);


/** @override */
e2e.cipher.WorkerCipher.prototype.encrypt = function(data) {
  var result = new e2e.async.Result();
  this.call_(
      'encrypt', [data],
      goog.bind(result.callback, result),
      goog.bind(result.errback, result));
  return result;
};


/** @override */
e2e.cipher.WorkerCipher.prototype.decrypt = function(data) {
  var result = new e2e.async.Result();
  this.call_(
      'decrypt', [data],
      goog.bind(result.callback, result),
      goog.bind(result.errback, result));
  return result;
};


/** @override */
e2e.cipher.WorkerCipher.prototype.setKey = function(key, opt_keySize) {
  goog.base(this, 'setKey', key, opt_keySize);
  this.call_(
      'setKey', [this.key, this.keySize],
      goog.nullFunction, goog.nullFunction,
      /* Persist if key is defined. */ goog.isDefAndNotNull(key));
};


/**
 * Makes a call to the service, or enqueues it if the service isn't available
 * yet.
 * @param {string} method The method to call.
 * @param {Array.<*>} args The arguments of the method.
 * @param {function(*)} callback The callback.
 * @param {function(*)} errback The errback.
 * @param {boolean=} opt_persist Whether to persist the call.
 * @private
 */
e2e.cipher.WorkerCipher.prototype.call_ = function(
    method, args, callback, errback, opt_persist) {
  this.pendingQueue_.push([
    method, args,
    this.wrapDestroyCallback_(callback),
    this.wrapDestroyCallback_(errback)]);
  if (opt_persist) {
    this.oldCalls_.push([method, args, goog.nullFunction]);
  }
  this.createPeerIfNeeded_();
};


/**
 * Wraps the callback with another function that destroys the worker.
 * @param {function(*)} callback The callback to wrap.
 * @return {function(*)} The wrapped callback.
 * @private
 */
e2e.cipher.WorkerCipher.prototype.wrapDestroyCallback_ = function(
    callback) {
  return goog.bind(function(res) {
    this.resetDestroyTimer_();
    callback(res);
  }, this);
};


/**
 * Resets the timer to destroy the worker after being idle.
 * @private
 */
e2e.cipher.WorkerCipher.prototype.resetDestroyTimer_ = function() {
  clearTimeout(this.idleWorkerTimeout_);
  this.idleWorkerTimeout_ = setTimeout(
      goog.bind(this.destroyIdleWorker_, this),
      this.IDLE_WORKER_DELAY_);
};


/**
 * Timeout for the idle worker.
 * @type {number|undefined}
 * @private
 */
e2e.cipher.WorkerCipher.prototype.idleWorkerTimeout_;


/**
 * Miliseconds to wait after a response before destroying the worker.
 * @const {number}
 * @private
 */
e2e.cipher.WorkerCipher.prototype.IDLE_WORKER_DELAY_ = 5e3;


/**
 * Destroys an idle worker to free resources.
 * @private
 */
e2e.cipher.WorkerCipher.prototype.destroyIdleWorker_ = function() {
  this.peer_.destroy();
  this.client_ = this.peer_ = null;
  this.pendingQueue_ = this.oldCalls_.slice(0);
};


/**
 * Creates a peer if required, otherwise flushes the pending calls.
 * @private
 */
e2e.cipher.WorkerCipher.prototype.createPeerIfNeeded_ = function() {
  if (goog.isDefAndNotNull(this.peer_) && goog.isDefAndNotNull(this.client_)) {
    this.flushPendingCalls_();
  } else {
    this.createPeer_();
  }
};


/**
 * @define {string} The path to the worker service.
 */
e2e.cipher.WorkerCipher.PATH = '';


/**
 * @define {string} The service name/uri for the worker service.
 */
e2e.cipher.WorkerCipher.SERVICE_NAME = '';


/**
 * Creates a worker peer that holds a cipher service.
 * @private
 */
e2e.cipher.WorkerCipher.prototype.createPeer_ = function() {
  this.peer_ = new e2e.async.Worker(e2e.cipher.WorkerCipher.PATH);
  this.peer_.findService(
      e2e.cipher.WorkerCipher.SERVICE_NAME,
      {
        'algorithm': this.algorithm,
        'key': this.key,
        'seed': e2e.random.getRandomBytes(512)
      },
      goog.bind(this.createClient_, this));
};


/**
 * Creates a client from the port in the response of the worker, and makes all
 * pending calls.
 * @param {*} res The response to the instantiation request. Ignored.
 * @param {MessagePort} port The port to use to initiate the client.
 * @private
 */
e2e.cipher.WorkerCipher.prototype.createClient_ = function(res, port) {
  this.client_ = new e2e.async.Client(port);
  this.flushPendingCalls_();
};


/**
 * Flushes pending calls in the call queue.
 * @private
 */
e2e.cipher.WorkerCipher.prototype.flushPendingCalls_ = function() {
  for (var i = 0; i < this.pendingQueue_.length; i++) {
    var args = this.pendingQueue_[i];
    this.client_.call.apply(this.client_, args);
  }
  this.pendingQueue_ = [];
};
