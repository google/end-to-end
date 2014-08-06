// Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Defines an encryption or signing scheme.
 */

goog.provide('e2e.scheme.EncryptionScheme');
goog.provide('e2e.scheme.Scheme');
goog.provide('e2e.scheme.SignatureScheme');


/**
 * @typedef {{then: function(...):e2e.scheme.CryptoPromise_,
 *     catch: function(...):e2e.scheme.CryptoPromise_}}
 * @private
 */
e2e.scheme.CryptoPromise_;



/**
 * Crypto scheme for encryption or signing.
 * @param {e2e.cipher.Cipher|e2e.signer.Signer} cipher
 * @constructor
 */
e2e.scheme.Scheme = function(cipher) {
  this.useWebCrypto = this.useWebCrypto && e2e.scheme.Scheme.USE_WEB_CRYPTO;
  this.useHardwareCrypto = this.useHardwareCrypto &&
      e2e.scheme.Scheme.USE_HARDWARE_CRYPTO;
  if (this.useWebCrypto && 'crypto' in goog.global) {
    this.crypto = goog.global.crypto;
    if ('subtle' in this.crypto) {
      this.crypto = this.crypto.subtle;
    }
    this.useWebCrypto = 'encrypt' in this.crypto;
  }
};


/**
 * @define {boolean} Whether to use webcrypto when available.
 */
e2e.scheme.Scheme.USE_WEB_CRYPTO = true;


/**
 * @define {boolean} Whether to use a hardware device for crypto when available.
 */
e2e.scheme.Scheme.USE_HARDWARE_CRYPTO = false;


/**
 * Crypto object as used by the Scheme.
 * @type {{encrypt: function(...):e2e.scheme.CryptoPromise_,
 *     decrypt: function(...):e2e.scheme.CryptoPromise_}}
 */
e2e.scheme.Scheme.prototype.crypto;



/** Crypto scheme for encryption.
 * @param {e2e.cipher.Cipher} cipher
 * @constructor
 * @extends {e2e.scheme.Scheme}
 */
e2e.scheme.EncryptionScheme = function(cipher) {
  goog.base(this, cipher);
};
goog.inherits(e2e.scheme.EncryptionScheme, e2e.scheme.Scheme);


/**
 * @param {!e2e.ByteArray} plaintext
 * @return {!e2e.async.Result.<e2e.cipher.ciphertext.CipherText>}
 */
e2e.scheme.EncryptionScheme.prototype.encrypt = function(plaintext) {
  if (this.useWebCrypto) {
    return this.encryptWebCrypto(plaintext);
  } else {
    return this.encryptJavaScript(plaintext);
  }
};


/**
 * @param {e2e.cipher.ciphertext.CipherText} ciphertext
 * @return {!e2e.async.Result.<!e2e.ByteArray>}
 */
e2e.scheme.EncryptionScheme.prototype.decrypt = function(ciphertext) {
  if (this.useWebCrypto) {
    return this.decryptWebCrypto(ciphertext);
  } else {
    return this.decryptJavaScript(ciphertext);
  }
};


/**
 * JavaScript implementation of the scheme.
 * @param {!e2e.ByteArray} plaintext
 * @return {!e2e.async.Result.<e2e.cipher.ciphertext.CipherText>}
 */
e2e.scheme.EncryptionScheme.prototype.encryptJavaScript;


/**
 * WebCrypto implementation of the scheme.
 * @param {!e2e.ByteArray} plaintext
 * @return {!e2e.async.Result.<e2e.cipher.ciphertext.CipherText>}
 */
e2e.scheme.EncryptionScheme.prototype.encryptWebCrypto;


/**
 * JavaScript implementation of the scheme.
 * @param {e2e.cipher.ciphertext.CipherText} ciphertext
 * @return {!e2e.async.Result.<!e2e.ByteArray>}
 */
e2e.scheme.EncryptionScheme.prototype.decryptJavaScript;


/**
 * WebCrypto implementation of the scheme.
 * @param {e2e.cipher.ciphertext.CipherText} ciphertext
 * @return {!e2e.async.Result.<!e2e.ByteArray>}
 */
e2e.scheme.EncryptionScheme.prototype.decryptWebCrypto;



/** Crypto scheme for signing.
 * @param {e2e.signer.Signer} signer
 * @constructor
 * @extends {e2e.scheme.Scheme}
 */
e2e.scheme.SignatureScheme = function(signer) {
  goog.base(this, signer);
};
goog.inherits(e2e.scheme.SignatureScheme, e2e.scheme.Scheme);


/**
 * Applies the signing algorithm to the data.
 * @param {e2e.ByteArray} data The data to sign.
 * @return {!e2e.async.Result.<!e2e.signer.signature.Signature>} The
 *     result of signing.
 */
e2e.scheme.SignatureScheme.prototype.sign = function(data) {
  if (this.useWebCrypto) {
    return this.signWebCrypto(data);
  } else {
    return this.signJavaScript(data);
  }
};


/**
 * Applies the verification algorithm to the data.
 * @param {e2e.ByteArray} m The data to verify.
 * @param {e2e.signer.signature.Signature} sig The signature to check.
 * @return {!e2e.async.Result.<boolean>} The result of verification.
 */
e2e.scheme.SignatureScheme.prototype.verify = function(m, sig) {
  if (!(goog.isDefAndNotNull(m) && goog.isDefAndNotNull(sig))) {
    return e2e.async.Result.toResult(false);
  }
  if (this.useWebCrypto) {
    return this.verifyWebCrypto(m, sig);
  } else {
    return this.verifyJavaScript(m, sig);
  }
};


/**
 * JavaScript implementation of the scheme.
 * @param {e2e.ByteArray} data
 * @return {!e2e.async.Result.<!e2e.signer.signature.Signature>}
 */
e2e.scheme.SignatureScheme.prototype.signJavaScript;


/**
 * WebCrypto implementation of the scheme.
 * @param {e2e.ByteArray} data
 * @return {!e2e.async.Result.<!e2e.signer.signature.Signature>}
 */
e2e.scheme.SignatureScheme.prototype.signWebCrypto;


/**
 * JavaScript implementation of the scheme.
 * @param {!e2e.ByteArray} data The data to verify.
 * @param {!e2e.signer.signature.Signature} sig The signature to check.
 * @return {!e2e.async.Result.<boolean>}
 */
e2e.scheme.SignatureScheme.prototype.verifyJavaScript;


/**
 * WebCrypto implementation of the scheme.
 * @param {!e2e.ByteArray} data The data to verify.
 * @param {!e2e.signer.signature.Signature} sig The signature to check.
 * @return {!e2e.async.Result.<boolean>}
 */
e2e.scheme.SignatureScheme.prototype.verifyWebCrypto;
