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
 * @fileoverview Implementations of Encoding Method of Encryption (EME) in
 * PKCS#1.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.pkcs.eme.Oaep');
goog.provide('e2e.pkcs.eme.Pkcs1');

goog.require('e2e');
goog.require('e2e.fixedtiming');
goog.require('e2e.hash.Sha1');
goog.require('e2e.pkcs.Error');
goog.require('e2e.random');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.crypt');
goog.require('goog.object');



/**
 * The OAEP encoding method as described in RFC 3447 section 7.1 with SHA-1,
 *     MGF1 and an empty label. This is compatible with OpenSSL's
 *     RSA_PKCS1_OAEP_PADDING padding mode.
 * @constructor
 */
e2e.pkcs.eme.Oaep = function() {
  /**
   * The SHA-1 hash of the empty label, used to verify the decryption.
   * Is equivalent to the output of new e2e.hash.Sha1().hash([]).
   * @private {!e2e.ByteArray}
   */
  this.labelHash_ = [
    0xda, 0x39, 0xa3, 0xee, 0x5e, 0x6b, 0x4b, 0x0d, 0x32, 0x55,
    0xbf, 0xef, 0x95, 0x60, 0x18, 0x90, 0xaf, 0xd8, 0x07, 0x09];
};


/**
 * The length of hash output used in OAEP encoding.
 * @type {number}
 * @const
 */
e2e.pkcs.eme.Oaep.HASH_LENGTH = 20;


/**
 * Encodes the given message according to the OAEP method as described in
 *     RFC 3447 section 7.1.1 with SHA-1, MGF1 and an empty label.
 * @param {number} k The size of the key in bytes.
 * @param {!e2e.ByteArray} m The message to encode.
 * @return {!e2e.ByteArray} The encoded message.
 */
e2e.pkcs.eme.Oaep.prototype.encode = function(k, m) {
  // OAEP can operate only on messages of length up to k - 2hLen - 2 octets,
  // where hlen is the length of the output from the underlying hash function,
  // which is SHA-1 in this case, and k is the length in octets of the modulus.
  if (m.length > k - this.labelHash_.length - 2) {
    throw new e2e.pkcs.Error('Message too long.');
  }
  var ps = goog.array.repeat(
      0x00, k - m.length - this.labelHash_.length * 2 - 2);
  var db = goog.array.flatten(this.labelHash_, ps, 0x01, m);
  goog.asserts.assert(db.length == k - this.labelHash_.length - 1);

  var seed = e2e.random.getRandomBytes(this.labelHash_.length);
  var dbMask = this.maskGenerationFunction_(
      seed, k - this.labelHash_.length - 1);
  var maskedDb = goog.crypt.xorByteArray(db, dbMask);
  var seedMask = this.maskGenerationFunction_(
      maskedDb, this.labelHash_.length);
  var maskedSeed = goog.crypt.xorByteArray(seed, seedMask);

  return [0x00].concat(maskedSeed).concat(maskedDb);
};


/**
 * Decodes the given message according to the OAEP method as defined in
 *     RFC 3447 section 7.1.2 with SHA-1, MGF1 and an empty label.
 *     Note: this function does not make length check as length is checked in
 *     the decryption function as specified in the RFC. Throwing additional
 *     errors may lead to timing attack. As a result, it must not be used
 *     anywhere except in the context of RSA-OAEP decryption or interoperative
 *     testing.
 * @param {number} k The size of the key in bytes.
 * @param {!e2e.ByteArray} em The encoded message.
 * @return {?e2e.ByteArray} The decoded message or null if decoding has
 * error.
 */
e2e.pkcs.eme.Oaep.prototype.decode = function(k, em) {
  var maskedSeed = em.slice(1, this.labelHash_.length + 1);
  var maskedDb = em.slice(this.labelHash_.length + 1);
  var seedMask = this.maskGenerationFunction_(
      maskedDb, this.labelHash_.length);
  var seed = goog.crypt.xorByteArray(maskedSeed, seedMask);
  var dbMask = this.maskGenerationFunction_(
      seed, k - this.labelHash_.length - 1);
  var db = goog.crypt.xorByteArray(maskedDb, dbMask);
  var labelHash = db.slice(0, this.labelHash_.length);
  var paddedMsg = db.slice(this.labelHash_.length);
  // In fixed-timing up to the length of paddedMsg, find the first possition of
  // 0x1 in paddedMsg and checks that all bytes before it are zero.
  var foundOne = 0;
  var indexOne = -1;
  var allZerosBeforeOne = 1;
  for (var i = 0; i < paddedMsg.length; i++) {
    // Best effort fixed-timing number comparisons.
    var isOne = (paddedMsg[i] === 1) | 0;
    var isZero = (paddedMsg[i] === 0) | 0;
    indexOne = e2e.fixedtiming.select(i, indexOne, isOne & (foundOne ^ 1));
    foundOne |= isOne;
    allZerosBeforeOne = e2e.fixedtiming.select(0, allZerosBeforeOne,
        (isZero ^ 1) & (foundOne ^ 1));
  }
  // Make sure that the errors are indistinguishable, otherwise it's vulnerable
  // to timing attack.
  var error = 0;
  error |= em[0];
  error |= (!e2e.compareByteArray(this.labelHash_, labelHash) | 0);
  error |= (foundOne ^ 1);
  error |= (allZerosBeforeOne ^ 1);
  if (error) {
    return null;
  }
  return paddedMsg.slice(indexOne + 1);
};


