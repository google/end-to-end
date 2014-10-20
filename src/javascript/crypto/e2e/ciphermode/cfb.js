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
 * @fileoverview Implements Cipher Feedback Mode.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.ciphermode.Cfb');

goog.require('e2e.async.Result');
goog.require('e2e.ciphermode.CipherMode');
goog.require('goog.array');
goog.require('goog.crypt');



/**
 * Cipher Feedback converts a block cipher into a stream cipher by using the
 * output of the previous block's ciphertext as the input to the encrypt
 * function, which is then XOR'd with the plaintext.
 * @param {e2e.cipher.SymmetricCipher} cipher The cipher to use.
 * @extends {e2e.ciphermode.CipherMode}
 * @constructor
 */
e2e.ciphermode.Cfb = function(cipher) {
  goog.base(this, cipher);
};
goog.inherits(e2e.ciphermode.Cfb, e2e.ciphermode.CipherMode);


/** @inheritDoc */
e2e.ciphermode.Cfb.prototype.encrypt = function(data, iv) {
  var fre = e2e.async.Result.getValue(this.cipher.encrypt(iv));
  /** @type {!e2e.cipher.ciphertext.Symmetric} */
  var c = [];

  for (var i = 0; i < data.length; i += this.cipher.blockSize) {
    var fr = goog.array.slice(data, i, i + this.cipher.blockSize);
    Array.prototype.push.apply(c,
        goog.crypt.xorByteArray(fr, fre.slice(0, fr.length)));
    fre = e2e.async.Result.getValue(
        this.cipher.encrypt(c.slice(-this.cipher.blockSize)));
  }
  return e2e.async.Result.toResult(c);
};


/** @inheritDoc */
e2e.ciphermode.Cfb.prototype.decrypt = function(data, iv) {
  var fre = e2e.async.Result.getValue(this.cipher.encrypt(iv));
  var p = [];
  for (var i = 0; i < data.length; i += this.cipher.blockSize) {
    var fr = goog.array.slice(data, i, i + this.cipher.blockSize);
    Array.prototype.push.apply(p,
        goog.crypt.xorByteArray(fr, fre.slice(0, fr.length)));
    fre = e2e.async.Result.getValue(this.cipher.encrypt(fr));
  }
  return e2e.async.Result.toResult(p);
};
