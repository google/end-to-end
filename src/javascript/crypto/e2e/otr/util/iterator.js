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
 * @fileoverview String iterator helper class.
 *
 * @author rcc@google.com (Ryan Chan)
 */


goog.provide('e2e.otr.util.Iterator');

goog.require('e2e.otr');
goog.require('e2e.otr.error.InvalidArgumentsError');



/**
 * Creates an instance of an iterator.
 * @constructor
 * @template T
 * @param {T} iterable The iterable to iterate
 */
e2e.otr.util.Iterator = function(iterable) {
  this.sliceFn_ = iterable &&
      (goog.isFunction(iterable.slice) ? iterable.slice : iterable.subarray);

  // Duck-typed sanity checking.
  if (!iterable || typeof iterable.length != 'number' ||
      !goog.isFunction(this.sliceFn_)) {
    throw new e2e.otr.error.InvalidArgumentsError('Iterable not supported.');
  }

  this.iterable_ = iterable;
  this.index_ = 0;
};


/**
 * Returns whether or not there are more elements in the iterator.
 * @return {boolean} Whether or not there are more elements in the iterator.
 */
e2e.otr.util.Iterator.prototype.hasNext = function() {
  return this.index_ < this.iterable_.length;
};


/**
 * Gets up to the next opt_howMany elements of the iterator.
 * @param {number=} opt_howMany Positive number of elements to get, default 1.
 * @return {T} Up to the next opt_howMany elements from the iterator.
 */
e2e.otr.util.Iterator.prototype.next = function(opt_howMany) {
  return this.sliceFn_.call(this.iterable_, this.index_,
      this.index_ += (opt_howMany || 1));
};


/**
 * Gets up to the next opt_howMany elements of the iterator without advancing.
 * @param {number=} opt_howMany Positive number of elements to get, default 1.
 * @return {T} Up to the next opt_howMany elements from the iterator.
 */
e2e.otr.util.Iterator.prototype.peek = function(opt_howMany) {
  return this.sliceFn_.call(this.iterable_, this.index_,
      this.index_ + (opt_howMany || 1));
};


/**
 * Gets the rest of the iterator.
 * @return {T} The remainder of the elements.
 */
e2e.otr.util.Iterator.prototype.rest = function() {
  return this.next(this.iterable_.length);
};


/**
 * Gets a 4 byte length encoded chunk from the data stream.
 * @return {T} Up to (4 + len) bytes from the iterator including length bytes.
 */
e2e.otr.util.Iterator.prototype.nextEncoded = function() {
  var len = this.next(4);
  return e2e.otr.concat([len, this.next(e2e.otr.intToNum(len))]);
};
