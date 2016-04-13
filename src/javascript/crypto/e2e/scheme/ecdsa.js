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
 * sign with ecdsa.
 */

goog.provide('e2e.scheme.Ecdsa');

goog.require('e2e.async.Result');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.scheme.SignatureScheme');



/**
 * Provides functions that e2e.scheme.Scheme will call.
 * @param {e2e.signer.Signer} signer
 * @constructor
 * @extends {e2e.scheme.SignatureScheme}
 */
e2e.scheme.Ecdsa = function(signer) {
  this.signer = signer;
  this.algorithmIdentifier = {
    'name': 'ECDSA',
    'namedCurve': 'P-256',
    'hash': { 'name' : 'SHA-256' }
  };
  goog.base(this, signer);
};
goog.inherits(e2e.scheme.Ecdsa, e2e.scheme.SignatureScheme);


/** @override */
e2e.scheme.Ecdsa.prototype.verifyWebCrypto = function(m, sig) {
  var key = this.signer.getWebCryptoKey().publicKey;
  var sigBuf = new ArrayBuffer(64);
  // sig.r and sig.s are 32-byte arrays, but leading zeros may have been
  // stripped.
  var r = new Uint8Array(sigBuf, 32 - sig.r.length, sig.r.length);
  r.set(sig.r);
  var s = new Uint8Array(sigBuf, 64 - sig.s.length, sig.s.length);
  s.set(sig.s);

  var result = new e2e.async.Result();
  goog.global.crypto.subtle.verify(
      this.algorithmIdentifier,
      key,
      sigBuf,
      new Uint8Array(m)).then(goog.bind(result.callback, result),
      goog.bind(result.errback, result));
  return result;
};


/** @override */
e2e.scheme.Ecdsa.prototype.signWebCrypto = function(data) {
  var key = this.signer.getWebCryptoKey().privateKey;
  var dataArray = new Uint8Array(data);

  // Note: This effectively computes the digest twice.  This appears to be
  // unavoidable, because e2e needs to know the hash value, but
  // crypto.subtle.sign does not expose it.
  var hashValuePromise = goog.global.crypto.subtle.digest(
      this.algorithmIdentifier['hash'], dataArray);

  var sigBufPromise = goog.global.crypto.subtle.sign(
      this.algorithmIdentifier, key, dataArray);

  var result = new e2e.async.Result();
  // This construction effectively waits for both computations to complete in
  // parallel.  However, the browser probably won't actually parallelize them.
  hashValuePromise.then(function(hashValue) {
    return sigBufPromise.then(function(sigBuf) {
      result.callback({
        r: new Uint8Array(sigBuf, 0, 32),
        s: new Uint8Array(sigBuf, 32, 32),
        hashValue: new Uint8Array(hashValue)
      });
    });
  }).catch(goog.bind(result.errback, result));
  return result;
};


/** @override */
e2e.scheme.Ecdsa.prototype.verifyJavaScript = function(m, sig) {
  return this.signer.verify(m, sig);
};


/** @override */
e2e.scheme.Ecdsa.prototype.signJavaScript = function(data) {
  return this.signer.sign(data);
};


/** @override */
e2e.scheme.Ecdsa.prototype.signHardware = function(data) {
  throw new e2e.openpgp.error.UnsupportedError(
      "Hardware API doesn't exist yet");
};


/** @override */
e2e.scheme.Ecdsa.prototype.verifyJavaScriptKeyWithWebCrypto = function(m, sig) {
  return this.ensureWebCryptoImport(this.algorithmIdentifier,
      ['verify'], ['sign']).addCallback(
      goog.bind(this.verifyWebCrypto, this, m, sig));
};


/** @override */
e2e.scheme.Ecdsa.prototype.signJavaScriptKeyWithWebCrypto = function(data) {
  return this.ensureWebCryptoImport(this.algorithmIdentifier,
      ['verify'], ['sign']).addCallback(
      goog.bind(this.signWebCrypto, this, data));
};
