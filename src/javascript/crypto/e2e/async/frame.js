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
 * @fileoverview A Frame defined as a Peer.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.async.Frame');

goog.require('e2e.async.ForeignPeer');



/**
 * Used to represent a frame as a peer.
 * @param {Window} frame The frame to register as a peer.
 * @extends {e2e.async.ForeignPeer}
 * @constructor
 */
e2e.async.Frame = function(frame) {
  this.frame_ = frame;
  goog.base(this, goog.global);
};
goog.inherits(e2e.async.Frame, e2e.async.ForeignPeer);


/** @inheritDoc */
e2e.async.Frame.prototype.validateMessage = function(e) {
  return e.source == this.frame_;
};
