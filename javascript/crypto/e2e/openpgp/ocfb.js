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
 * @fileoverview Implements OpenPGP's variation of CFB mode.
 * @author evn@google.com (Eduardo Vela)
 */
// TODO(adhintz) Move this to the ciphermode/ directory?

goog.provide('e2e.openpgp.OCFB');

goog.require('e2e.ciphermode.CFB');
goog.require('e2e.ciphermode.CipherMode');
goog.require('e2e.random');



/**
 * Implements OpenPGP's variation of CFB mode. Defined in RFC 4880 Section 13.9.
 * @param {e2e.cipher.Cipher} cipher The cipher to use.
 * @param {boolean} resync Specifies if we should do the resyncronization step.
 * @extends {e2e.ciphermode.CipherMode}
 * @constructor
 */
e2e.openpgp.OCFB = function(cipher, resync) {
  goog.base(this, cipher);
  /**
   * Specifies if we should do the resynchronization step.
   * @type {boolean}
   */
  this.resync = resync;
  /**
   * Classic Cipher Feedback implementation used internally.
   * @type {e2e.ciphermode.CFB}
   */
  this.cfb = new e2e.ciphermode.CFB(cipher);
};
goog.inherits(e2e.openpgp.OCFB, e2e.ciphermode.CipherMode);


// TODO(adhintz) Is there a way to actually make these IV arguments optional
// so that there are no compiler warnings?
/** @inheritDoc */
e2e.openpgp.OCFB.prototype.encrypt = function(data, opt_unused_iv) {
  var rnd = e2e.random.getRandomBytes(this.cipher.blockSize);
  return this.cipher.encrypt(rnd).addCallback(function(ciphertext) {
    ciphertext.push(ciphertext[0], ciphertext[1]);
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
e2e.openpgp.OCFB.prototype.decrypt = function(data, opt_unused_iv) {
  var iv;
  if (this.resync) {
    iv = data.slice(2, this.cipher.blockSize + 2);
  } else {
    iv = data.slice(0, this.cipher.blockSize);
  }
  data = data.slice(this.cipher.blockSize + 2);
  return this.cfb.decrypt(data, iv);
};
