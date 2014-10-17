/**
 * @license
 * Copyright 2012 Google Inc. All rights reserved.
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
 * @fileoverview A Worker defined as a Peer.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.async.Worker');

goog.require('e2e.async.ChildPeer');
goog.require('e2e.async.Peer');



/**
 * Used to represent a worker as a peer.
 * @param {string} path The path to the code to run as Worker.
 * @extends {e2e.async.ChildPeer}
 * @constructor
 */
e2e.async.Worker = function(path) {
  goog.base(this);
  this.path_ = path;
};
goog.inherits(e2e.async.Worker, e2e.async.ChildPeer);


/** @override */
e2e.async.Worker.prototype.init = function() {
  this.worker_ = new Worker(this.path_);
  var port = this.createPort();
  this.worker_.postMessage(e2e.async.Peer.Message.INIT, [port]);
};


/**
 * Destroys the worker. New messages won't work anymore.
 */
e2e.async.Worker.prototype.destroy = function() {
  this.worker_.terminate();
};
