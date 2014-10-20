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
 * @fileoverview Converts a Window or a Worker to a Peer.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.async.ChildPeer');

goog.require('e2e.async.Peer');



/**
 * Class to represent a peer as a descendant of the current scope.
 * @extends {e2e.async.Peer}
 * @constructor
 */
e2e.async.ChildPeer = function() {
  goog.base(this);
};
goog.inherits(e2e.async.ChildPeer, e2e.async.Peer);


/**
 * Create a new port.
 * @return {MessagePort}
 */
e2e.async.ChildPeer.prototype.createPort = function() {
  var mc = new MessageChannel();
  // port1/port2 are entangled, what is sent to port1 comes out on port2.
  this.addPort(mc.port1);
  return mc.port2;
};
