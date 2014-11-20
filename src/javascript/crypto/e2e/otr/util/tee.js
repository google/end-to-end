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
 * @fileoverview Tee helper class.
 *
 * @author rcc@google.com (Ryan Chan)
 */


goog.provide('e2e.otr.util.Tee');



/**
 * Creates an instance of a Tee.  Changing the underlying storage modifies data.
 * @constructor
 * @param {!e2e.ByteArray=} opt_storage Use a given ByteArray for storage.
 */
e2e.otr.util.Tee = function(opt_storage) {
  this.storage_ = opt_storage || [];
};


/**
 * Tees the given data.
 * @template T
 * @param {T} data The data to tee.
 * @return {T} The data that was passed in.
 */
e2e.otr.util.Tee.prototype.tee = function(data) {
  /**
   * @param {!Uint8Array|!e2e.ByteArray} data The data to tee.
   * @return {!Uint8Array|!e2e.ByteArray}
   */
  var fn = goog.bind(function() {
    Array.prototype.push.apply(this.storage_, data);
    return data;
  }, this);

  return fn(data);
};


/**
 * Dumps the stored data.
 * @return {!e2e.ByteArray} The stored data.
 */
e2e.otr.util.Tee.prototype.dump = function() {
  return this.storage_;
};