/**
 * Mask generation function (MGF1) used in the OAEP encoding method as
 *     described in RFC 3447 section B.2.1 and RFC 2437 section 10.2.1.
 *     This is the mask function used in OpenSSL.
 * @param {!e2e.ByteArray} seed The seed from which mask is generated.
 * @param {number} maskLen intended length in octets of the mask, at most
 *     2^32 * HashLength.
 * @return {!e2e.ByteArray}
 * @private
 */
e2e.pkcs.eme.Oaep.prototype.maskGenerationFunction_ =
    function(seed, maskLen) {
  if (maskLen > (this.labelHash_.length * 0x100000000)) {
    throw new e2e.pkcs.Error('Mask too long.');
  }
  var mask = [];
  var n = Math.ceil(maskLen / this.labelHash_.length);
  for (var i = 0; i < n; ++i) {
    mask = mask.concat(new e2e.hash.Sha1().hash(
        seed.concat(e2e.dwordArrayToByteArray([i]))));
  }
  goog.asserts.assert(mask.length >= maskLen);
  return mask.slice(0, maskLen);
};



/**
 * The PKCS#1 version 1.5 encoding method as described in RFC 3447. This is
 *     compatible with OpenSSL's RSA_PKCS1_PADDING padding mode.
 * @constructor
 */
e2e.pkcs.eme.Pkcs1 = function() {
};


/**
 * Encodes the given message according to EME PKCS1-v1.5.
 * @param {number} k The size of the key in bytes.
 * @param {!e2e.ByteArray} m The message to encode.
 * @return {!e2e.ByteArray} The encoded message.
 */
e2e.pkcs.eme.Pkcs1.prototype.encode = function(k, m) {
  var em, ps;
  if (m.length > k - 11) {
    throw new e2e.pkcs.Error('Message too long.');
  }
  ps = e2e.random.getRandomBytes(k - m.length - 3, [0]);
  em = [0x00, 0x02].concat(ps).concat([0x00]).concat(m);
  return em;
};


/**
 * Defines the status of a state machine to decode EME encoded messages.
 * @enum {number}
 */
e2e.pkcs.eme.Pkcs1.DecodeState = {
  'START': 1,
  'HEADER': 2,
  'RANDOM': 3,
  'KEY': 4,
  'UNDEFINED': 5
};


/**
 * Type for transitions in for the decoding of EME PKCS packages.
 * @typedef {{error:number, state:e2e.pkcs.eme.Pkcs1.DecodeState}}
 */
e2e.pkcs.eme.Pkcs1.Transition;


/**
 * Type for transitions in for the decoding of EME PKCS packages.
 * @typedef {Object.<string, e2e.pkcs.eme.Pkcs1.Transition>}
 */
e2e.pkcs.eme.Pkcs1.TransitionMap;


/**
 * @type {Object.<e2e.pkcs.eme.Pkcs1.DecodeState,
 *     e2e.pkcs.eme.Pkcs1.TransitionMap>}
 */
e2e.pkcs.eme.Pkcs1.decodeStateTransitions = {};
e2e.pkcs.eme.Pkcs1.decodeStateTransitions[
    e2e.pkcs.eme.Pkcs1.DecodeState.START] = {
  '0': {
    'error': 0,
    'state': e2e.pkcs.eme.Pkcs1.DecodeState.START
  },
  '2': {
    'error': 0,
    'state': e2e.pkcs.eme.Pkcs1.DecodeState.RANDOM
  },
  'default': {
    'error': 1,
    'state': e2e.pkcs.eme.Pkcs1.DecodeState.RANDOM
  }
};
e2e.pkcs.eme.Pkcs1.decodeStateTransitions[
    e2e.pkcs.eme.Pkcs1.DecodeState.RANDOM] = {
  '0': {
    'error': 0,
    'state': e2e.pkcs.eme.Pkcs1.DecodeState.KEY
  },
  'default': {
    'error': 0,
    'state': e2e.pkcs.eme.Pkcs1.DecodeState.RANDOM
  }
};
e2e.pkcs.eme.Pkcs1.decodeStateTransitions[
    e2e.pkcs.eme.Pkcs1.DecodeState.KEY] = {
  'default': {
    'error': 0,
    'state': e2e.pkcs.eme.Pkcs1.DecodeState.KEY
  }
};
e2e.pkcs.eme.Pkcs1.decodeStateTransitions[
    e2e.pkcs.eme.Pkcs1.DecodeState.UNDEFINED] = {
  'default': {
    'error': 1,
    'state': e2e.pkcs.eme.Pkcs1.DecodeState.UNDEFINED
  }
};


