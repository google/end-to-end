// Copyright 2012 Google Inc. All Rights Reserved.
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
 * @fileoverview Module for reading and writing Multiprecision Integers (MPIs)
 * as defined in RFC 4880 Section 3.2.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.MPI');

goog.require('e2e');
goog.require('e2e.openpgp.error.ParseError');
goog.require('goog.array');


/**
 * An RFC 4880 style MPI. The number would be available as
 * an Array of bytes but should be treated as read-only.
 * @param {e2e.ByteArray} number The MPI's value.
 * @extends {Array}
 * @constructor
 */
e2e.openpgp.MPI = function(number) {
  goog.base(this);
  goog.array.extend(this, number);

};
goog.inherits(e2e.openpgp.MPI, Array);


/**
 * Serialize the MPI into a ByteArray.
 * @return {e2e.ByteArray} The serialized MPI.
 */
e2e.openpgp.MPI.prototype.serialize = function() {
  var number = goog.array.clone(this);
  while (!number[0])number.shift();
  // This is the length in bits.
  var length = (number.length - 1) * 8 + number[0].toString(2).length;
  var length_bytes = e2e.dwordArrayToByteArray([length]).slice(-2);
  return /** @type {e2e.ByteArray} */ (
      goog.array.flatten(length_bytes, number));
};


/**
 * Extracts an MPI from the body, and returns the MPI.
 * @param {e2e.ByteArray} body The body from where to extract the data.
 * @return {!e2e.openpgp.MPI} The generated packet.
 */
e2e.openpgp.MPI.parse = function(body) {
  if (body.length > 1) {
  } else {
    throw new e2e.openpgp.error.ParseError('MPI is too small');
  }
  // The first two bytes are the size in bits.
  var encoded_length = body.splice(0, 2);
  var length = e2e.byteArrayToDwordArray(
      [0, 0].concat(encoded_length))[0];
  var consume = Math.floor((length + 7) / 8);
  var number = body.splice(0, consume);
  if (number.length != consume || !e2e.isByteArray(number)) {
    throw new e2e.openpgp.error.ParseError('Invalid MPI.');
  }
  return new e2e.openpgp.MPI(number);
};
