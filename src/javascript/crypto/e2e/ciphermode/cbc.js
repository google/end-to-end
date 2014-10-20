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
 * @fileoverview Implementation of Cipher Block Chaining mode.
 *
 * @author tunatoksoz@google.com (Tuna Toksoz)
 */

goog.provide('e2e.ciphermode.Cbc');

goog.require('e2e.async.Result');
goog.require('e2e.ciphermode.CipherMode');
goog.require('e2e.ciphermode.Pkcs7');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.crypt');



/**
 * Implements the Cipher Block Chaining mode.
 *
 * @param {!e2e.cipher.SymmetricCipher} cipher The block cipher to use.
 * @constructor
 * @extends {e2e.ciphermode.CipherMode}
 * @final
 */
e2e.ciphermode.Cbc = function(cipher) {
  goog.base(this, cipher);

  /**
   * The pkcs7 encoding scheme.
   * @private {!e2e.ciphermode.Pkcs7}
   */
  this.pkcs7_ = new e2e.ciphermode.Pkcs7();
};
goog.inherits(e2e.ciphermode.Cbc, e2e.ciphermode.CipherMode);


/** @inheritDoc */
e2e.ciphermode.Cbc.prototype.encrypt = function(data, iv) {
  data = this.pkcs7_.encode(this.cipher.blockSize, data);

  /** @type {!e2e.cipher.ciphertext.Symmetric} */
  var cipherText = [];
  var vector = iv;

  // Generate each block of the encrypted cypher text.
  for (var blockStartIndex = 0;
       blockStartIndex < data.length;
       blockStartIndex += this.cipher.blockSize) {
    // Takes one block from the input message.
    var block = goog.array.slice(
        data, blockStartIndex, blockStartIndex + this.cipher.blockSize);

    var input = goog.crypt.xorByteArray(block, vector);
    var resultBlock = e2e.async.Result.getValue(this.cipher.encrypt(input));

    goog.array.extend(cipherText, resultBlock);
    vector = resultBlock;
  }

  return e2e.async.Result.toResult(cipherText);
};


/** @inheritDoc */
e2e.ciphermode.Cbc.prototype.decrypt = function(data, iv) {
  var plainText = [];
  var blockStartIndex = 0;
  var vector = iv;

  while (blockStartIndex < data.length) {
    var cipherTextBlock = goog.array.slice(
        data,
        blockStartIndex,
        blockStartIndex + this.cipher.blockSize);

    var resultBlock =
        e2e.async.Result.getValue(this.cipher.decrypt(cipherTextBlock));
    var plainTextBlock = [];
    goog.array.extend(plainText, goog.crypt.xorByteArray(resultBlock, vector));
    vector = cipherTextBlock;
    blockStartIndex += this.cipher.blockSize;
  }

  return e2e.async.Result.toResult(goog.asserts.assertObject(
      this.pkcs7_.decode(this.cipher.blockSize, plainText)));
};