/**
 * Stores the transitions on a per-byte array to make access faster than a
 * hash table (object/dictionary).
 * @type {Object.<e2e.pkcs.eme.Pkcs1.DecodeState,
 *     Object.<number, e2e.pkcs.eme.Pkcs1.Transition>>}
 */
e2e.pkcs.eme.Pkcs1.decodeStateTransitionsArray = {};


/**
 * Converts a decodeStateTransitions to an Array to accelerate access time.
 * @param {Object.<(string|number), e2e.pkcs.eme.Pkcs1.Transition>}
 *     trans The transitions to set in the Array.
 * @param {e2e.pkcs.eme.Pkcs1.DecodeState} state The state that the
 *     list of transitions refers to.
 */
e2e.pkcs.eme.Pkcs1.decodeStateToArray = function(trans, state) {
  var arr = [];
  for (var i = 0; i < 256; i++) {
    arr.push(trans[i] || trans['default']);
  }
  e2e.pkcs.eme.Pkcs1.decodeStateTransitionsArray[state] = arr;
};

goog.object.forEach(e2e.pkcs.eme.Pkcs1.decodeStateTransitions,
                    e2e.pkcs.eme.Pkcs1.decodeStateToArray);


/**
 * Decodes the given encoded message according to EME PKCS1-v1.5. This MUST be
 * done close to constant time, that's why we have a state machine.
 * @param {!e2e.ByteArray} em The data to decode.
 * @param {number=} opt_messageLength The expected length of the message.
 * @param {number=} opt_keySize The size of the key (which should be em size).
 * @return {!e2e.ByteArray} The decoded message.
 */
e2e.pkcs.eme.Pkcs1.prototype.decode = function(
    em, opt_messageLength, opt_keySize) {
  var error = 0;
  var msg = [];
  var em2 = em.splice(0);
  if (goog.isDef(opt_messageLength) && goog.isDef(opt_keySize)) {
    if (opt_keySize == em.length + 1) {
      // Some implementations remove leading 0's, so we add them back.
      em.unshift(0);
    }
    // We know the length of the key, so we don't need to scan.
    msg = em2.slice(-opt_messageLength);
    var paddingLength = em2.length - opt_messageLength;
    // Should be 0.
    error |= em[0];
    // Should be 2.
    error |= em[1] - 2;
    for (var i = 2; i < paddingLength; i++) {
      // Should be anything but 0.
      error |= em[i] ^ 0xFF;
    }
    // Should be 0.
    error |= em[paddingLength];
  } else {
    var state = e2e.pkcs.eme.Pkcs1.DecodeState.START;

    var nextState = e2e.pkcs.eme.Pkcs1.decodeStateTransitionsArray;
    var undef = nextState[
        e2e.pkcs.eme.Pkcs1.DecodeState.UNDEFINED];
    var c = goog.object.getCount(
        e2e.pkcs.eme.Pkcs1.DecodeState) + 1;
    var accumulators = [];
    for (var i = 0; i < c; i++) {
      accumulators[i] = [];
    }
    msg = accumulators[e2e.pkcs.eme.Pkcs1.DecodeState.KEY];
    var rnd = accumulators[e2e.pkcs.eme.Pkcs1.DecodeState.RANDOM];

    if (em2.length < 10) {
      em2 = goog.array.repeat(0, 10);
      error = 1;
    }

    goog.array.forEach(em2, function(b, i) {
      // === WARNING ===
      // If we can't know the expected length of the key, we need to visit all
      // bytes in constant time to verify they are valid. Don't add any code
      // that might fork in this function.
      var hasError, newState;
      var newStateObj = nextState[state][b];
      newState = newStateObj.state;
      hasError = newStateObj.error;
      accumulators[state].push(b);
      error |= hasError;
      state = newState;
    });
    error |= 1 * (msg.length == 0);
    error |= 1 * (rnd.length <= 8);
  }

  if (error) {
    throw new e2e.pkcs.Error('Decryption error.');
  }
  return msg;
};
