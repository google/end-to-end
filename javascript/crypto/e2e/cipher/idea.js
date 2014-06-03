// Copyright 2013 Google Inc. All Rights Reserved.
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
 * @fileoverview JavaScript implementation of IDEA
 * @author rowen@google.com (Russell Owen)
 */

goog.provide('e2e.cipher.IDEA');

goog.require('e2e.Algorithm');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.SymmetricCipher');
goog.require('e2e.cipher.factory');
goog.require('goog.math.Integer');
goog.require('goog.math.Long');

/**
 * Basic implementation of IDEA.
 * @param {e2e.cipher.Algorithm} algorithm The algorithm being
 *     implemented.
 * @param {e2e.cipher.key.Key=} opt_keyObj The key to use.
 * @implements {e2e.cipher.SymmetricCipher}
 * @extends {e2e.AlgorithmImpl}
 * @constructor
 */
e2e.cipher.IDEA = function(algorithm, opt_keyObj) {
  /**
   * Encryption subkeys generated from main key
   * @type {Array.<goog.math.Integer>}
   * @private
   */
  this.encryptSubKeys_ = [];
  /**
   * Encryption subkeys generated from main key
   * @type {Array.<goog.math.Integer>}
   * @private
   */
  this.decryptSubKeys_ = [];

  this.keySize = 128;  // key size in bits
  goog.base(this, algorithm, opt_keyObj);
};
goog.inherits(e2e.cipher.IDEA, e2e.AlgorithmImpl);

/**
 * Number of encryption rounds
 * @type {number}
 */
e2e.cipher.IDEA.prototype.rounds = 8;

/**
 * Number of encryption subkeys
 * @type {number}
 * @const
 */
e2e.cipher.IDEA.prototype.num_subkeys =
    (6 * e2e.cipher.IDEA.prototype.rounds + 4);

/** @inheritDoc */
e2e.cipher.IDEA.prototype.blockSize = 64;

/** @inheritDoc */
e2e.cipher.IDEA.prototype.setKey = function(keyObj) {
  goog.base(this, 'setKey', keyObj, keyObj.key.length);
  this.initEncryptSubkeys_();
  this.initDecryptSubkeys_();
};

/***
 * Expand out the encryption subkeys
 * @private
 * @return {Array.<goog.math.Integer>}
 */
e2e.cipher.IDEA.prototype.initEncryptSubkeys_ = function() {
  var shiftInt = goog.math.Integer.fromInt(8);
  var twoInt = goog.math.Integer.fromInt(2);
  // Divide the 128 bit key into 8 subkeys of 16 bits each.
  this.encryptSubKeys_ = [];
  for (var i = 0; i < this.key.key.length; i += 2) {
    this.encryptSubKeys_.push(goog.math.Integer.fromInt(
        (this.key.key[i + 1] | (this.key.key[i] << 8)) >>> 0));
  }

  for (i = 8; i < this.num_subkeys; i++) {
    var index1 = goog.math.Integer.fromInt(i + 1);
    var index2 = goog.math.Integer.fromInt(i + 2);
    index1 = index1.modulo(shiftInt).isZero() ? i - 15 : i - 7;
    index2 = index2.modulo(shiftInt).lessThan(twoInt) ? i - 14 : i - 6;
    this.encryptSubKeys_[i] =
        e2e.cipher.IDEA.LSWfromInteger(
            this.encryptSubKeys_[index1].shiftLeft(9).or(
                this.encryptSubKeys_[index2].shiftRight(7)));
  }
  return this.encryptSubKeys_;
};

/***
 * Expand out the decryption subkeys
 * @private
 * @return {Array.<goog.math.Integer>}
 */
