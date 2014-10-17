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
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.scheme.SignatureScheme');

goog.provide('e2e.scheme.Ecdsa');



/**
 * Provides functions that e2e.scheme.Scheme will call.
 * @param {e2e.signer.Signer} signer
 * @constructor
 * @extends {e2e.scheme.SignatureScheme}
 */
e2e.scheme.Ecdsa = function(signer) {
  this.signer = signer;
  // This isn't actually implemented in Chrome yet...
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
  throw new e2e.openpgp.error.UnsupportedError(
      "Chrome doesn't support ecdsa yet!");
};


/** @override */
e2e.scheme.Ecdsa.prototype.signWebCrypto = function(data) {
  throw new e2e.openpgp.error.UnsupportedError(
      "Chrome doesn't support ecdsa yet!");
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


