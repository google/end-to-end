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
 * @fileoverview OTR related helper functions.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr');

goog.require('e2e');
goog.require('e2e.otr.Serializable');
goog.require('e2e.otr.error.InvalidArgumentsError');


/**
 * Serializes arguments into a Uint8Array, calling .serialize as needed.
 * @param {Array.<!Uint8Array|!e2e.otr.Serializable|!e2e.ByteArray>} items
 *     Items to serialize.
 * @return {!Uint8Array} The arguments serialized into a single Uint8Array.
 */
e2e.otr.serializeBytes = function(items) {
  return e2e.otr.concat(goog.array.map(items, function(e) {
    if (e2e.otr.implementationof(e, e2e.otr.Serializable)) {
      return e.serialize();
    } else if (e instanceof Uint8Array ||
        e2e.isByteArray(/** @type {!e2e.ByteArray} */ (e))) {
      return e;
    }
    throw new e2e.otr.error.InvalidArgumentsError(
        'Argument is neither Uint8Array nor e2e.otr.Serializable');
  }));
};


/**
 * Indicates that a given class implements an interface.
 * @param {*} childCtor Implementing class.
 * @param {*} interfaceCtor Implemented interface.
 */
e2e.otr.implements = function(childCtor, interfaceCtor) {
  childCtor.implementedInterfaces_ = childCtor.implementedInterfaces_ || [];
  if (childCtor.implementedInterfaces_.indexOf(interfaceCtor) == -1) {
    childCtor.implementedInterfaces_.push(interfaceCtor);
  }
};


/**
 * Determines if a class implements an interface.
 * @param {*} implementation Implementing class or interface.
 * @param {*} interfaceCtor Implemented interface.
 * @return {boolean} Whether the implementation implements the interface.
 */
e2e.otr.implementationof = function(implementation, interfaceCtor) {
  // get implementedInterfaces_ from constructor if passed instance of class.
  var implementedInterfaces = (typeof implementation == 'function' ?
      implementation : implementation.constructor).implementedInterfaces_ || [];

  return (
    // check if implementation implements interface.
    implementedInterfaces.some(function(e) {
      return e == interfaceCtor || e2e.otr.implementationof(e, interfaceCtor);
    }) ||
    // check if superclass implements interface.
    (implementation.superClass_ &&
      e2e.otr.implementationof(implementation.superClass_.constructor,
          interfaceCtor)) ||
    // return false for falsey values.
    false);
};

/**
 * Concatenates Uint8Arrays or ByteArrays into a Uint8Array.
 * @param {!Array.<!Uint8Array|!e2e.ByteArray>} arrays The Uint8Arrays to
 *     concatenate.
 * @return {!Uint8Array} The concatenated arrays.
 */
e2e.otr.concat = function(arrays) {
  var result = new Uint8Array(arrays.reduce(function(currentLength, element) {
    return currentLength + element.length;
  }, 0));
  var index = 0;
  arrays.forEach(function(e) {
    result.set(e, index);
    index += e.length;
  });
  return result;
};

/**
 * Converts a number to e2e.otr.Byte.
 * @param {number} n The number to convert.
 * @return {!e2e.otr.Byte} The e2e.otr.Byte representation.
 */
e2e.otr.numToByte = function(n) {
  if (n < 0 || n > 0xFF) {
    throw new e2e.otr.error.InvalidArgumentsError('Invalid e2e.otr.Byte.');
  }
  return new Uint8Array([n]);
};

/**
 * Converts a number to e2e.otr.Short.
 * @param {number} n The number to convert.
 * @return {!e2e.otr.Short} The e2e.otr.Short representation.
 */
e2e.otr.numToShort = function(n) {
  if (n < 0 || n > 0xFFFF) {
    throw new e2e.otr.error.InvalidArgumentsError('Invalid e2e.otr.Short.');
  }
  return new Uint8Array([(n & 0xFF00) >>> 8, n & 0x00FF]);
};

/**
 * Converts a number to e2e.otr.Int.
 * @param {number} n The number to convert.
 * @return {!e2e.otr.Int} The e2e.otr.Int representation.
 */
e2e.otr.numToInt = function(n) {
  if (n < 0 || n > 0xFFFFFFFF) {
    throw new e2e.otr.error.InvalidArgumentsError('Invalid e2e.otr.Int.');
  }
  return new Uint8Array(e2e.dwordArrayToByteArray([n]));
};

/**
 * Converts a e2e.otr.Byte to number.
 * @param {!e2e.otr.Byte} n The Byte to convert.
 * @return {number} The number representation.
 */
e2e.otr.byteToNum = function(n) {
  if (n.length != 1) {
    throw new e2e.otr.error.InvalidArgumentsError('Invalid e2e.otr.Byte.');
  }
  return n[0];
};

/**
 * Converts a e2e.otr.Short to number.
 * @param {!e2e.otr.Short} n The Short to convert.
 * @return {number} The number representation.
 */
e2e.otr.shortToNum = function(n) {
  if (n.length != 2) {
    throw new e2e.otr.error.InvalidArgumentsError('Invalid e2e.otr.Short.');
  }
  return n[0] * 0x100 + n[1];
};

/**
 * Converts a e2e.otr.Int to number.
 * @param {!e2e.otr.Int} n The Int to convert.
 * @return {number} The number representation.
 */
e2e.otr.intToNum = function(n) {
  if (n.length != 4) {
    throw new e2e.otr.error.InvalidArgumentsError('Invalid e2e.otr.Int.');
  }
  return e2e.byteArrayToDwordArray(goog.array.clone(n))[0];
};
