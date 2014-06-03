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
 * @fileoverview Provides a PRNG using SHA-1 as a secure next.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.random');

goog.require('goog.array');
goog.require('goog.crypt.Hmac');
goog.require('goog.crypt.Sha1');


/**
 * Random seed to be used to generate random numbers.
 * @type {Array.<number>}
 * @private
 */
e2e.random.seed_ = [];

/**
 * The state of the random function.
 * @type {Array.<number>}
 * @private
 */
e2e.random.state_;


/**
 * The instance used for hashing.
 * @type {!goog.crypt.Sha1}
 * @private
 */
e2e.random.hasher_;


/**
 * Defines if the RNG has been already initialized.
 * @type {boolean}
 * @private
 */
e2e.random.initialized_ = false;


/**
 * Defines if it's acceptable to use the native RNG.
 * @const {boolean}
 */
e2e.random.USE_NATIVE = true;

/**
 * SHA1 output size
 * @const {number}
 * @private
 */
 e2e.random.RNG_INTERNAL_BYTES_ = 20;

/**
 * @param {number} size The number of bytes to generate.
 * @return {?e2e.ByteArray} A list of size random bytes.
 * @private
 */
e2e.random.tryGetNativeRandomInternal_ = function(size) {
  var cryptoObject = e2e.random.getNativeCryptoObject_();
  if (cryptoObject) {
    var array = new Uint8Array(size);
    cryptoObject['getRandomValues'](array);
    return goog.array.clone(array);
  }
  return null;
};

/**
 * The security of this random number is based on HMAC-SHA1 being a pseudorandom
 * function. As such, it should be impossible to guess from the output of it the
 * message that was hashed.
 * @return {e2e.ByteArray} RNG_INTERNAL_BYTES_ of random bytes.
 * @private
 */
e2e.random.getRandomBytesInternal_ = function() {
  var nativeRandom = e2e.random.tryGetNativeRandomInternal_(
      e2e.random.RNG_INTERNAL_BYTES_);
  if (nativeRandom) {
    return nativeRandom;
  }
  if (!e2e.random.initialized_) {
    if (e2e.random.seed_.length < e2e.random.RNG_INTERNAL_BYTES_) {
      throw new Error('Seed is too small.');
    }
    e2e.random.state_ = e2e.random.seed_.slice(
        0, e2e.random.RNG_INTERNAL_BYTES_);
    // Destroy the seed.
    for (var i = 0; i < e2e.random.seed_.length; ++i) {
      e2e.random.seed_[i] = 0;
    }
    e2e.random.hasher_ = new goog.crypt.Sha1();
    e2e.random.initialized_ = true;
  }
  var hmacer = new goog.crypt.Hmac(e2e.random.hasher_, e2e.random.state_);

  // The new state is HMAC(key=state, 0).
  e2e.random.state_ = hmacer.getHmac([0]).slice(
      0, e2e.random.RNG_INTERNAL_BYTES_);
  // The result is HMAC(key=state, 1).
  var res = hmacer.getHmac([1]);
  if (goog.isNull(res)) {
    throw new Error('HMAC returned a null result.');
  }
  return /** @type {e2e.ByteArray} */ (res);
};


/**
 * Get native WebCrypto object, if it's available
 * @return {?Object}
 * @private
 */
e2e.random.getNativeCryptoObject_ = function() {
  if (e2e.random.USE_NATIVE &&
      (typeof goog.global['crypto'] == 'object' ||
          typeof goog.global['msCrypto'] == 'object')) {
    return goog.global['crypto'] || goog.global['msCrypto'];
  }
  return null;
};


/**
 * @param {number} size The number of bytes to generate.
 * @param {Array.<number>=} opt_blacklist A list of bytes to avoid generating.
 * @return {e2e.ByteArray} A list of size random bytes.
 */
e2e.random.getRandomBytes = function(size, opt_blacklist) {
  var random = [];
  var blacklist = opt_blacklist || [];
  if (blacklist.length > 0) {
    while (random.length < size) {
      goog.array.extend(random, goog.array.filter(
          e2e.random.getRandomBytesInternal_(), function(elem) {
            return blacklist.indexOf(elem) < 0;
          }));
    }
  } else { // optimize
    var nativeRandom = e2e.random.tryGetNativeRandomInternal_(size);
    if (nativeRandom) {
      return nativeRandom;
    }
    while (random.length < size) {
      goog.array.extend(random, e2e.random.getRandomBytesInternal_());
    }
  }
  return random.slice(0, size);
};


/**
 * The size of the seed is the size of the biggest data sent in one call.
 * @param {!Array.<number>} bytes The random bytes to add to the pool.
 */
e2e.random.seedRandomBytes = function(bytes) {
  e2e.random.seed_.splice(0, bytes.length);
  goog.array.extend(e2e.random.seed_, bytes);
};


/**
 * Adds the specified numbers of bytes into the seed from the native random.
 * @param {number} size The number of bytes to add to the entropy pool.
 */
e2e.random.seedRandomBytesNative = function(size) {
  var array = new Uint8Array(size);
  var cryptoObject = goog.global['crypto'] || goog.global['msCrypto'];
  cryptoObject['getRandomValues'](array);
  e2e.random.seedRandomBytes(goog.array.clone(array));
};

/**
 * Reset the PRNG.
 */
e2e.random.reset = function() {
  if (e2e.random.initialized_) {
    e2e.random.seed_ = [];
    e2e.random.salt_ = [];
    e2e.random.initialized_ = false;
  }
};
