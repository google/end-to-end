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
 * @fileoverview An OpenPGP-specific scheme for ECDH.
 */

goog.provide('e2e.openpgp.scheme.Ecdh');

goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.constants.Type');
goog.require('e2e.openpgp.error.ParseError');

goog.require('e2e.scheme.Ecdh');
goog.require('goog.array');



/**
 * Provides functions that e2e.scheme.Scheme will call.
 * @param {e2e.cipher.Cipher} cipher
 * @constructor
 * @extends {e2e.scheme.Ecdh}
 */
e2e.openpgp.scheme.Ecdh = function(cipher) {
  goog.base(this, cipher);
};
goog.inherits(e2e.openpgp.scheme.Ecdh, e2e.scheme.Ecdh);


/** @override */
e2e.openpgp.scheme.Ecdh.prototype.encryptJavaScript = function(plaintext) {
  var paddingSize = 40 - plaintext.length;
  goog.array.extend(plaintext, goog.array.repeat(paddingSize, paddingSize));
  return this.cipher.encrypt(plaintext);
};


/** @override */
e2e.openpgp.scheme.Ecdh.prototype.decryptJavaScript = function(ciphertext) {
  return this.cipher.decrypt(ciphertext)
      .addCallback(this.removeEccPadding_, this);
};


/** @override */
e2e.openpgp.scheme.Ecdh.prototype.encryptWebCrypto = function(plaintext) {
  var paddingSize = 40 - plaintext.length;
  goog.array.extend(plaintext, goog.array.repeat(paddingSize, paddingSize));
  return goog.base(this, 'encryptWebCrypto', plaintext);
};


/** @override */
e2e.openpgp.scheme.Ecdh.prototype.decryptWebCrypto = function(ciphertext) {
  return goog.base(this, 'decryptWebCrypto', ciphertext)
      .addCallback(this.removeEccPadding_, this);
};


/**
 * Removes the padding for ECC OpenPGP keys.
 * @param {!e2e.ByteArray} decrypted The data with the padding.
 * @return {!e2e.ByteArray} The data without the padding.
 * @private
 */
e2e.openpgp.scheme.Ecdh.prototype.removeEccPadding_ = function(decrypted) {
  // Format: 1 byte algo id, key, 2 byte checksum, padding.
  // Specified in http://tools.ietf.org/html/rfc6637#section-8
  // Code is repeated below in extractKey_ because we don't know the size.
  var keySize = e2e.openpgp.constants.getInstance(
      e2e.openpgp.constants.Type.SYMMETRIC_KEY,
      decrypted[0]).keySize;
  var paddingSize = decrypted.length - 1 - 2 - keySize;
  var padding = decrypted.splice(-paddingSize, paddingSize);
  // Padding bytes defined in PKCS #5 v2.0, section 6.1.1, row 4.
  // This style is taken from RFC 1423.
  goog.array.forEach(padding, function(b) {
    if (b != paddingSize) {
      throw new e2e.openpgp.error.ParseError(
          'Bad session key padding');
    }
  });
  return decrypted;
};
