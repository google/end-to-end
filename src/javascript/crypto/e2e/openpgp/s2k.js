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
 * @fileoverview Implements RFC 4880 String to Key specification.
 * @author evn@google.com (Eduardo Vela)
 * @author adhintz@google.com (Drew Hintz)
 * @author coruus@gmail.com (David Leon Gil)
 */

goog.provide('e2e.openpgp.DummyS2k');
goog.provide('e2e.openpgp.IteratedS2K');
goog.provide('e2e.openpgp.S2k');
goog.provide('e2e.openpgp.SaltedS2K');
goog.provide('e2e.openpgp.SimpleS2K');


goog.require('e2e');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.constants.Type');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.object');



/**
 * Generates an S2K object with the specified type, salt and count as specified
 * in RFC 4880 Section 3.7. We have subclasses for the different types of S2K.
 * @param {e2e.hash.Hash} hash An instance of the hash algorithm to use.
 * @constructor
 */
e2e.openpgp.S2k = function(hash) {
  /**
   * An instance of the hash algorithm to use.
   * @type {e2e.hash.Hash}
   * @protected
   */
  this.hash = hash;
};


/**
 * Maximum number of bytes in salt.
 * @type {number}
 * @const
 */
e2e.openpgp.S2k.MAX_SALT_SIZE = 8;


/**
 * The different types of S2K algorithms.
 * @enum {number}
 */
e2e.openpgp.S2k.Type = {
  'SIMPLE': 0,
  'SALTED': 1,
  'ITERATED': 3,
  'DUMMY': 101
};


/**
 * The type of s2k algorithm to use.
 * @type {e2e.openpgp.S2k.Type}
 */
e2e.openpgp.S2k.prototype.type;


/**
 * Generates a key from the given input. To be implemented by the subclasses.
 * @param {!e2e.ByteArray} passphrase A ByteArray representation of the
 *     passphrase (must be encoded in UTF-8).
 * @param {number} length The length of the key requested.
 * @return {!e2e.ByteArray} The key generated from that passphrase using
 *     the S2K algorithm.
 */
e2e.openpgp.S2k.prototype.getKey = goog.abstractMethod;


/**
 * Serializes the S2K object to a string.
 * @return {!e2e.ByteArray} The serialized S2K.
 */
e2e.openpgp.S2k.prototype.serialize = function() {
  return goog.array.concat(
      this.type,
      this.hash ? e2e.openpgp.constants.getId(this.hash.algorithm) : 0);
};


/**
 * Parses (and extracts) an S2K object from the given ByteArray.
 * Throws e2e.openpgp.error.Error if it fails.
 * @param {!e2e.ByteArray} bytes The ByteArray to extract the S2K from.
 * @return {e2e.openpgp.S2k} The generated S2K instance.
 */
e2e.openpgp.S2k.parse = function(bytes) {
  var type = bytes.shift();
  if (!goog.object.containsValue(e2e.openpgp.S2k.Type, type)) {
    throw new e2e.openpgp.error.ParseError('Invalid S2K type.');
  }
  type = /** @type {e2e.openpgp.S2k.Type} */ (type);
  var hid = bytes.shift();
  var hash;
  if (type == e2e.openpgp.S2k.Type.DUMMY && !hid) {
    // Allow empty hash algo for dummy s2k.
    hash = null;
  } else {
    hash = e2e.openpgp.constants.getInstance(
        e2e.openpgp.constants.Type.HASH, hid);
  }
  hash = /** @type {e2e.hash.Hash} */ (hash);
  var salt, encodedCount;
  if (type === e2e.openpgp.S2k.Type.SALTED ||
      type === e2e.openpgp.S2k.Type.ITERATED) {
    salt = bytes.splice(0, 8);
    if (salt.length != 8) {
      throw new e2e.openpgp.error.ParseError('Invalid S2K packet.');
    }
    if (type === e2e.openpgp.S2k.Type.ITERATED) {
      encodedCount = bytes.shift();
      return new e2e.openpgp.IteratedS2K(hash, salt, encodedCount);
    } else {
      return new e2e.openpgp.SaltedS2K(hash, salt);
    }
  } else if (type === e2e.openpgp.S2k.Type.SIMPLE) {
    return new e2e.openpgp.SimpleS2K(hash);
  } else if (type === e2e.openpgp.S2k.Type.DUMMY) {
    /* We're basing this on GnuPG's dummy S2k extension. First three bytes are
     * 'E2E' or 'GPG', last byte is a mode. See the enums defined below for
     * the values of these modes.
     */
    var header = bytes.splice(0, 3);
    if (header.length === 3 && bytes.length >= 1) {
      return new e2e.openpgp.DummyS2k(hash, header, bytes.shift());
    }
  }
  // TODO(evn): Implement a scrypt KDF as a new S2K type.
  throw new e2e.openpgp.error.ParseError('Invalid S2K type.');
};



