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
 * @fileoverview A Foreign Peer is a peer that has ports it didn't create.
 * @author evn@google.com (Eduardo Vela)
 */
goog.provide('e2e.async.ForeignPeer');

goog.require('e2e.async.Peer');



/**
 * Class to represent a peer outside of the current scope.
 * @param {Window} self Target to use for getting ports.
 * @extends {e2e.async.Peer}
 * @constructor
 */
e2e.async.ForeignPeer = function(self) {
  goog.base(this);
  this.self_ = self;
};
goog.inherits(e2e.async.ForeignPeer, e2e.async.Peer);


/** @override */
e2e.async.ForeignPeer.prototype.init = function() {
  this.self_.onmessage = goog.bind(function(e) {
    if (e.data == e2e.async.Peer.Message.INIT &&
        this.validateMessage(e)) {
      var newPort = e.ports[0];
      this.addPort(newPort);
    }
  }, this);
};


/**
 * Validates that a given message is acceptable to use to register a port.
 * @param {MessageEvent.<*>} e The event to validate.
 * @return {boolean} Whether it's ok to add it as port.
 */
e2e.async.ForeignPeer.prototype.validateMessage = goog.abstractMethod;
