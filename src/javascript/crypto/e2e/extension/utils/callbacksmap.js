/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
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

goog.provide('e2e.ext.utils.CallbackPair');
goog.provide('e2e.ext.utils.CallbacksMap');

goog.require('goog.string');
goog.require('goog.structs.Map');


/**
 * @typedef {{callback:function(*), errback:function(Error)}}
 */
e2e.ext.utils.CallbackPair;



/**
 * A map to store callbacks and an errback to a given asynchronous request.
 * @constructor
 * @extends {goog.structs.Map.<string, !e2e.ext.utils.CallbackPair>}
 */
e2e.ext.utils.CallbacksMap = function() {
  goog.base(this);
};
goog.inherits(e2e.ext.utils.CallbacksMap, goog.structs.Map);


/**
 * Inserts a pair of callbacks into the map under a new unique key.
 * @param {function(...)} callback The callback function.
 * @param {function(Error)} errback The function that will be called upon error.
 * @return {string} The key under which the callback have been stored.
*/
e2e.ext.utils.CallbacksMap.prototype.addCallbacks = function(callback,
    errback) {
  var requestId;
  do {
    requestId = goog.string.getRandomString();
  } while (this.containsKey(requestId));
  this.set(requestId, {callback: callback, errback: errback});
  return requestId;
};


/**
 * Returns a callback pair, removing it from the map. Throws an error if a
 * key has no callbacks available.
 * @param  {string} key
 * @return {!e2e.ext.utils.CallbackPair}
 */
e2e.ext.utils.CallbacksMap.prototype.getAndRemove = function(key) {
  var pair = this.get(key);
  if (!pair) {
    throw new Error('No callbacks for a given key.');
  }
  this.remove(key);
  return pair;
};