e2e.cipher.IDEA.prototype.initDecryptSubkeys_ = function() {
  var i;
  var si = 0;

  this.decryptSubKeys_[6 * this.rounds] =
      e2e.cipher.IDEA.invMod16(this.encryptSubKeys_[si++]);
  this.decryptSubKeys_[6 * this.rounds + 1] =
      e2e.cipher.IDEA.LSWfromInteger(
          this.encryptSubKeys_[si++].negate());
  this.decryptSubKeys_[6 * this.rounds + 2] =
      e2e.cipher.IDEA.LSWfromInteger(
          this.encryptSubKeys_[si++].negate());
  this.decryptSubKeys_[6 * this.rounds + 3] =
      e2e.cipher.IDEA.invMod16(this.encryptSubKeys_[si++]);

  for (i = 6 * (this.rounds - 1); i >= 0; i -= 6) {
    this.decryptSubKeys_[i + 4] = this.encryptSubKeys_[si++];
    this.decryptSubKeys_[i + 5] = this.encryptSubKeys_[si++];
    this.decryptSubKeys_[i] =
        e2e.cipher.IDEA.invMod16(this.encryptSubKeys_[si++]);
    if (i != 0) {
      this.decryptSubKeys_[i + 2] =
          e2e.cipher.IDEA.LSWfromInteger(
              this.encryptSubKeys_[si++].negate());
      this.decryptSubKeys_[i + 1] =
          e2e.cipher.IDEA.LSWfromInteger(
              this.encryptSubKeys_[si++].negate());
    } else {
      this.decryptSubKeys_[1] =
          e2e.cipher.IDEA.LSWfromInteger(
              this.encryptSubKeys_[si++].negate());
      this.decryptSubKeys_[2] =
          e2e.cipher.IDEA.LSWfromInteger(
              this.encryptSubKeys_[si++].negate());
    }
    this.decryptSubKeys_[i + 3] =
        e2e.cipher.IDEA.invMod16(this.encryptSubKeys_[si++]);
  }

  return this.decryptSubKeys_;
};

/***
 * Apply the IDEA cipher to the data using the provided key
 *
 * @param {Array.<goog.math.Integer>} inblock
 * @param {Array.<goog.math.Integer>} key
 * @return {Array.<goog.math.Integer>}
 */
e2e.cipher.IDEA.prototype.applyKey = function(inblock, key) {
  var i;
  var ki = 0; // key index
  var outblock = [];  // TODO(user) reuse the inblock for output
  var obi = 0; // outblock index
  var ibi = 0; // inblock index
  var w1 = inblock[ibi++];
  var w2 = inblock[ibi++];
  var w3 = inblock[ibi++];
  var w4 = inblock[ibi];
  var t1, t2;

  for (i = this.rounds; i > 0; i--) {
    w1 = e2e.cipher.IDEA.multMod16(w1, key[ki++]);
    w2 = e2e.cipher.IDEA.LSWfromInteger(w2.add(key[ki++]));
    w3 = e2e.cipher.IDEA.LSWfromInteger(w3.add(key[ki++]));
    w4 = e2e.cipher.IDEA.multMod16(w4, key[ki++]);

    t2 = w1.xor(w3);
    t2 = e2e.cipher.IDEA.multMod16(t2, key[ki++]);
    t1 = e2e.cipher.IDEA.LSWfromInteger(t2.add(w2.xor(w4)));
    t1 = e2e.cipher.IDEA.multMod16(t1, key[ki++]);
    t2 = e2e.cipher.IDEA.LSWfromInteger(t1.add(t2));

    w1 = w1.xor(t1);
    w4 = w4.xor(t2);

    t2 = t2.xor(w2);
    w2 = w3.xor(t1);
    w3 = t2;
  }

  w1 = e2e.cipher.IDEA.multMod16(w1, key[ki++]);
  outblock[obi++] = w1;
  outblock[obi++] =
      e2e.cipher.IDEA.LSWfromInteger(w3.add(key[ki++]));
  outblock[obi++] =
      e2e.cipher.IDEA.LSWfromInteger(w2.add(key[ki++]));
  w4 = e2e.cipher.IDEA.multMod16(w4, key[ki++]);
  outblock[obi] = w4;

  return outblock;
};

/** @inheritDoc */
e2e.cipher.IDEA.prototype.encrypt = function(data) {
  data = this.padByteArray(data);
  return e2e.async.Result.toResult(
      this.blockAndTackle(data, this.encryptSubKeys_));
};

/** @inheritDoc */
e2e.cipher.IDEA.prototype.decrypt = function(data) {
  return e2e.async.Result.toResult(this.stripByteArray(
      this.blockAndTackle(data, this.decryptSubKeys_)));
};


/***
 * Pad out the data so length is a multiple of the block size
 * TODO(user) verify this is the correct method for PGP
 *
 * @param {e2e.ByteArray} data
 * @return {e2e.ByteArray}
 */

e2e.cipher.IDEA.prototype.padByteArray = function(data) {
  var blockSizeInWords = this.blockSize / 8 * 2;
  var padding = blockSizeInWords - data.length % blockSizeInWords;
  var i;
  var din = data.length;

  // Pad out the data so length is a multiple of the blockSize
  for (i = 0; i < padding; i++) {
    data[din++] = 0;
  }
  return data;
};

