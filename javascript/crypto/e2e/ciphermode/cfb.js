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
 * @fileoverview Implements Cipher Feedback Mode.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.ciphermode.CFB');

goog.require('e2e.async.Result');
goog.require('e2e.ciphermode.CipherMode');
goog.require('goog.array');


/**
 * Cipher Feedback converts a block cipher into a stream cipher by using the
 * output of the previous block's ciphertext as the input to the encrypt
 * function, which is then XOR'd with the plaintext.
 * @param {e2e.cipher.Cipher} cipher The cipher to use.
 * @extends {e2e.ciphermode.CipherMode}
 * @constructor
 */
e2e.ciphermode.CFB = function(cipher) {
  goog.base(this, cipher);
};
goog.inherits(e2e.ciphermode.CFB, e2e.ciphermode.CipherMode);


/** @inheritDoc */
e2e.ciphermode.CFB.prototype.encrypt = function(data, iv) {
  var fre = e2e.async.Result.getValue(this.cipher.encrypt(iv));
  var c = [];
  for (var i = 0; i < data.length; i += this.cipher.blockSize) {
    var fr = goog.array.slice(data, i, i + this.cipher.blockSize);
    goog.array.forEach(
        fr,
        /**
         * Calculates the ciphertext for the current block.
         * @param {number} b The byte at position index.
         * @param {number} index The current position of the loop.
         */
        function(b, index) {
          c.push(fre[index] ^ b);
        });
    fre = e2e.async.Result.getValue(
        this.cipher.encrypt(c.slice(-this.cipher.blockSize)));
  }
  return e2e.async.Result.toResult(c);
};


/** @inheritDoc */
e2e.ciphermode.CFB.prototype.decrypt = function(data, iv) {
  var fre = e2e.async.Result.getValue(this.cipher.encrypt(iv));
  var p = [];
  for (var i = 0; i < data.length; i += this.cipher.blockSize) {
    var fr = goog.array.slice(data, i, i + this.cipher.blockSize);
    /**
     * Calculates the plaintext for the current block.
     * @param {number} b The byte at position index.
     * @param {number} index The current position of the loop.
     */
    goog.array.forEach(fr, function(b, index) {
      p.push(fre[index] ^ b);
    });
    fre = e2e.async.Result.getValue(this.cipher.encrypt(fr));
  }
  return e2e.async.Result.toResult(p);
};
