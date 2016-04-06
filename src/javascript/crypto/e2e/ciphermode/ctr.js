/**
 * @license
 * Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Implementation of Counter mode.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.ciphermode.Ctr');

goog.require('e2e');
goog.require('e2e.async.Result');
goog.require('e2e.ciphermode.CipherMode');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.error.UnsupportedError');
goog.require('goog.array');
goog.require('goog.crypt');



/**
 * Implements the Counter mode.
 *
 * @param {!e2e.cipher.SymmetricCipher} cipher The block cipher to use.
 * @constructor
 * @extends {e2e.ciphermode.CipherMode}
 * @final
 */
e2e.ciphermode.Ctr = function(cipher) {
  goog.base(this, cipher);
};
goog.inherits(e2e.ciphermode.Ctr, e2e.ciphermode.CipherMode);


/** @inheritDoc */
e2e.ciphermode.Ctr.prototype.encryptSync = function(data, iv) {
  if (iv.length != this.cipher.blockSize) {
    throw new e2e.error.InvalidArgumentsError('IV does not match block size.');
  }

  /** @type {!e2e.cipher.ciphertext.Symmetric} */
  var ciphertext = [];
  var encKey = [];
  var block = [];
  var ctr = goog.array.clone(iv);

  for (var i = 0; i < data.length; i += this.cipher.blockSize) {
    encKey = e2e.async.Result.getValue(this.cipher.encrypt(ctr));
    e2e.incrementByteArray(ctr);
    if (e2e.compareByteArray(iv, ctr)) {
      throw new e2e.error.UnsupportedError('CTR overflow: Too many blocks.');
    }
    block = data.slice(i, i + this.cipher.blockSize);
    Array.prototype.push.apply(ciphertext, goog.crypt.xorByteArray(
        block,
        encKey.slice(0, block.length)));
  }
  return ciphertext;
};


/** @inheritDoc */
e2e.ciphermode.Ctr.prototype.decryptSync =
    e2e.ciphermode.Ctr.prototype.encryptSync;


/** @inheritDoc */
e2e.ciphermode.Ctr.prototype.encrypt = function(data, iv) {
  return e2e.async.Result.toResult(this.encryptSync(data, iv));
};


/** @inheritDoc */
e2e.ciphermode.Ctr.prototype.decrypt = e2e.ciphermode.Ctr.prototype.encrypt;
