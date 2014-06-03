// Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview ECDSA for OpenPGP as described in RFC 6637.
 * @author thaidn@google.com (Thai Duong)
 */

goog.provide('e2e.signer.ECDSA');

goog.require('e2e.Algorithm');
goog.require('e2e.async.Result');
goog.require('e2e.ecc.DomainParam');
goog.require('e2e.ecc.ECDSA');
goog.require('e2e.ecc.Protocol');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.Signer');
goog.require('e2e.signer.factory');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Representation of a ECDSA public or private key.
 * @param {e2e.signer.Algorithm} algorithm The algorithm to retrieve.
 *     It must be e2e.signer.Algorithm.ECDSA.
 * @param {e2e.signer.key.Key=} opt_key The ECDSA key as specified in
 *     section 9 of RFC 6637.
 * @constructor
 * @extends {e2e.AlgorithmImpl}
 * @implements {e2e.signer.Signer}
 */
e2e.signer.ECDSA = function(algorithm, opt_key) {
  goog.asserts.assert(algorithm == e2e.signer.Algorithm.ECDSA,
      'Algorithm must be ECDSA.');
  goog.base(this, e2e.signer.Algorithm.ECDSA, opt_key);
};
goog.inherits(e2e.signer.ECDSA, e2e.AlgorithmImpl);


/**
 * Internal ECDSA implementation.
 * @type {!e2e.ecc.ECDSA}
 * @private
 */
e2e.signer.ECDSA.prototype.ecdsa_;


/** @return {!e2e.hash.Hash} */
e2e.signer.ECDSA.prototype.getHash = function() {
  return this.ecdsa_.getHash();
};


/** @override */
e2e.signer.ECDSA.prototype.setHash = function(hash) {
  this.hash_ = hash;
};


/**
 * Sets the ECDSA public key and/or private key.
 * @override
 */
e2e.signer.ECDSA.prototype.setKey = function(key, opt_keySize) {
  goog.asserts.assertArray(key['curve'], 'Curve should be defined.');
  this.ecdsa_ = new e2e.ecc.ECDSA(
      e2e.ecc.DomainParam.curveNameFromCurveOID(key['curve']),
      /** @type {e2e.signer.key.ECDSA} */ (key));
  // Save key material to serialize later the key.
  goog.base(this, 'setKey', key);
};


/** @inheritDoc */
e2e.signer.ECDSA.prototype.sign = function(m) {
  var sig = /** @type {e2e.signer.signature.Signature} */(
      this.ecdsa_.sign(m));
  return e2e.async.Result.toResult(sig);
};


/**
 * Exports the sign function for testing.
 * @param {e2e.ByteArray} m The message to be signed.
 * @param {!e2e.BigNum} k The per-message secret.
 * @return {!e2e.async.Result.<e2e.signer.signature.Signature>} The
 *     result of signing.
 */
e2e.signer.ECDSA.prototype.signForTestingOnly = function(m, k) {
  var sig = /** @type {e2e.signer.signature.Signature} */(
      this.ecdsa_.signForTestingOnly(m, k));
  return e2e.async.Result.toResult(sig);
};


/** @inheritDoc */
e2e.signer.ECDSA.prototype.verify = function(m, sig) {
  return e2e.async.Result.toResult(this.ecdsa_.verify(
      m, /** @type {{r: e2e.ByteArray, s:e2e.ByteArray}} */(
          sig)));
};


/**
 * Generates a new P-256 key pair and uses it to construct a new ECDSA object.
 * @return {e2e.signer.ECDSA}
 */
e2e.signer.ECDSA.newECDSAWithP256 = function() {
  var key = e2e.ecc.Protocol.generateRandomP256ECDSAKeyPair();
  return new e2e.signer.ECDSA(e2e.signer.Algorithm.ECDSA, key);
};


e2e.signer.factory.add(e2e.signer.ECDSA,
                               e2e.signer.Algorithm.ECDSA);