/**
 * Implements a dummy S2k algorithm for E2E.
 * @param {e2e.hash.Hash} hash An instance of the hash algorithm to use.
 * @param {!e2e.ByteArray} header ['E','2','E'] or ['G','N','U']
 * @param {number} mode A byte indicating S2k mode
 * @constructor
 * @extends {e2e.openpgp.S2k}
 */
e2e.openpgp.DummyS2k = function(hash, header, mode) {
  goog.asserts.assert(
      header.length === e2e.openpgp.DummyS2k.E2E_HEADER.length &&
      header.length === e2e.openpgp.DummyS2k.GPG_HEADER.length);
  var is_e2e = goog.array.equals(header, e2e.openpgp.DummyS2k.E2E_HEADER);
  var is_gpg = goog.array.equals(header, e2e.openpgp.DummyS2k.GPG_HEADER);

  this.dummy = is_e2e ? e2e.openpgp.DummyS2k.DummyTypes.E2E :
                        e2e.openpgp.DummyS2k.DummyTypes.GPG;
  var mode_enum = is_e2e ? e2e.openpgp.DummyS2k.E2E_modes :
                           e2e.openpgp.DummyS2k.GPG_modes;
  if (!goog.object.containsValue(mode_enum, mode)) {
    throw new e2e.openpgp.error.ParseError('Invalid S2k mode.');
  }

  if (is_e2e) {
    this.mode = /** @type {e2e.openpgp.DummyS2k.E2E_modes}*/ (mode);
  } else if (is_gpg) {
    this.mode = /** @type {e2e.openpgp.DummyS2k.GPG_modes}*/ (mode);
  } else {
    throw new e2e.openpgp.error.ParseError('Invalid dummy S2k header!');
  }
  goog.base(this, hash);
};
goog.inherits(e2e.openpgp.DummyS2k, e2e.openpgp.S2k);


/**
 * Enum for different dummy S2ks
 * @enum {number}
 */
e2e.openpgp.DummyS2k.DummyTypes = {
  GPG: 0,
  E2E: 1
};


/** @type {!e2e.openpgp.DummyS2k.DummyTypes} */
e2e.openpgp.DummyS2k.prototype.dummy;


/** @type {e2e.openpgp.DummyS2k.GPG_modes | e2e.openpgp.DummyS2k.E2E_modes} */
e2e.openpgp.DummyS2k.prototype.mode;


/**
 * Enum for GPG modes
 * @enum {number}
 */
e2e.openpgp.DummyS2k.GPG_modes = {
  NO_SECRET: 0x01,
  SMARTCARD_STUB: 0x02
};


/**
 * Enum for E2E modes (currently, upper 6 bits are reserved for future
 * extensions)
 * @enum {number}
 */
e2e.openpgp.DummyS2k.E2E_modes = {
  SERIALIZED: 0x0,
  WEB_CRYPTO: 0x1,
  HARDWARE: 0x2
};


/** @inheritDoc */
e2e.openpgp.DummyS2k.prototype.type = e2e.openpgp.S2k.Type.DUMMY;


