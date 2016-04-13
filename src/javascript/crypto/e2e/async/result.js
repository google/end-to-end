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
 * @fileoverview Extension of goog.async.Deferred.
 */

goog.provide('e2e.async.Result');

goog.require('goog.async.Deferred');



/**
 * @param {Function=} opt_onCancelFunction A function that will be called if the
 *     Deferred is cancelled. If provided, this function runs before the
 *     Deferred is fired with a {@code CancelledError}.
 * @param {Object=} opt_defaultScope The default object context to call
 *     callbacks and errbacks in.
 * @constructor
 * @template T
 * @extends {goog.async.Deferred.<T>}
 */
e2e.async.Result = function(opt_onCancelFunction, opt_defaultScope) {
  e2e.async.Result.base(
      this, 'constructor', opt_onCancelFunction, opt_defaultScope);
};
goog.inherits(e2e.async.Result, goog.async.Deferred);


/**
 * @override
 * @return {!e2e.async.Result}
 */
e2e.async.Result.prototype.addCallback;


/**
 * @override
 * @return {!e2e.async.Result}
 */
e2e.async.Result.prototype.addErrback;


/**
 * Obtains the value if available.
 * @param {e2e.async.Result.<T>} result The result.
 * @return {T} The value.
 * @template T
 */
e2e.async.Result.getValue = function(result) {
  if (result.hasFired()) {
    var ret, fired = false;
    result.addCallback(function(value) {
      ret = value;
      fired = true;
    }).addErrback(function(e) {
      throw e;
    });
    if (fired)
      return ret;
    throw new Error('Fired result didn\'t return synchronously.');
  }
  throw new Error('Result is still pending.');
};


/**
 * Converts a value to a result.
 * @param {T} value The value to wrap as a result.
 * @return {!e2e.async.Result.<T>} The value as a result.
 * @template T
 */
e2e.async.Result.toResult = function(value) {
  return /** @type {!e2e.async.Result} */(
      goog.async.Deferred.succeed(value));
};


/**
 * Converts a Promise to a result.
 * @param {!goog.Thenable<T>} promise The Promise to wrap as a result.
 * @return {!e2e.async.Result.<T>} The corresponding result.
 * @template T
 */
e2e.async.Result.fromPromise = function(promise) {
  var r = new e2e.async.Result();
  r.callback();
  r.addCallback(function() {
    return promise;
  });
  return r;
};


/**
 * Converts a value to a (failed) result.
 * @param {Error} error The error to resolve to.
 * @return {!e2e.async.Result} The value as a result.
 */
e2e.async.Result.toError = function(error) {
  return /** @type {!e2e.async.Result} */(
      goog.async.Deferred.fail(error));
};


/**
 * Converts a value to a result that is resolved asynchronously.
 * @param {T} value The value to wrap as a result.
 * @return {!e2e.async.Result.<T>} The value as a result.
 * @template T
 */
e2e.async.Result.toAsynchronousResult = function(value) {
  var result = new e2e.async.Result;
  setTimeout(function() {
    result.callback(value);
  }, 0);
  return result;
};
