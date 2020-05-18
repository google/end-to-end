/**
 * @license
 * Copyright 2012 Google Inc. All rights reserved.
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
 * @fileoverview Module for reading and writing Multiprecision Integers (MPIs)
 * as defined in RFC 4880 Section 3.2.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.Mpi');

goog.require('e2e');
goog.require('e2e.openpgp.error.ParseError');
goog.require('goog.array');


/**
 * Serialize the MPI into a ByteArray.
 * @param {!e2e.ByteArray} number The MPI's value.
 * @return {!e2e.ByteArray} The serialized MPI.
 */
e2e.openpgp.Mpi.serialize = function(number) {
  if (!e2e.isByteArray(number)) {
    throw new e2e.openpgp.error.ParseError('Invalid MPI.');
  }
  var clone = goog.array.clone(number);
  while (!clone[0]) {
    clone.shift();
  }
  // This is the length in bits.
  var length = (clone.length - 1) * 8 + clone[0].toString(2).length;
  var length_bytes = e2e.dwordArrayToByteArray([length]).slice(-2);
  return /** @type {!e2e.ByteArray} */ (
      goog.array.flatten(length_bytes, clone));
};


/**
 * Extracts an MPI from the body, and returns the MPI.
 * @param {!e2e.ByteArray} body The body from where to extract the data.
 * @return {!e2e.ByteArray} The generated packet.
 */
e2e.openpgp.Mpi.parse = function(body) {
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
  return /** @type {!e2e.ByteArray} */ (number);
};
