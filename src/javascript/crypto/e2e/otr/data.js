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
 * @fileoverview Defines the DATA type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.Data');

goog.require('e2e.otr');
goog.require('e2e.otr.Serializable');
goog.require('e2e.otr.Storable');
goog.require('e2e.otr.error.ParseError');



/**
 * An OTRv3 DATA type. The data would be available as
 * an Array of bytes but should be treated as read-only.
 * @constructor
 * @implements {e2e.otr.Serializable}
 * @extends {e2e.otr.Storable}
 * @param {!Uint8Array} data The DATA's contents.
 */
e2e.otr.Data = function(data) {
  this.data_ = new Uint8Array(data);
  // TODO(rcc): Avoid calling implements every time class is instantiated.
  e2e.otr.implements(e2e.otr.Data, e2e.otr.Serializable);
};
goog.inherits(e2e.otr.Data, e2e.otr.Storable);


/**
 * Serialize the Data into a Uint8Array.
 * @override
 * @return {!Uint8Array} The serialized MPI.
 */
e2e.otr.Data.prototype.serialize = function() {
  return e2e.otr.concat([e2e.otr.numToInt(this.data_.length), this.data_]);
};


/**
 * Deconstructs DATA into a Uint8Array
 * @return {!Uint8Array} The DATA contents
 */
e2e.otr.Data.prototype.deconstruct = function() {
  return new Uint8Array(this.data_);
};


/**
 * Extracts an DATA from the body, and returns the DATA.
 * @param {!Uint8Array} body The body from where to extract the data.
 * @return {!e2e.otr.Data} The generated packet.
 */
e2e.otr.Data.parse = function(body) {
  if (body.length < 4) {
    throw new e2e.otr.error.ParseError('Invalid DATA: expected 4 byte length.');
  }

  // The first four bytes are the size in bytes.
  var length = e2e.otr.intToNum(body.subarray(0, 4));

  var number = body.subarray(4, 4 + length);
  if (number.length != length) {
    throw new e2e.otr.error.ParseError('Invalid DATA payload.');
  }

  return new e2e.otr.Data(number);
};


/** @inheritDoc */
e2e.otr.Data.prototype.pack = function() {
  return Array.apply(this.data_);
};


/** @inheritDoc */
e2e.otr.Data.unpack = function(data) {
  assert(goog.isArrayLike(data));
  return new e2e.otr.Data(new Uint8Array(/** @type {!Array} */ (data)));
};