/***
 * Strip out trailing zeros from the byte array.
 * This undoes the padding in padByteArray
 *
 * @param {e2e.ByteArray} data
 * @return {e2e.ByteArray}
 */

e2e.cipher.IDEA.prototype.stripByteArray = function(data) {
  var i;

  for (i = data.length - 1; i >= 0 && data[i] == 0; i--) {
    delete data[i];
  }
  return data;
};

/***
 * Divide the byte array into 64 bit blocks
 * and transform each with the key
 * This function expects that padding is already done
 * @param {e2e.ByteArray} data The data to transform
 * @param {Array.<goog.math.Integer>} key Transformation key
 * @return {e2e.ByteArray}
 */

e2e.cipher.IDEA.prototype.blockAndTackle = function(data, key) {
  var i;
  var din = 0; // data index
  var blockSize = this.blockSize / 16; // size in words
  var lowByte = goog.math.Integer.fromString('FF', 16);
  var highByte = goog.math.Integer.fromString('FF00', 16);
  var out = [];
  while (din < data.length) {
    var block = [];
    for (i = 0; i < blockSize; i++) {
      block[i] = goog.math.Integer.fromInt(data[din++] | (data[din++] << 8));
    }
    block = this.applyKey(block, key);
    for (i = 0; i < blockSize; i++) {
      out.push(block[i].and(lowByte));
      out.push(block[i].and(highByte).shiftRight(8));
    }
  }
  return out;
};

/***
 * Compute the inverse multiplicative of x modulo 2^16+1
 *
 * @param {goog.math.Integer} x
 * @return {goog.math.Integer}
 */

e2e.cipher.IDEA.invMod16 = function(x) {
  var m = goog.math.Integer.fromNumber(Math.pow(2, 16) + 1);
  return e2e.cipher.IDEA.inverseMultModulo(x, m);
};

/***
 * Compute (x * y) modulo 2^16+1
 * But y == 0 is a special case specific
 * to the IDEA algorithm.
 *
 * @param {goog.math.Integer} x First multiplicand
 * @param {goog.math.Integer} y Second multiplicand
 * @return {goog.math.Integer}
 */

e2e.cipher.IDEA.multMod16 = function(x, y) {
  var m = goog.math.Integer.fromNumber(Math.pow(2, 16) + 1);
  if (y == 0) {
    // TODO(user) Address the sense of unease this code causes
    // What happens if m < x?
    return m.subtract(x);
  }
  return x.multiply(y).modulo(m);
};


/**
 * Return the least significant bits of a goog.math.Integer
 * @param {goog.math.Integer} intVal The int to mask
 * @return {goog.math.Integer} the least signification 16 bits of intVal
 */
e2e.cipher.IDEA.LSWfromInteger = function(intVal) {
  var mask = goog.math.Integer.fromString('FFFF', 16);

  return intVal.and(mask);
};

/**
 * Return the most significant bits of a goog.math.Integer
 * @param {goog.math.Integer} intVal The int to mask
 * @return {goog.math.Integer} the most signification 16 bits of intVal
 */
e2e.cipher.IDEA.MSWfromInteger = function(intVal) {
  var mask = goog.math.Integer.fromString('FFFF0000', 16);

  return intVal.and(mask);
};

/***
 * Return the modular multiplicative inverse
 *
 * @param {goog.math.Integer} x
 * @param {goog.math.Integer} m
 * @return {goog.math.Integer}
 */

e2e.cipher.IDEA.inverseMultModulo = function(x, m) {
  var v = goog.math.Integer.ONE;
  var d = x;

  if (x.lessThan(goog.math.Integer.ONE)) return x;
  var c = m.modulo(x);
  var u = m.divide(x);
  while (!c.equals(goog.math.Integer.ONE) && !d.equals(goog.math.Integer.ONE)) {
    var q = d.divide(c);
    d = d.modulo(c);
    v = v.add(q.multiply(u));
    if (!d.equals(goog.math.Integer.ONE)) {
      q = c.divide(d);
      c = c.modulo(d);
      u = u.add(q.multiply(v));
    }
  }

  if (d.equals(goog.math.Integer.ONE)) {
    u = v;
  } else {
    u = m.subtract(u);
  }
  return u;
};


e2e.cipher.factory.add(e2e.cipher.IDEA,
                               e2e.cipher.Algorithm.IDEA);
