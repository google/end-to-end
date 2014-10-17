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


/**
 * Wraps a function within a port.
 * @param {function(...[*]):*} callback The callback to use.
 * @return {MessagePort} The port that wrapps the callback.
 */
e2e.async.util.wrapFunction = function(callback) {
  var mc = new MessageChannel();
  mc.port1.onmessage = function(event) {
    var args = [];
    for (var i = 0; i < event.data.arguments.length; i++) {
      var arg = event.data.arguments[i];
      if (arg instanceof MessagePort) {
        args.push(e2e.async.util.unwrapFunction(arg));
      } else {
        args.push(arg);
      }
    }
    callback.apply(null, args);
  };
  return mc.port2;
};


/**
 * Unwraps a function from a port.
 * @param {MessagePort} port The port that is wrapping the function.
 * @return {function(...[*]):*} A function that calls the wrapped function.
 */
e2e.async.util.unwrapFunction = function(port) {
  return function() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      if (typeof arguments[i] == 'function') {
        args.push(e2e.async.util.wrapFunction(arguments[i]));
      } else {
        args.push(arguments[i]);
      }
    }
    port.postMessage({
      'arguments': args
    });
  };
};
