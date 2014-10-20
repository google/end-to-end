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
 * @fileoverview A Frame Peer from the frame's perspective.
 */

goog.provide('e2e.async.FrameSelf');

goog.require('e2e.async.ChildPeer');
goog.require('e2e.async.Peer');



/**
 * Used to represent a current window as a framed-peer.
 * @param {Window} parent The parent of this peer.
 * @param {string=} opt_parentOrigin The origin of the parent.
 * @extends {e2e.async.ChildPeer}
 * @constructor
 */
e2e.async.FrameSelf = function(parent, opt_parentOrigin) {
  goog.base(this);
  this.parent_ = parent;
  this.parentOrigin_ = opt_parentOrigin;
};
goog.inherits(e2e.async.FrameSelf, e2e.async.ChildPeer);


/** @override */
e2e.async.FrameSelf.prototype.init = function() {
  var port = this.createPort();
  var origin = this.parentOrigin_ || '*';
  this.parent_.postMessage(e2e.async.Peer.Message.INIT, origin, [port]);
};
