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
 * @fileoverview Representation of a textbook RSA cipher. This should only be
 * used together with PKCS or some other padding system.
 * TODO(adhintz) Limit the visibility of this package.
 */

goog.provide('e2e.cipher.RSA');

goog.require('e2e');
goog.require('e2e.Algorithm');
goog.require('e2e.BigNumModulus');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.AsymmetricCipher');
goog.require('e2e.cipher.factory');
goog.require('e2e.hash.Algorithm');
goog.require('e2e.hash.Sha1');
goog.require('e2e.hash.Sha224');
goog.require('e2e.hash.Sha256');
goog.require('e2e.hash.Sha512');
goog.require('e2e.hash.factory');
goog.require('e2e.pkcs.EMSA_PKCS1_v1_5');
goog.require('e2e.random');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.Signer');
goog.require('e2e.signer.factory');
goog.require('goog.asserts');


/**
 * Representation of an RSA public and/or private key. (Implements both, signer
 * and cipher).
 * @param {e2e.cipher.Algorithm|e2e.signer.Algorithm} algorithm
 *     The algorithm to retrieve.
 * @param {e2e.cipher.key.Key|e2e.signer.key.Key=} opt_key The
 *     public or private key.
 * @constructor
 * @implements {e2e.cipher.AsymmetricCipher}
 * @implements {e2e.signer.Signer}
 * @extends {e2e.AlgorithmImpl}
 */
e2e.cipher.RSA = function(algorithm, opt_key) {
  goog.base(this, e2e.cipher.Algorithm.RSA, opt_key);
  goog.asserts.assert(algorithm == e2e.cipher.Algorithm.RSA,
      'Algorithm should be RSA.');
};
goog.inherits(e2e.cipher.RSA, e2e.AlgorithmImpl);


/** @type {e2e.BigNumModulus} */
e2e.cipher.RSA.prototype.modulus;


/**
 * The hash function that should be used. This is selected based on the bit
 *     length.
 * @private {e2e.hash.Hash}
 */
e2e.cipher.RSA.prototype.hash_;


/**
 * Cached last-used blinder
 * @type {!e2e.BigNum}
 * @private
 */
e2e.cipher.RSA.prototype.blinder_ = e2e.BigNum.ZERO;


/**
 * Cached last-used unblinder
 * @type {!e2e.BigNum}
 * @private
 */
e2e.cipher.RSA.prototype.unblinder_ = e2e.BigNum.ZERO;


/**
 * @type {boolean}
 */
e2e.cipher.RSA.prototype.use_blinding = false;


/** @override */
e2e.cipher.RSA.prototype.getHash = function() {
  return this.hash_;
};


/** @override */
e2e.cipher.RSA.prototype.setHash = function(hash) {
  this.hash_ = hash;
};


/** @inheritDoc */
e2e.cipher.RSA.prototype.setKey = function(key) {
  goog.asserts.assertArray(key['n'], 'Modulus should be defined.');
  goog.asserts.assertArray(key['e'], 'Public exponent should be defined.');
  this.modulus = new e2e.BigNumModulus(key['n']);
  var bitLength = this.modulus.getBitLength();
  switch (true) {
    // TODO(evn): Reject < 1024 bit keys (we use them in unit tests).
    case bitLength <= 1024:
      this.hash_ = new e2e.hash.Sha1;
      break;
    case bitLength <= 2048 && bitLength > 1024:
      this.hash_ = new e2e.hash.Sha224;
      break;
    case bitLength <= 4096 && bitLength > 2048:
      this.hash_ = new e2e.hash.Sha256;
      break;
    case bitLength > 4096:
      this.hash_ = new e2e.hash.Sha512;
      break;
    default:
      throw new e2e.cipher.Error('Invalid key size.');
  }

  // we only use blinding if prime components are known
  this.use_blinding = goog.isDef(key['p']) && goog.isDef(key['q']);

  // TODO(adhintz) Throw exception if key size is smaller than 1024 bits.
  // For this we'll need new test values in rsa_test.html.
  goog.base(this, 'setKey', key, Math.ceil(this.modulus.getBitLength() / 8));
  if (this.use_blinding) { // precompute blinders
    this.blinder_ = e2e.BigNum.ZERO.clone();
    this.calculateBlindingNonces_();
  }
};


