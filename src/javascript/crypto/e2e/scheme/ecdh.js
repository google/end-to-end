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
 * @fileoverview A scheme for using different sources (e.g., webcrypto, JS) to
 * encrypt with ecdh.
 */
goog.provide('e2e.scheme.Ecdh');

goog.require('e2e.asymmetric.keygenerator');
goog.require('e2e.async.Result');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.scheme.EncryptionScheme');
goog.require('goog.asserts');
goog.require('goog.object');



/**
 * Provides functions that e2e.scheme.Scheme will call.
 * @param {e2e.cipher.Cipher} cipher
 * @constructor
 * @extends {e2e.scheme.EncryptionScheme}
 */
e2e.scheme.Ecdh = function(cipher) {
  this.algorithmIdentifier = {
    'name': 'ECDH',
    'namedCurve': 'P-256'
  };
  goog.base(this, cipher);
};
goog.inherits(e2e.scheme.Ecdh, e2e.scheme.EncryptionScheme);


/** @override */
e2e.scheme.Ecdh.prototype.encryptWebCrypto = function(plaintext) {
  // Together, generateKey and deriveBits should be equivalent to the Alice
  // operation.
  return e2e.async.Result.fromPromise(
      /** @type {!goog.Thenable<e2e.cipher.ciphertext.CipherText>} */(
      this.webCryptoGenerateEphemeralKey_()
      .then(goog.bind(this.webCryptoDeriveBitsAlice_, this))
      // WebCrypto includes built-in support for AES key wrapping ('AES-KW').
      // Unfortunately, subtle.wrapKey requires the key to be in raw, pkcs8, or
      // jwk format.  OpenPGP format is not supported.
      // Therefore, we have to implement AES key wrapping ourselves by calling
      // deriveBits.  We also have to do AES in javascript, because WebCrypto
      // only supports AES-derived stream ciphers.
      .then(goog.bind(this.webCryptoExportAndWrap_, this, plaintext))));
};


/**
 * @private @typedef {{
 *   privateKey: webCrypto.CryptoKey,
 *   publicKey:webCrypto.CryptoKey
 * }}
 */
e2e.scheme.Ecdh.WebCryptoKeyPair_;


/**
 * @return {!Promise<e2e.scheme.Ecdh.WebCryptoKeyPair_>}
 * @private
 */
e2e.scheme.Ecdh.prototype.webCryptoGenerateEphemeralKey_ = function() {
  return goog.global.crypto.subtle.generateKey(this.algorithmIdentifier, true,
      ['deriveBits']);
};


/**
 * @private @typedef {{
 *   derivedBits: ArrayBuffer,
 *   ephemeralKey: e2e.scheme.Ecdh.WebCryptoKeyPair_
 * }}
 */
e2e.scheme.Ecdh.WrapInputs_;


/**
 * @param {e2e.scheme.Ecdh.WebCryptoKeyPair_} ephemeralKey
 * @return {!Promise<e2e.scheme.Ecdh.WrapInputs_>}
 * @private
 */
e2e.scheme.Ecdh.prototype.webCryptoDeriveBitsAlice_ = function(ephemeralKey) {
  var ecdhParams = goog.object.clone(this.algorithmIdentifier);
  ecdhParams['public'] = this.cipher.getWebCryptoKey().publicKey;
  return goog.global.crypto.subtle.deriveBits(
      ecdhParams, ephemeralKey.privateKey, 256).then(function(derivedBits) {
    goog.asserts.assert(derivedBits.byteLength == 32);
    return {
      derivedBits: derivedBits,
      ephemeralKey: ephemeralKey
    };
  });
};


/**
 * @param {!e2e.ByteArray} plaintext
 * @param {e2e.scheme.Ecdh.WrapInputs_} bitsAndKey
 * @return {!Promise<e2e.cipher.ciphertext.CipherText>}
 * @private
 */
e2e.scheme.Ecdh.prototype.webCryptoExportAndWrap_ = function(plaintext,
    bitsAndKey) {
  var derivedBits = bitsAndKey.derivedBits;
  var ephemeralPubKey = bitsAndKey.ephemeralKey.publicKey;
  var keyWrapper =
      this.cipher.getKeyWrapper(new Uint8Array(derivedBits));
  var u = keyWrapper.wrap(plaintext);
  return goog.global.crypto.subtle.exportKey('jwk', ephemeralPubKey)
      .then(function(jwkKey) {
        var ecKey = e2e.asymmetric.keygenerator.jwkToEc(jwkKey);
        return {
          'u': u,
          'v': ecKey.pubKey
        };
      });
};


/** @override */
e2e.scheme.Ecdh.prototype.decryptWebCrypto = function(ciphertext) {
  return e2e.async.Result.fromPromise(
      e2e.asymmetric.keygenerator.importWebCryptoKey(ciphertext.v,
          this.algorithmIdentifier)
      .then(goog.bind(this.webCryptoDeriveBitsBob_, this))
      .then(goog.bind(this.webCryptoUnwrap_, this, ciphertext.u)));
};


/**
 * @param {webCrypto.CryptoKey} ephemeralPubKey
 * @return {!Promise<!ArrayBuffer>} The 32-byte (256-bit) shared secret.
 * @private
 */
e2e.scheme.Ecdh.prototype.webCryptoDeriveBitsBob_ = function(ephemeralPubKey) {
  var ecdhParams = goog.object.clone(this.algorithmIdentifier);
  ecdhParams['public'] = ephemeralPubKey;
  var myPrivateKey = this.cipher.getWebCryptoKey().privateKey;
  return goog.global.crypto.subtle.deriveBits(ecdhParams, myPrivateKey, 256);
};


/**
 * @param {e2e.ByteArray} u The wrapped plaintext
 * @param {ArrayBuffer} derivedBits A 256-bit shared secret
 * @return {e2e.ByteArray} The plaintext
 * @private
 */
e2e.scheme.Ecdh.prototype.webCryptoUnwrap_ = function(u, derivedBits) {
  goog.asserts.assert(derivedBits.byteLength == 32);
  var keyWrapper =
      this.cipher.getKeyWrapper(new Uint8Array(derivedBits));
  return keyWrapper.unwrap(u);
};


/** @override */
e2e.scheme.Ecdh.prototype.encryptJavaScript = function(plaintext) {
  return this.cipher.encrypt(plaintext);
};


/** @override */
e2e.scheme.Ecdh.prototype.decryptJavaScript = function(ciphertext) {
  return this.cipher.decrypt(ciphertext);
};


/** @override */
e2e.scheme.Ecdh.prototype.decryptHardware = function(ciphertext) {
  throw new e2e.openpgp.error.UnsupportedError(
      "Hardware API doesn't exist yet");
};


/** @override */
e2e.scheme.Ecdh.prototype.encryptJavaScriptKeyWithWebCrypto = function(
    plaintext) {
  return this.ensureWebCryptoImport(this.algorithmIdentifier,
      [], ['deriveBits']).addCallback(
      goog.bind(this.encryptWebCrypto, this, plaintext));
};


/** @override */
e2e.scheme.Ecdh.prototype.decryptJavaScriptKeyWithWebCrypto = function(
    ciphertext) {
  return this.ensureWebCryptoImport(this.algorithmIdentifier,
      [], ['deriveBits']).addCallback(
      goog.bind(this.decryptWebCrypto, this, ciphertext));
};
