/**
 * @license
 * Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Utilities for asynchronous operations.
 */
goog.provide('e2e.async.util');

goog.require('e2e.async.Result');
goog.require('goog.async.Deferred');


/**
 * Wraps a function within a port.
 * @param {function(...*):*} callback The callback to use.
 * @return {MessagePort} The port that wraps the callback.
 */
e2e.async.util.wrapFunction = function(callback) {
  var mc = new MessageChannel();
  mc.port1.onmessage = function(event) {
    var args = [];
    for (var i = 0; i < event.data.arguments.length; i++) {
      var arg = event.data.arguments[i];
      if (goog.isObject(arg) && goog.isNumber(arg.__port__)) {
        args.push(e2e.async.util.unwrapFunction(event.ports[arg.__port__]));
      } else {
        args.push(arg);
      }
    }
    try {
      var returnValue = callback.apply(null, args);
      if (goog.async.Deferred && returnValue instanceof goog.async.Deferred) {
        returnValue.addCallback(function(ret) {
          e2e.async.util.return_(event.target, ret, '');
        }).addErrback(function(err) {
          e2e.async.util.return_(event.target, undefined, String(err));
        });
      } else {
        e2e.async.util.return_(event.target, returnValue, '');
      }
    } catch (e) {
      if (e instanceof Error) {
        e2e.async.util.return_(event.target, undefined, String(e.message));
      } else {
        e2e.async.util.return_(event.target, undefined, 'Unknown error');
      }
    }
  };
  return mc.port2;
};


/**
 * Sends a return message to the port.
 * @param {MessagePort} port The port to respond to.
 * @param {*} returnValue The return value of the function.
 * @param {string} error The error to send.
 * @private
 */
e2e.async.util.return_ = function(port, returnValue, error) {
  port.postMessage({
    'returnValue': returnValue,
    'error': error
  });
};


/**
 * Unwraps a function from a port.
 * @param {MessagePort} port The port that is wrapping the function.
 * @return {function(...*):!e2e.async.Result} A function that calls the wrapped
 *    function and returns a deferred result object.
 */
e2e.async.util.unwrapFunction = function(port) {
  return function() {
    var result = new e2e.async.Result();
    port.onmessage = function(event) {
      if (event.data.error) {
        result.errback(event.data.error);
      } else {
        result.callback(event.data.returnValue);
      }
    };
    var args = [];
    var ports = [];
    for (var i = 0; i < arguments.length; i++) {
      if (typeof arguments[i] == 'function') {
        var wrappedPort = e2e.async.util.wrapFunction(arguments[i]);
        ports.push(wrappedPort);
        args.push({
          '__port__': ports.length - 1
        });
      } else {
        args.push(arguments[i]);
      }
    }
    port.postMessage({
      'arguments': args
    }, ports);
    return result;
  };
};