/** @inheritDoc */
e2e.openpgp.DummyS2k.prototype.getKey = function(passphrase, length) {
  throw new e2e.openpgp.error.UnsupportedError(
      'Cannot get key from special locations!');
};


/** @type {!e2e.ByteArray} */
e2e.openpgp.DummyS2k.GPG_HEADER = [0x47, 0x4e, 0x55]; // 'GNU'


/** @type {!e2e.ByteArray} */
e2e.openpgp.DummyS2k.E2E_HEADER = [0x45, 0x32, 0x45]; // 'E2E'


/** @inheritDoc */
e2e.openpgp.DummyS2k.prototype.serialize = function() {
  return goog.array.concat(
      goog.base(this, 'serialize'),
      this.is_e2e_ ? e2e.openpgp.DummyS2k.E2E_HEADER :
      e2e.openpgp.DummyS2k.GPG_HEADER,
      this.mode);
};



/**
 * Implements the Simple S2K algorithm.
 * @param {e2e.hash.Hash} hash An instance of the hash algorithm to use.
 * @constructor
 * @extends {e2e.openpgp.S2k}
 */
e2e.openpgp.SimpleS2K = function(hash) {
  goog.base(this, hash);
};
goog.inherits(e2e.openpgp.SimpleS2K, e2e.openpgp.S2k);


/** @inheritDoc */
e2e.openpgp.SimpleS2K.prototype.type = e2e.openpgp.S2k.Type.SIMPLE;


/** @inheritDoc */
e2e.openpgp.SimpleS2K.prototype.getKey = function(passphrase, length) {
  var hashed = [], original_length = length;
  while (length > 0) {
    // Hash the passphrase repeatedly by appending 0's at the beginning.
    var checksum = this.hash.hash(passphrase);
    passphrase.unshift(0);
    length -= checksum.length;
    goog.array.extend(hashed, checksum);
  }
  return hashed.slice(0, original_length);
};



/**
 * Implements the Salted S2K algorithm. Throws e2e.openpgp.error.Error if it
 * fails.
 * @param {e2e.hash.Hash} hash An instance of the hash algorithm to use.
 * @param {!e2e.ByteArray} salt The salt to use for the S2K.
 * @constructor
 * @extends {e2e.openpgp.SimpleS2K}
 */
e2e.openpgp.SaltedS2K = function(hash, salt) {
  goog.base(this, hash);
  if (salt.length != 8 || !e2e.isByteArray(salt)) {
    throw new e2e.openpgp.error.InvalidArgumentsError('Invalid salt.');
  }
  /**
   * The salt for the key.
   * @type {!e2e.ByteArray}
   * @private
   */
  this.salt_ = salt;
};
goog.inherits(e2e.openpgp.SaltedS2K, e2e.openpgp.SimpleS2K);


/** @inheritDoc */
e2e.openpgp.SaltedS2K.prototype.type = e2e.openpgp.S2k.Type.SALTED;


/** @inheritDoc */
e2e.openpgp.SaltedS2K.prototype.getKey = function(passphrase, length) {
  var salted_passphrase = this.salt_.concat(passphrase);
  return goog.base(this, 'getKey', salted_passphrase, length);
};


/** @inheritDoc */
e2e.openpgp.SaltedS2K.prototype.serialize = function() {
  return goog.array.concat(
      goog.base(this, 'serialize'),
      this.salt_);
};



/**
 * Implements the Iterated S2K algorithm. Throws e2e.openpgp.error.Error if
 * it fails.
 * @param {e2e.hash.Hash} hash An instance of the hash algorithm to use.
 * @param {!e2e.ByteArray} salt The salt to use for the S2K.
 * @param {number} encodedCount The encoded number of bytes to be hashed.
 * @constructor
 * @extends {e2e.openpgp.SimpleS2K}
 */
