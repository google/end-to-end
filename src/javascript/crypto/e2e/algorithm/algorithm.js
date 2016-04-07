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
 * @fileoverview Base class for the implementation of a cryptographic algorithm.
 */

goog.provide('e2e.Algorithm');
goog.provide('e2e.AlgorithmImpl');

/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.cipher.key');
goog.require('goog.asserts');
goog.require('goog.object');



/**
 * @interface
 */
e2e.Algorithm = function() {};


/**
 * The algorithm being implemented.
 * @type {!e2e.signer.Algorithm|!e2e.cipher.Algorithm}
 */
e2e.Algorithm.prototype.algorithm;


/**
 * @type {e2e.cipher.key.Key|e2e.signer.key.Key|null}
 * @protected
 */
e2e.Algorithm.prototype.key;


/**
 * @type {e2e.algorithm.WebCryptoKeyPair}
 * @protected
 */
e2e.Algorithm.prototype.webCryptoKey;


/**
 * @type {number}
 */
e2e.Algorithm.prototype.keySize;


/**
 * Returns a copy of the key that can be modified.
 * @return {e2e.cipher.key.Key|e2e.signer.key.Key|null} The key or null if not
 *     yet set.
 */
e2e.Algorithm.prototype.getKey;


/**
 * Changes the key of the algorithm.
 * @param {!e2e.cipher.key.Key|!e2e.signer.key.Key} key The key.
 * @param {number=} opt_keySize The key size in bytes.
 */
e2e.Algorithm.prototype.setKey;


/**
 * Changes the WebCrypto key of the algorithm.
 * @param {!e2e.algorithm.WebCryptoKeyPair} webCryptoKey The WebCrypto key
 */
e2e.Algorithm.prototype.setWebCryptoKey;


/**
 * Returns a WebCrypto key object (which we don't possess key material).
 * @return {e2e.algorithm.WebCryptoKeyPair}
 */
e2e.Algorithm.prototype.getWebCryptoKey;


/**
 * Returns whether a WebCrypto key object exists or not.
 * @return {boolean}
 */
e2e.Algorithm.prototype.hasWebCryptoKey;



/**
 * @param {!e2e.signer.Algorithm|!e2e.cipher.Algorithm} algorithm
 * @param {e2e.signer.key.Key|e2e.cipher.key.Key=} opt_key
 * @constructor
 * @implements {e2e.Algorithm}
 */
e2e.AlgorithmImpl = function(algorithm, opt_key) {
  this.algorithm = algorithm;
  if (goog.isDefAndNotNull(opt_key)) {
    this.setKey(opt_key);
  }
};


/** @override */
e2e.AlgorithmImpl.prototype.setWebCryptoKey = function(webCryptoKey) {
  this.webCryptoKey = webCryptoKey;
};


/** @override */
e2e.AlgorithmImpl.prototype.webCryptoKey;


/** @override */
e2e.AlgorithmImpl.prototype.key;


/** @override */
e2e.AlgorithmImpl.prototype.keySize;


/** @override */
e2e.AlgorithmImpl.prototype.getKey = function() {
  return /** @type {e2e.cipher.key.Key|e2e.signer.key.Key} */ (
      goog.object.clone(this.key));
};


/** @override */
e2e.AlgorithmImpl.prototype.setKey = function(key, opt_keySize) {
  this.key = key;
  if (goog.isDef(opt_keySize)) {
    this.keySize = opt_keySize;
  }
};


/** @override */
e2e.AlgorithmImpl.prototype.getWebCryptoKey = function() {
  goog.asserts.assert(goog.isDef(this.webCryptoKey));
  return this.webCryptoKey;
};


/** @override */
e2e.AlgorithmImpl.prototype.hasWebCryptoKey = function() {
  return goog.isDefAndNotNull(this.webCryptoKey);
};
