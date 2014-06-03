// Copyright 2012 Google Inc. All Rights Reserved.
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
 * @fileoverview Client for Port-based asynchronous services.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.async.Client');



/**
 * Class for the client-side part of the Port-based asynchronous service.
 * @param {MessagePort} port The port to register the client on.
 * @param {function(*)=} opt_errback The default function to call on errors.
 * @constructor
 */
e2e.async.Client = function(port, opt_errback) {
  /**
   * The port to use to communicate with the service.
   * @type {MessagePort}
   * @private
   */
  this.port_ = port;

  /**
   * The default function to call on errors.
   * @type {function(*)}
   * @private
   */
  this.errback_ = opt_errback || function() {};
};


/**
 * Invokes a service method and returns it's value to callback.
 * @param {string} method The method to invoke in the service.
 * @param {Array.<*>} args The arguments to send to the method.
 * @param {function(*)} callback The callback for this service.
 * @param {function(*)=} opt_errback The callback to call for errors.
 */
e2e.async.Client.prototype.call = function(
    method, args, callback, opt_errback) {
  var mc = new MessageChannel();
  this.registerCallback_(mc.port1, callback, opt_errback || this.errback_);
  this.port_.postMessage({
    'method': method,
    'arguments': args}, [mc.port2]);
};


/**
 * Registers a callback for a specific method.
 * @param {MessagePort} port The port to receive the return value on.
 * @param {function(*)} callback The callback to use.
 * @param {function(*)} errback The errback to use.
 * @private
 */
e2e.async.Client.prototype.registerCallback_ = function(
    port, callback, errback) {
  port.onmessage = function(event) {
    if (event.data.error) {
      errback(event.data.error);
    } else {
      callback(event.data.returnValue);
    }
  };
};
