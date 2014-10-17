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
 * @fileoverview Implementation of RSAES-PKCS1-v1_5 as defined in RFC 3447.
 */

goog.require('e2e.async.Result');
goog.require('e2e.scheme.Eme');

goog.provide('e2e.scheme.Rsaes');



/**
 * Implementation using alternative schemes if available.
 * @param {e2e.cipher.Cipher} cipher
 * @constructor
 * @extends {e2e.scheme.Eme}
 */
e2e.scheme.Rsaes = function(cipher) {
  this.algorithmIdentifier = {
    'name': 'RSAES-PKCS1-v1_5',
    'modulusLength': cipher.keySize,
    'publicExponent': new Uint8Array(cipher.getKey()['e'])
  };
  goog.base(this, cipher);
};
goog.inherits(e2e.scheme.Rsaes, e2e.scheme.Eme);


/** @override */
e2e.scheme.Rsaes.prototype.encryptWebCrypto = function(plaintext) {
  var result = new e2e.async.Result;
  this.crypto.encrypt(
      this.algorithmIdentifier,
      this.key,
      new Uint8Array(plaintext)
  ).then(
      goog.bind(result.callback, result)
  ).catch (
      goog.bind(result.errback, result));
  return result.addCallback(function(c) {
    return {'c': [].slice.call(new Uint8Array(c))};
  });
};


/** @override */
e2e.scheme.Rsaes.prototype.decryptWebCrypto = function(ciphertext) {
  var result = new e2e.async.Result;
  this.crypto.decrypt(
      this.algorithmIdentifier,
      this.key,
      new Uint8Array(ciphertext['c'])
  ).then(
      goog.bind(result.callback, result)).catch (
      goog.bind(result.errback, result));
  return result.addCallback(function(p) {
    return [].slice.call(new Uint8Array(p));
  });
};
