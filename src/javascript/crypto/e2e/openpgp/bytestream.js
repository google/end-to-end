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
 * @fileoverview Array with limited API, optimized only for splice
 *     from the beginning operations.
 *
 * @author koto@google.com (Krzysztof Kotowicz)
 */

goog.provide('e2e.openpgp.ByteStream');

goog.require('goog.asserts');



/**
 * ByteStream object with an API emulating Array, but exposing only splice(0,x)
 * and shift() functions and a length property.
 * Use it when repeatedly slicing from the left of a large array for
 * optimization.
 * @param {e2e.ByteArray} array Internal array
 * @constructor
 */
e2e.openpgp.ByteStream = function(array) {
  /**
   * @type {e2e.ByteArray}
   * @private
   */
  this.array_ = array;


  /**
   * @type {number}
   */
  this.length = array.length;

  /**
   * @type {number}
   * @private
   */
  this.index_ = 0;
};


/**
 * Removes elements from the front of an array, returning them.
 * @param {number} index The index at which to start changing the array.
 *     Must be 0. Parameter is left for the API to be compatible with Array.
 * @param {number} howMany How many elements to remove (0 means no removal).
 * @return {e2e.ByteArray} Extracted elements
 */
e2e.openpgp.ByteStream.prototype.splice = function(index,
    howMany) {
  // Only splice(0, x) is supported. Adding elements is not supported.
  goog.asserts.assert(index == 0);
  goog.asserts.assert(howMany >= 0);
  goog.asserts.assert(arguments.length == 2);
  goog.asserts.assert(this.index_ + howMany <= this.array_.length);
  var slice = this.array_.slice(this.index_, this.index_ +
      howMany);
  this.length -= howMany;
  this.index_ += howMany;
  return slice;
};


/**
 * Returns the first element, removing it from the array.
 * @return {number}
 */
e2e.openpgp.ByteStream.prototype.shift = function() {
  return this.splice(0, 1)[0];
};


/**
 * Returns the array after performing all splice() and shift() operations.
 * @return {e2e.ByteArray}
 */
e2e.openpgp.ByteStream.prototype.toArray = function() {
  return this.array_.slice(this.index_);
};
