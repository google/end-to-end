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
 * @fileoverview A SharedWorker defined as a Peer.
 */

goog.provide('e2e.async.SharedWorker');

goog.require('e2e.async.ChildPeer');



/**
 * Used to represent a shared worker as a peer.
 * @param {string} path The path to the code to run as a SharedWorker.
 * @extends {e2e.async.ChildPeer}
 * @constructor
 */
e2e.async.SharedWorker = function(path) {
  goog.base(this);
  this.path_ = path;
};
goog.inherits(e2e.async.SharedWorker, e2e.async.ChildPeer);


/** @override */
e2e.async.SharedWorker.prototype.init = function() {
  this.sharedWorker_ = new SharedWorker(this.path_);
  this.addPort(this.sharedWorker_.port);
};