e2e.openpgp.IteratedS2K = function(hash, salt, encodedCount) {
  goog.base(this, hash);
  if (salt.length != 8 || !e2e.isByteArray(salt)) {
    throw new e2e.openpgp.error.InvalidArgumentsError('Invalid salt.');
  }
  if (!e2e.isByte(encodedCount)) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Invalid encoded count.');
  }
  /**
   * The salt to use for the S2K. Must be 8 bytes long.
   * @type {!e2e.ByteArray}
   * @private
   */
  this.salt_ = salt;
  /**
   * The encoded number of bytes to be hashed.
   * @type {number}
   * @private
   */
  this.encodedCount_ = encodedCount;
  /**
   * The decoded number of bytes to be hashed.
   * @type {number}
   * @private
   */
  this.count_ = e2e.openpgp.IteratedS2K.getCount_(encodedCount);
};
goog.inherits(e2e.openpgp.IteratedS2K, e2e.openpgp.SimpleS2K);


/** @inheritDoc */
e2e.openpgp.IteratedS2K.prototype.type = e2e.openpgp.S2k.Type.ITERATED;


/** @inheritDoc */
e2e.openpgp.IteratedS2K.prototype.getKey = function(passphrase, length) {
  var salted_passphrase = this.salt_.concat(passphrase);
  var count = this.count_;

  if (count < salted_passphrase.length) {
    count = salted_passphrase.length;
  }

  // Construct an array with multiple copies of salted_passphrase. This enables
  // us to pass block_size chunks of salted_passphrase into the hash function.
  // This runs twice as fast as the naive approach.
  var block_size = this.hash.blockSize;
  var reps = Math.ceil(block_size / salted_passphrase.length) + 1;
  var repeated = goog.array.flatten(goog.array.repeat(salted_passphrase, reps));
  var slices = [];
  for (var i = 0; i < salted_passphrase.length; i++) {
    slices.push(repeated.slice(i, i + block_size));
  }

  var num_zero_prepend = 0;
  var hashed = [], original_length = length;
  while (length > 0) { // Loop to handle when checksum len < length requested.
    this.hash.reset();
    var remaining = count;  // Number of input bytes we still want.
    if (num_zero_prepend > 0) {
      var firstRound = goog.array.repeat(0, num_zero_prepend);
      // Align initial hash input size to block size.
      var size = (block_size < remaining) ? block_size : remaining;
      size -= num_zero_prepend;
      if (size < 0) {
        size = 0;
      }
      goog.array.extend(firstRound, repeated.slice(0, size));
      this.hash.update(firstRound);
      remaining -= size;
    }
    while (remaining > 0) {
      var offset = (count - remaining) % salted_passphrase.length;
      var size = (block_size < remaining) ? block_size : remaining;
      if (size == block_size) {
        this.hash.update(slices[offset]);
      } else {
        this.hash.update(repeated.slice(offset, offset + size));
      }
      remaining -= size;
    }
    var checksum = this.hash.digest();
    length -= checksum.length;
    goog.array.extend(hashed, checksum);
    num_zero_prepend += 1;
  }
  return hashed.slice(0, original_length);
};


/** @inheritDoc */
e2e.openpgp.IteratedS2K.prototype.serialize = function() {
  return goog.array.concat(
      goog.base(this, 'serialize'),
      this.salt_,
      this.encodedCount_);
};


/**
 * The EXPBIAS constant as defined in RFC 4880 Section 3.7.1.3.
 * @type {number}
 * @const
 * @private
 */
e2e.openpgp.IteratedS2K.EXPBIAS_ = 6;


/**
 * Returns the number of iterations for a given count using the algorithm
 * defined in RFC 4880 Section 3.7.1.3. Must be in the range [0-255].
 * Throws e2e.openpgp.error.Error if it fails.
 * @param {number} c The encoded count for.
 * @return {number} The number of bytes to be hashed.
 * @private
 */
e2e.openpgp.IteratedS2K.getCount_ = function(c) {
  if (e2e.isByte(c)) {
    return (0x10 + (c & 0x0F)) << ((c >> 4) +
                                   e2e.openpgp.IteratedS2K.EXPBIAS_);
  } else {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Invalid encoded count.');
  }
};
