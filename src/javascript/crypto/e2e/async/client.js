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
 * @fileoverview Client for Port-based asynchronous services.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.async.Client');

goog.require('e2e.async.Result');
goog.require('e2e.async.util');



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
  this.errback_ = opt_errback || goog.nullFunction;
};


/**
 * Invokes a service method and returns its value to callback.
 * @param {string} method The method to invoke in the service.
 * @param {Array.<*>} args The arguments to send to the method.
 * @param {function(*)} callback The callback for this service.
 * @param {function(*)=} opt_errback The callback to call for errors.
 */
e2e.async.Client.prototype.call = function(
    method, args, callback, opt_errback) {
  var mc = new MessageChannel();
  var otherPorts = [];
  this.registerCallback_(mc.port1, callback, opt_errback || this.errback_);
  for (var i = 0; i < args.length; i++) {
    if (typeof args[i] == 'function') {
      var portWrap = e2e.async.util.wrapFunction(
          /** @type {function(...*):*} */(args[i]));
      otherPorts.push(portWrap);
      // There's no off-by-1, as the first port will be mc.port2.
      args[i] = {'__port__': otherPorts.length};
    }
  }
  this.port_.postMessage({
    'method': method,
    'arguments': args}, [mc.port2].concat(otherPorts));
};


/**
 * Invokes a service method and returns a Deferred that will be resolved with
 * its return value.
 * @param {string} func The function name.
 * @param {!Array.<*>} callArguments The arguments of the function.
 * @return {!e2e.async.Result} Deferred result.
 */
e2e.async.Client.prototype.deferredCall = function(
    func, callArguments) {
  var result = new e2e.async.Result();
  this.call(func, callArguments, goog.bind(result.callback, result),
      goog.bind(result.errback, result));
  return result;
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
