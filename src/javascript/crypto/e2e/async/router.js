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
 * @fileoverview Implements service discovery as broadcast in a star network.
 */

goog.provide('e2e.async.Router');

goog.require('e2e.async.Broker');



/**
 * Establishes connections between nodes and helps perform discovery.
 * @constructor
 * @extends {e2e.async.Broker}
 */
e2e.async.Router = function() {
  goog.base(this, []);
};
goog.inherits(e2e.async.Router, e2e.async.Broker);


/** @override */
e2e.async.Router.prototype.createServices = function(service, bid, port) {
  this.findService(service, bid, goog.bind(this.respondBid, this, port));
};


/**
 * @define {string} Path to the router worker.
 */
e2e.async.Router.PATH = '';


/**
 * Initiates the network.
 */
e2e.async.Router.init = function() {
  var router = new e2e.async.Router;
  self.onconnect = function(e) {
    router.addPort(e.ports[0]);
  };
};
