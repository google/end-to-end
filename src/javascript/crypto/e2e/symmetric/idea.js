/**
 * @license
 * Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Implementation of IDEA.
 */

goog.provide('e2e.cipher.Idea');

goog.require('e2e.AlgorithmImpl');
goog.require('e2e.BigNum');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.SymmetricCipher');
goog.require('e2e.cipher.factory');
goog.require('e2e.fixedtiming');



/**
 * Basic implementation of IDEA.
 * @param {e2e.cipher.Algorithm} algorithm The algorithm being implemented.
 * @param {e2e.cipher.key.Key=} opt_keyObj The key to use.
 * @implements {e2e.cipher.SymmetricCipher}
 * @extends {e2e.AlgorithmImpl}
 * @constructor
 */
e2e.cipher.Idea = function(algorithm, opt_keyObj) {
  /**
   * Encryption subkeys generated from main key
   * @type {Array.<!e2e.BigNum>}
   * @private
   */
  this.encryptSubKeys_ = [];
  /**
   * Encryption subkeys generated from main key
   * @type {Array.<!e2e.BigNum>}
   * @private
   */
  this.decryptSubKeys_ = [];

  this.keySize = 128;  // key size in bits
  goog.base(this, algorithm, opt_keyObj);
};
goog.inherits(e2e.cipher.Idea, e2e.AlgorithmImpl);


/**
 * Number of encryption rounds
 * @type {number}
 */
e2e.cipher.Idea.prototype.rounds = 8;


/**
 * Number of encryption subkeys
 * @type {number}
 * @const
 */
e2e.cipher.Idea.prototype.num_subkeys =
    (6 * e2e.cipher.Idea.prototype.rounds + 4);


/** @inheritDoc */
e2e.cipher.Idea.prototype.blockSize = 8;  // 64 bits.


/** @inheritDoc */
e2e.cipher.Idea.prototype.setKey = function(keyObj) {
  goog.base(this, 'setKey', keyObj, keyObj.key.length);
  this.initEncryptSubkeys_();
  this.initDecryptSubkeys_();
};


/***
 * Expand out the encryption subkeys
 * @private
 * @return {Array.<!e2e.BigNum>}
 */
e2e.cipher.Idea.prototype.initEncryptSubkeys_ = function() {
  var shiftInt = e2e.BigNum.fromInteger(8);
  var twoInt = e2e.BigNum.fromInteger(2);
  // Divide the 128 bit key into 8 subkeys of 16 bits each.
  this.encryptSubKeys_ = [];
  for (var i = 0; i < this.key.key.length; i += 2) {
    this.encryptSubKeys_.push(e2e.BigNum.fromInteger(
        (this.key.key[i + 1] | (this.key.key[i] << 8)) >>> 0));
  }

  for (i = 8; i < this.num_subkeys; i++) {
    var index1 = e2e.BigNum.fromInteger(i + 1);
    var index2 = e2e.BigNum.fromInteger(i + 2);
    index1 = index1.mod(shiftInt).isEqual(e2e.BigNum.ZERO) ? i - 15 : i - 7;
    index2 = index2.mod(shiftInt).isLess(twoInt) ? i - 14 : i - 6;
    this.encryptSubKeys_[i] =
        e2e.cipher.Idea.LSWfromInteger(
            this.encryptSubKeys_[index1].shiftLeft(9).or(
                this.encryptSubKeys_[index2].shiftRight(7)));
  }
  return this.encryptSubKeys_;
};


/***
 * Expand out the decryption subkeys
 * @private
 * @return {Array.<!e2e.BigNum>}
 */
