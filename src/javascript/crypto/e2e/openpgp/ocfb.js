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
 * @fileoverview Implements OpenPGP's variation of CFB mode.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.Ocfb');

goog.require('e2e.ciphermode.Cfb');
goog.require('e2e.ciphermode.CipherMode');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.random');



/**
 * Implements OpenPGP's variation of CFB mode. Defined in RFC 4880 Section 13.9.
 * @param {e2e.cipher.SymmetricCipher} cipher The cipher to use.
 * @param {boolean} resync Specifies if we should do the resyncronization step.
 * @extends {e2e.ciphermode.CipherMode}
 * @constructor
 */
e2e.openpgp.Ocfb = function(cipher, resync) {
  goog.base(this, cipher);
  /**
   * Specifies if we should do the resynchronization step.
   * @type {boolean}
   */
  this.resync = resync;
  /**
   * Classic Cipher Feedback implementation used internally.
   * @type {e2e.ciphermode.Cfb}
   */
  this.cfb = new e2e.ciphermode.Cfb(cipher);
};
goog.inherits(e2e.openpgp.Ocfb, e2e.ciphermode.CipherMode);


/** @inheritDoc */
e2e.openpgp.Ocfb.prototype.encrypt = function(data, opt_iv) {
  var rnd = e2e.random.getRandomBytes(this.cipher.blockSize);
  return this.cipher.encrypt(rnd).addCallback(function(ciphertext) {
    // Generate a bad resync on purpose. See Issue 114.
    // https://eprint.iacr.org/2005/033.pdf
    ciphertext.push(0xBA, 0xDD);
    var iv;
    if (this.resync) {
      iv = ciphertext.slice(2, this.cipher.blockSize + 2);
    } else {
      iv = ciphertext.slice();
    }
    return this.cfb.encrypt(data, iv).addCallback(function(cfbData) {
      return ciphertext.concat(cfbData);
    });
  }, this);
};


/** @inheritDoc */
e2e.openpgp.Ocfb.prototype.decrypt = function(data, opt_iv) {
  if (this.resync) {
    var iv = data.slice(2, this.cipher.blockSize + 2);
    data = data.slice(this.cipher.blockSize + 2);
    return this.cfb.decrypt(data, iv);
  } else {
    throw new e2e.openpgp.error.UnsupportedError(
        'OpenPGP-CFB mode with no resynchronization is not supported ' +
        'without a modification detection code.');
  }
};
