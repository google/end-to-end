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
 * @fileoverview An implementation of the ed25519 digital signature protocol.
 * @author fy@google.com (Frank Yellin)
 */

goog.provide('e2e.ecc.Ed25519');

goog.require('e2e.ecc.PrimeCurve');
goog.require('e2e.ecc.Protocol');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.hash.Sha512');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Representation of an instance of the ed25519 protocol.
 * @param {!e2e.ecc.PrimeCurve} curveName The curve used for
 *     this protocol.
 * @param {{pubKey: !e2e.ByteArray, privKey:!e2e.ByteArray}=} opt_key
 *     The public and/or private key used in this protocol.
 * @constructor
 * @extends {e2e.ecc.Protocol}
 */
e2e.ecc.Ed25519 = function(curveName, opt_key) {
  if (curveName != e2e.ecc.PrimeCurve.ED_25519) {
    throw new e2e.error.InvalidArgumentsError(
        'Unknown algorithm for Ed25519: ' + curveName);
  }
  var key = opt_key && {
    'pubKey': opt_key['pubKey'],
    'privKey': opt_key['privKey']
  };
  e2e.ecc.Ed25519.base(this, 'constructor', curveName, key);

  /**
   * @private {!e2e.hash.Hash}
   */
  this.hash_ = new e2e.hash.Sha512();
};
goog.inherits(e2e.ecc.Ed25519, e2e.ecc.Protocol);


/** @return {!e2e.hash.Hash} */
e2e.ecc.Ed25519.prototype.getHash = function() {
  return this.hash_;
};


/**
 * Applies the signing algorithm to the data.
 * @param {!Uint8Array|!e2e.ByteArray|string} message The data to sign.
 * @return {!e2e.ByteArray}
 */
e2e.ecc.Ed25519.prototype.sign = function(message) {
  goog.asserts.assertObject(this.params, 'Domain params should be defined.');
  goog.asserts.assertObject(this.getPrivateKey(),
      'Private key value should be defined.');
  goog.asserts.assertObject(this.getPublicKey(),
      'Public key value should be defined.');

  var expandedKey = this.params.expandPrivateKey(
      this.hash_, this.getPrivateKey());
  var a = expandedKey.multiplier;
  var r = this.generatePerMessageSeed_(message, expandedKey.extra);
  var R = this.params.g.multiply(this.params.n.residue(r));
  var h = this.perMessageDigest_(R, message);
  var S = this.params.n.residue(r.add(h.multiply(a)));
  var encodedR = R.toByteArray();
  var encodedS = this.params.curve.littleEndianByteArray32FromBigNum(S);
  return goog.array.concat(encodedR, encodedS);
};


/**
 * Exports the sign function for testing.
 * @param {!Uint8Array|!e2e.ByteArray|string} message The data to sign.
 * @param {!e2e.BigNum} nonce The per-message secret.
 * @return {!e2e.ByteArray}
 */
e2e.ecc.Ed25519.prototype.signForTestingOnly = function(message,
    nonce) {
  // Signing is already deterministic, so we don't need a special deterministic
  // form for testing.
  return this.sign(message);
};


/**
 * Applies the verification algorithm to the data.
 * @param {!Uint8Array|!e2e.ByteArray|string} message The data to verify.
 * @param {!e2e.ByteArray} signature The  signature to verify.
 * @return {boolean}
 */
e2e.ecc.Ed25519.prototype.verify = function(message, signature) {
  goog.asserts.assert(signature.length == 64, 'Signature must be 64 bytes');
  if (signature[63] & 224) {
    // high three bits must be 0
    return false;
  }
  var R;
  try {
    R = this.params.curve.pointFromByteArray(signature.slice(0, 32));
  } catch (error) {
    if (error instanceof e2e.error.InvalidArgumentsError) {
      return false;
    }
    throw error;
  }
  var A = this.getPublicKeyAsPoint();
  var S = this.params.bigNumFromPrivateKey(signature.slice(32));
  var h = this.perMessageDigest_(R, message);
  var left = this.params.g.multiply(S);
  var right = R.add(A.multiply(h));
  return left.isEqual(right);
};


/**
 * Generates the nonce seed as a BigNum.
 *
 * In most DSA-like signatures, the nonce seed is randomly generated.  In this
 * system, it is created deterministically from the message and the private key.
 *
 * @param {!Uint8Array|!e2e.ByteArray|string} message The data to sign.
 * @param {!e2e.ByteArray} extraBytes
 * @return {!e2e.BigNum}
 * @private
 */
e2e.ecc.Ed25519.prototype.generatePerMessageSeed_ =
    function(message, extraBytes) {
  var hash = this.hash_;
  hash.reset();
  hash.update(extraBytes);
  hash.update(message);
  var digest = hash.digest();
  return this.params.bigNumFromPrivateKey(digest);
};


/**
 * @param {!e2e.ecc.point.Point} perMessageSeed 32 bytes generated by hashing
 *    the private key.
 * @param {!Uint8Array|!e2e.ByteArray|string} message The data to sign.
 * @return {!e2e.BigNum}
 * @private
 */
e2e.ecc.Ed25519.prototype.perMessageDigest_ = function(
    perMessageSeed, message) {
  var hash = this.hash_;
  hash.reset();
  hash.update(perMessageSeed.toByteArray());
  hash.update(this.getPublicKey());
  hash.update(message);
  var digest = hash.digest();
  return this.params.bigNumFromPrivateKey(digest);
};