e2e.cipher.Idea.prototype.initDecryptSubkeys_ = function() {
  var si = 0;
  var ffff = e2e.BigNum.fromInteger(0xffff);

  this.decryptSubKeys_[6 * this.rounds] =
      e2e.cipher.Idea.invMod16(this.encryptSubKeys_[si++]);
  this.decryptSubKeys_[6 * this.rounds + 1] =
      e2e.cipher.Idea.LSWfromInteger(
          this.encryptSubKeys_[si++].negate().and(ffff));
  this.decryptSubKeys_[6 * this.rounds + 2] =
      e2e.cipher.Idea.LSWfromInteger(
          this.encryptSubKeys_[si++].negate().and(ffff));
  this.decryptSubKeys_[6 * this.rounds + 3] =
      e2e.cipher.Idea.invMod16(this.encryptSubKeys_[si++]);

  for (var i = 6 * (this.rounds - 1); i >= 0; i -= 6) {
    this.decryptSubKeys_[i + 4] = this.encryptSubKeys_[si++];
    this.decryptSubKeys_[i + 5] = this.encryptSubKeys_[si++];
    this.decryptSubKeys_[i] =
        e2e.cipher.Idea.invMod16(this.encryptSubKeys_[si++]);
    this.decryptSubKeys_[e2e.fixedtiming.select(1, i + 2, (i == 0) | 0)] =
        e2e.cipher.Idea.LSWfromInteger(
            this.encryptSubKeys_[si++].negate().and(ffff));
    this.decryptSubKeys_[e2e.fixedtiming.select(2, i + 1, (i == 0) | 0)] =
        e2e.cipher.Idea.LSWfromInteger(
            this.encryptSubKeys_[si++].negate().and(ffff));
    this.decryptSubKeys_[i + 3] =
        e2e.cipher.Idea.invMod16(this.encryptSubKeys_[si++]);
  }

  return this.decryptSubKeys_;
};


/***
 * Apply the IDEA cipher to the data using the provided key
 *
 * @param {Array.<!e2e.BigNum>} block
 * @param {Array.<!e2e.BigNum>} key
 * @return {Array.<!e2e.BigNum>}
 */
e2e.cipher.Idea.prototype.applyKey = function(block, key) {
  var ki = 0; // key index
  var w1 = block[0];
  var w2 = block[1];
  var w3 = block[2];
  var w4 = block[3];
  var t1, t2;

  for (var i = this.rounds; i > 0; i--) {
    w1 = e2e.cipher.Idea.multMod16(w1, key[ki++]);
    w2 = e2e.cipher.Idea.LSWfromInteger(w2.add(key[ki++]));
    w3 = e2e.cipher.Idea.LSWfromInteger(w3.add(key[ki++]));
    w4 = e2e.cipher.Idea.multMod16(w4, key[ki++]);

    t2 = w1.xor(w3);
    t2 = e2e.cipher.Idea.multMod16(t2, key[ki++]);
    t1 = e2e.cipher.Idea.LSWfromInteger(t2.add(w2.xor(w4)));
    t1 = e2e.cipher.Idea.multMod16(t1, key[ki++]);
    t2 = e2e.cipher.Idea.LSWfromInteger(t1.add(t2));

    w1 = w1.xor(t1);
    w4 = w4.xor(t2);

    t2 = t2.xor(w2);
    w2 = w3.xor(t1);
    w3 = t2;
  }

  w1 = e2e.cipher.Idea.multMod16(w1, key[ki++]);
  block[0] = w1;
  block[1] = e2e.cipher.Idea.LSWfromInteger(w3.add(key[ki++]));
  block[2] = e2e.cipher.Idea.LSWfromInteger(w2.add(key[ki++]));
  w4 = e2e.cipher.Idea.multMod16(w4, key[ki++]);
  block[3] = w4;

  return block;
};


/** @inheritDoc */
e2e.cipher.Idea.prototype.encrypt = function(data) {
  return e2e.async.Result.toResult(
      this.blockAndTackle(data, this.encryptSubKeys_));
};


/** @inheritDoc */
e2e.cipher.Idea.prototype.decrypt = function(data) {
  return e2e.async.Result.toResult(
      this.blockAndTackle(data, this.decryptSubKeys_));
};


/***
 * Divide the byte array into 64 bit blocks and transform each with the key.
 * @param {!e2e.ByteArray} data The data to transform
 * @param {Array.<!e2e.BigNum>} key Transformation key
 * @return {!e2e.ByteArray}
 */
