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


goog.require('e2e.async.Result');

/**
 * @fileoverview A scheme for using different sources (e.g., webcrypto, JS) to
 * sign with RSA.
 */
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.scheme.SignatureScheme');
goog.require('goog.asserts');

goog.provide('e2e.scheme.Rsassa');



/**
 * Provides functions that e2e.scheme.Scheme will call.
 * @param {e2e.signer.Signer} signer
 * @constructor
 * @extends {e2e.scheme.SignatureScheme}
 */
e2e.scheme.Rsassa = function(signer) {
  this.signer = signer;
  goog.base(this, signer);
  if (this.useWebCrypto) {
    this.algorithmIdentifier = {
      'name': 'RSASSA-PKCS1-v1_5',
      'modulusLength': signer.keySize,
      'publicExponent': new Uint8Array(signer.getKey()['e']),
      'hash': {'name': this.key.publicKey.algorithm.hash.name}
    };
  }
};
goog.inherits(e2e.scheme.Rsassa, e2e.scheme.SignatureScheme);


/** @typedef
 * {!{algorithm: !{hash: !{name: string}, modulusLength: number, name: string,
 * publicExponent: !Uint8Array}, extractable: boolean, type: string,
 * usages: !Array.<string>}}
*/
e2e.scheme.Rsassa.Key;


/** @typedef
 * {!{privateKey: e2e.scheme.Rsassa.Key, publicKey: e2e.scheme.Rsassa.Key}}
 */
e2e.scheme.Rsassa.KeyPair;


/** @override */
e2e.scheme.Rsassa.prototype.verifyWebCrypto = function(m, sig) {
  goog.asserts.assert('verify' in this.crypto, 'No WebCrypto verify()!');
  var result = new e2e.async.Result;
  /** @type {!ArrayBuffer} */
  var webcrypto_sig = new Uint8Array(sig['s']).buffer;
  this.crypto.verify(this.algorithmIdentifier, this.key.publicKey,
      webcrypto_sig, new Uint8Array(m)
  ).then(
      goog.bind(result.callback, result),
      goog.bind(result.errback, result));
  return result;
};


/** @override */
e2e.scheme.Rsassa.prototype.signWebCrypto = function(data) {
  /* TODO(user): Replace the asserts and ugly casting with actual types once
   * we can rely on them being in stable versions of Chrome and can access the
   * type definitions.
   */
  goog.asserts.assert('sign' in this.crypto, 'No WebCrypto sign()!');
  var result = new e2e.async.Result;
  this.crypto.sign(this.algorithmIdentifier, this.key.privateKey,
      new Uint8Array(data)
  ).then(
      goog.bind(result.callback, result),
      goog.bind(result.errback, result));
  return result.addCallback(function(sig) {
    return {'s': [].slice.call(new Uint8Array(sig))};
  });
};


/** @override */
e2e.scheme.Rsassa.prototype.verifyJavaScript = function(m, sig) {
  return this.signer.verify(m, sig);
};


/** @override */
e2e.scheme.Rsassa.prototype.signJavaScript = function(data) {
  return this.signer.sign(data);
};


/** @override */
e2e.scheme.Rsassa.prototype.signHardware = function(data) {
  throw new e2e.openpgp.error.UnsupportedError(
      "Hardware API doesn't support RSA yet");
};
