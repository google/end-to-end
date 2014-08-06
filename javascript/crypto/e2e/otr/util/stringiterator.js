// Copyright 2014 Google Inc. All Rights Reserved.
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
 * @fileoverview String iterator helper class.
 *
 * @author rcc@google.com (Ryan Chan)
 */


goog.provide('e2e.otr.util.StringIterator');


/**
 * Creates an instance of a string iterator.
 * @param {string} str The string to iterate.
 * @constructor
 */
e2e.otr.util.StringIterator = function(str) {
  this.string_ = str;
  this.index_ = 0;
};


/**
 * Returns whether or not there are more characters in the string.
 * @return {boolean} Whether or not there are more characters in the string.
 */
e2e.otr.util.StringIterator.prototype.hasNext = function() {
  return this.index_ < this.string_.length;
};


/**
 * Gets up to the next opt_howMany characters of the string.
 * @param {number} opt_howMany Positive number of characters to get, default 1.
 * @return {string} Up to the next opt_howMany characters from the string.
 */
e2e.otr.util.StringIterator.prototype.next = function(opt_howMany) {
  return this.string_.substring(this.index_, this.index_ += (opt_howMany || 1));
};


/**
 * Gets up to the next opt_howMany characters of the string without advancing.
 * @param {number} opt_howMany Positive number of characters to get, default 1.
 * @return {string} Up to the next opt_howMany characters from the string.
 */
e2e.otr.util.StringIterator.prototype.peek = function(opt_howMany) {
  return this.string_.substring(this.index_, this.index_ + (opt_howMany || 1));
};