e2e.cipher.Idea.prototype.blockAndTackle = function(data, key) {
  var din = 0; // data index
  var blockSize = this.blockSize / 2; // size in words
  var lowByte = e2e.BigNum.fromInteger(0xFF);
  var highByte = e2e.BigNum.fromInteger(0xFF00);
  var out = [];
  while (din < data.length) {
    var block = [];
    for (var i = 0; i < blockSize; i++) {
      block[i] = e2e.BigNum.fromInteger((data[din++] << 8) | (data[din++]));
    }
    block = this.applyKey(block, key);
    for (var i = 0; i < blockSize; i++) {
      out.push(block[i].and(highByte).toByteArray()[0] | 0);
      out.push(block[i].and(lowByte).toByteArray()[0] | 0);
    }
  }
  return out;
};


/***
 * Compute the inverse multiplicative of x mod 2^16+1 using a^(p-2) mod p
 *
 * @param {!e2e.BigNum} x
 * @return {!e2e.BigNum}
 */
e2e.cipher.Idea.invMod16 = function(x) {
  var m = e2e.BigNum.fromInteger(Math.pow(2, 16) + 1);
  var y = x.clone();
  for (var i = 0; i < 15; i++) {
    y = y.square().mod(m);
    y = y.multiply(x).mod(m);
  }
  return y;
};


/***
 * Compute (x * y) mod 2^16+1
 * But y == 0 is a special case specific to the IDEA algorithm.
 *
 * @param {!e2e.BigNum} x First multiplicand
 * @param {!e2e.BigNum} y Second multiplicand
 * @return {!e2e.BigNum}
 */
e2e.cipher.Idea.multMod16 = function(x, y) {
  var m = e2e.BigNum.fromInteger(Math.pow(2, 16) + 1);
  x = x.mod(e2e.BigNum.fromInteger(Math.pow(2, 16)));
  y = y.mod(e2e.BigNum.fromInteger(Math.pow(2, 16)));

  var mSubY = m.subtract(y);
  var mSubX = m.subtract(x);
  var xZero = e2e.BigNum.select(
      e2e.BigNum.fromInteger(0xffff), e2e.BigNum.fromInteger(0),
      x.isEqual(e2e.BigNum.ZERO) | 0); // mask bits set if x is zero.
  var xZeroN = e2e.BigNum.select(
      e2e.BigNum.fromInteger(0), e2e.BigNum.fromInteger(0xffff),
      x.isEqual(e2e.BigNum.ZERO) | 0); // mask bits set if x != zero.
  var yZero = e2e.BigNum.select(
      e2e.BigNum.fromInteger(0xffff), e2e.BigNum.fromInteger(0),
      y.isEqual(e2e.BigNum.ZERO) | 0); // mask bits set if y is zero.
  var yZeroN = e2e.BigNum.select(
      e2e.BigNum.fromInteger(0), e2e.BigNum.fromInteger(0xffff),
      y.isEqual(e2e.BigNum.ZERO) | 0); // mask bits set if y is zero.;
  return (
      xZero.and(mSubY).or(
      yZero.and(mSubX).and(xZeroN).or(
      // When multiplying, the result ANDs with xZeroN (0xFFFF).
      xZeroN.and(yZeroN).and(x.multiply(y).mod(m))
      )));
};


/**
 * Return the least significant bits of a e2e.BigNum
 * @param {!e2e.BigNum} intVal The int to mask
 * @return {!e2e.BigNum} the least signification 16 bits of intVal
 */
e2e.cipher.Idea.LSWfromInteger = function(intVal) {
  var mask = e2e.BigNum.fromInteger(0xFFFF);
  return intVal.and(mask);
};


/**
 * Return the most significant bits of a e2e.BigNum
 * @param {!e2e.BigNum} intVal The int to mask
 * @return {!e2e.BigNum} the most signification 16 bits of intVal
 */
e2e.cipher.Idea.MSWfromInteger = function(intVal) {
  var mask = e2e.BigNum.fromInteger(0xFFFF0000);
  return intVal.and(mask);
};


e2e.cipher.factory.add(e2e.cipher.Idea, e2e.cipher.Algorithm.IDEA);
