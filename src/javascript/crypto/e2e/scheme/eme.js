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
 * @fileoverview Simple wrapper for a cipher and EME PKCS1 v1.5.
 */

goog.require('e2e.pkcs.eme.Pkcs1');
goog.require('e2e.scheme.EncryptionScheme');

goog.provide('e2e.scheme.Eme');



/**
 * JavaScript implementation of EME PKCS1 v1.5.
 * @param {e2e.cipher.Cipher} cipher
 * @constructor
 * @extends {e2e.scheme.EncryptionScheme}
 */
e2e.scheme.Eme = function(cipher) {
  goog.base(this, cipher);
  this.cipher = cipher;
};
goog.inherits(e2e.scheme.Eme, e2e.scheme.EncryptionScheme);


/** @override */
e2e.scheme.Eme.prototype.encryptJavaScript = function(plaintext) {
  return this.cipher.encrypt(
      new e2e.pkcs.eme.Pkcs1().encode(
          this.cipher.keySize, plaintext));
};


/** @override */
e2e.scheme.Eme.prototype.decryptJavaScript = function(ciphertext) {
  return this.cipher.decrypt(ciphertext).addCallback(function(m) {
    return new e2e.pkcs.eme.Pkcs1().decode(m);
  });
};