/** @inheritDoc */
e2e.cipher.RSA.prototype.encrypt = function(plaintext) {
  goog.asserts.assertArray(this.key['e'],
      'Public exponent should be defined.');
  return /** @type {e2e.cipher.ciphertext.AsymmetricAsync} */ (
      e2e.async.Result.toResult(
          {c: this.modulus.pow(plaintext, this.key['e'])}));
};


/**
 * Creates a random BigNum in range [1..limit-1]
 * @param {e2e.BigNum=} limit upper bound
 * @return {!e2e.BigNum}
 * @private
 */
e2e.cipher.RSA.prototype.getRandomBigNum_ = function(limit) {
  var byteSize = Math.ceil(limit.getBitLength() / 8);
  var candidate;
  do {
    candidate = new e2e.BigNum(e2e.random.getRandomBytes(
      byteSize));
  } while (candidate.isGreaterOrEqual(limit) ||
           candidate.isEqual(e2e.BigNum.ZERO));
  return candidate;
};


/**
 * Generates blinding nonces used to eliminate timing side-channels in RSA
 * decryption. First nonce pair is derived from generated BigNum random,
 * subsequent nonces are squared from previous ones for optimization.
 * @private
 */
e2e.cipher.RSA.prototype.calculateBlindingNonces_ = function() {
    if (this.blinder_.isEqual(e2e.BigNum.ZERO)) {
      var r = this.getRandomBigNum_(this.modulus);
      // r should be relatively prime to this.modulus (i.e. != p &  != q)
      // the chance for r being k*p or k*q is negligible, we're skipping
      // the check
      var p = new e2e.BigNum(this.key['p']);
      var q = new e2e.BigNum(this.key['q']);
      var phi = this.modulus.add(e2e.BigNum.ONE).subtract(p.add(q));
      var inv = this.modulus.modPower(r, phi.subtract(e2e.BigNum.ONE));
      this.blinder_ = this.modulus.modPower(inv, this.key['e']);
      this.unblinder_ = r;
    } else {  // we already generated, derive new by squaring
      this.blinder_ = this.modulus.modMultiply(this.blinder_, this.blinder_);
      this.unblinder_ = this.modulus.modMultiply(this.unblinder_,
        this.unblinder_);
    }
};


/** @inheritDoc */
e2e.cipher.RSA.prototype.decrypt = function(ciphertext) {
  goog.asserts.assertArray(this.key['d'],
      'Private exponent should be defined.');
  goog.asserts.assertArray(ciphertext['c'],
      'Ciphertext should be defined.');
  if (this.use_blinding) {
    goog.asserts.assertArray(this.key['p'],
        'p should be defined.');
    goog.asserts.assertArray(this.key['q'],
        'q should be defined.');
    this.calculateBlindingNonces_();
    var blinded = this.modulus.modMultiply(
      new e2e.BigNum(ciphertext['c']),
      this.blinder_);
    var decryption = this.modulus.modPower(blinded, this.key['d']);
    var deblinded = this.modulus.modMultiply(decryption, this.unblinder_);
    return e2e.async.Result.toResult(deblinded.toByteArray());
  } else {
    return e2e.async.Result.toResult(this.modulus.pow(ciphertext['c'],
              this.key['d']));
  }
};


/** @override */
e2e.cipher.RSA.prototype.sign = function(data) {
  var signature = {};
  var paddedHash = e2e.pkcs.EMSA_PKCS1_v1_5(
      this.getHash(),
      data,
      this.keySize - 1,
      true);
  signature.hashValue = this.getHash().hash(data);
  signature.s = e2e.async.Result.getValue(
      this.decrypt({'c': paddedHash}));
  return /** @type {e2e.signer.signature.SignatureAsync} */ (
      e2e.async.Result.toResult(signature));
};


/** @override */
e2e.cipher.RSA.prototype.verify = function(data, sig) {
  var encodedActualHash = e2e.pkcs.EMSA_PKCS1_v1_5(
    this.getHash(),
    data,
    this.keySize - 1,
    true);
  var encodedSignedHash = e2e.async.Result.getValue(
      this.encrypt(sig['s']))['c'];
  return e2e.async.Result.toResult(
      e2e.compareByteArray(encodedActualHash, encodedSignedHash));
};


e2e.cipher.factory.add(e2e.cipher.RSA,
                               e2e.cipher.Algorithm.RSA);
e2e.signer.factory.add(e2e.cipher.RSA,
                               e2e.signer.Algorithm.RSA);
