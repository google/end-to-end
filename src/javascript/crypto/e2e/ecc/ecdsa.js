/**
 * @license
 * Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview An implementation of the ECDSA digital signature protocol.
 * @author thaidn@google.com (Thai Duong)
 */

goog.provide('e2e.ecc.Ecdsa');

goog.require('e2e');
goog.require('e2e.BigNum');
goog.require('e2e.ecc.PrimeCurve');
goog.require('e2e.ecc.Protocol');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.hash.Algorithm');
goog.require('e2e.hash.Sha256');
goog.require('e2e.hash.Sha384');
goog.require('e2e.hash.Sha512');
goog.require('e2e.random');
/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.signer.signature.Signature');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Representation of an instance of the ECDSA protocol.
 * @param {!e2e.ecc.PrimeCurve} curveName The curve used for
 *     this protocol.
 * @param {{pubKey: !e2e.ByteArray, privKey: (!e2e.ByteArray|undefined)}=}
 *     opt_key The public and/or private key used in this protocol.
 * @constructor
 * @extends {e2e.ecc.Protocol}
 */
e2e.ecc.Ecdsa = function(curveName, opt_key) {
  e2e.ecc.Ecdsa.base(this, 'constructor', curveName, opt_key);
  switch (curveName) {
    case e2e.ecc.PrimeCurve.P_256:
      this.hash_ = new e2e.hash.Sha256();
      break;
    case e2e.ecc.PrimeCurve.P_384:
      this.hash_ = new e2e.hash.Sha384();
      break;
    case e2e.ecc.PrimeCurve.P_521:
      this.hash_ = new e2e.hash.Sha512();
      break;
    default:
      throw new e2e.error.InvalidArgumentsError(
          'Unknown algorithm for ECDSA: ' + curveName);
  }
};
goog.inherits(e2e.ecc.Ecdsa, e2e.ecc.Protocol);


/**
 * List of Hash algorithms that are allowed to be used for ECDSA.
 * @type {!Array<!e2e.hash.Algorithm>}
 * @private
 */
e2e.ecc.Ecdsa.ALLOWED_HASHES_ = [
  e2e.hash.Algorithm.SHA256,
  e2e.hash.Algorithm.SHA384,
  e2e.hash.Algorithm.SHA512
];


/**
 * The hash function that should be used. This is selected based on the curve.
 * @private {!e2e.hash.Hash}
 */
e2e.ecc.Ecdsa.prototype.hash_;


/** @return {!e2e.hash.Hash} */
e2e.ecc.Ecdsa.prototype.getHash = function() {
  return this.hash_;
};


/**
 * Sets the appropriate hash algorithm. Used e.g. during signature verification
 * in OpenPGP, where the signer specifies which algorithm was used.
 * @param {!e2e.hash.Hash} hash The hash algorithm.
 */
e2e.ecc.Ecdsa.prototype.setHash = function(hash) {
  if (!goog.array.contains(e2e.ecc.Ecdsa.ALLOWED_HASHES_, hash.algorithm)) {
    throw new e2e.error.InvalidArgumentsError(
        'Specified hash algorithm is disallowed for ECDSA: ' + hash.algorithm);
  }
  this.hash_ = hash;
};


/**
 * Applies the signing algorithm to the data.
 * @param {!Uint8Array|!e2e.ByteArray|string} message The data to sign.
 * @return {!e2e.signer.signature.Signature}
 */
e2e.ecc.Ecdsa.prototype.sign = function(message) {
  var sig;
  var digest = this.hashWithTruncation_(message);
  do {
    var k = this.generatePerMessageNonce_(digest);
    sig = this.signWithNonce_(digest, k);
  } while (sig == null);
  return sig;
};


/**
 * Exports the sign function for testing.
 * @param {!Uint8Array|!e2e.ByteArray|string} message The data to sign.
 * @param {!e2e.BigNum} k The per-message secret.
 * @return {?e2e.signer.signature.Signature}
 */
e2e.ecc.Ecdsa.prototype.signForTestingOnly = function(message, k) {
  var digest = this.hash_.hash(message);
  return this.signWithNonce_(digest, k);
};


/**
 * Generates the ECDSA signature using the provided per-message secret.
 * Returns null in the very rare case that r or s evaluates to 0, and we need
 * to try a different nonce.
 *
 * @param {!e2e.ByteArray} digest The digest of the message being signed.
 * @param {!e2e.BigNum} k The per-message secret.
 * @return {?e2e.signer.signature.Signature}
 * @private
 */
e2e.ecc.Ecdsa.prototype.signWithNonce_ = function(digest, k) {
  goog.asserts.assertObject(this.params, 'Domain params should be defined.');
  goog.asserts.assertObject(this.getPrivateKey(),
      'Private key value should be defined.');
  var N = this.params.n;
  // Sanity check on the per-message nonce that it's in [1, N-1].
  if (k.isGreaterOrEqual(N) ||
      k.isEqual(e2e.BigNum.ZERO)) {
    throw new e2e.error.InvalidArgumentsError(
        'Failed to sign message: invalid per-message nonce.');
  }
  // kG = (x1, y1)
  // r = x1 mod n.
  var r = N.residue(this.params.g.multiply(k).getX().toBigNum());
  if (r.isEqual(e2e.BigNum.ZERO)) {
    return null;
  }  // e = digest as bignum
  var e = new e2e.BigNum(digest);
  // s = k^{-1}(e + dr) (mod n)
  var privateKeyBytes = this.getPrivateKey();
  var privateKey =
      N.residue(this.params.bigNumFromPrivateKey(privateKeyBytes));
  var s = N.modAdd(N.residue(e), N.modMultiply(privateKey, r));
  if (s.isEqual(e2e.BigNum.ZERO)) {
    return null;
  }
  s = N.modMultiply(s, N.modInverse(k));
  var sig = {
    'r': r.toByteArray(),
    's': s.toByteArray(),
    'hashValue': digest
  };
  return sig;
};


/**
 * Applies the verification algorithm to the data.
 * @param {!Uint8Array|!e2e.ByteArray|string} message The data to verify.
 * @param {{s: !e2e.ByteArray, r: !e2e.ByteArray}} sig The
 *     signature to verify.
 * @return {boolean}
 */
e2e.ecc.Ecdsa.prototype.verify = function(message, sig) {
  goog.asserts.assertObject(this.params, 'Domain params should be defined.');
  goog.asserts.assertObject(this.getPublicKey(),
      'Public key value should be defined.');

  var N = this.params.n;
  var r = new e2e.BigNum(sig['r']);
  var s = new e2e.BigNum(sig['s']);
  // r and s should be in [1, N-1].
  if (r.isGreaterOrEqual(N) ||
      r.isEqual(e2e.BigNum.ZERO) ||
      s.isGreaterOrEqual(N) ||
      s.isEqual(e2e.BigNum.ZERO)) {
    return false;
  }
  // e = H(m)
  var e = new e2e.BigNum(this.hashWithTruncation_(message));
  // w = s^{-1} mod n
  var w = N.modInverse(s);
  // u1 = ew mod n
  var u1 = N.modMultiply(N.residue(e), w);
  // u2 = rw mod n
  var u2 = N.modMultiply(r, w);
  // X = u1 * G + u2 * Q = s^{-1} * (e + dr) * G = k * G
  var X = this.params.g.multiply(u1).add(
      this.getPublicKeyAsPoint().multiply(u2));
  if (X.isInfinity()) {
    return false;
  }
  var x = N.residue(X.getX().toBigNum());
  return x.isEqual(r);
};


/**
 * Generates a random number used as per-message secret in ECDSA.
 * This code includes a hash of the secret key and the message digest of the
 * message in its calculation in order to minimize the damage that could be
 * done by a bad RNG.
 *
 * This implementation is intended to comply with section B.5.2 of
 * FIPS-186-4 for generating per-message secret nonces.
 *
 * @param {!e2e.ByteArray} digest The digest of the message.
 * @return {!e2e.BigNum}
 * @private
 */
e2e.ecc.Ecdsa.prototype.generatePerMessageNonce_ = function(digest) {
  var N = this.params.n;
  var nonceLength = Math.ceil(this.params.curve.keySizeInBits() / 8);
  var hasher = new e2e.hash.Sha512();
  var privateKey = this.getPrivateKey();
  while (privateKey.length < nonceLength) {
    // Avoid accidentally leaking the length of the private key.
    privateKey.unshift(0);
  }
  var privateKeyDigest = hasher.hash(privateKey);
  do {
    var randomBytes = e2e.random.getRandomBytes(nonceLength);
    var nonceBytes = [];
    do {
      hasher.reset();
      // When generating more than 512 bytes, the following line ensures that
      // the multiple pieces are different
      hasher.update(e2e.wordToByteArray(nonceBytes.length));
      hasher.update(privateKeyDigest);
      hasher.update(digest);
      hasher.update(randomBytes);
      nonceBytes = goog.array.concat(nonceBytes, hasher.digest());
    } while (nonceBytes.length < nonceLength);
    nonceBytes = nonceBytes.slice(0, nonceLength);
    nonceBytes[0] >>= (8 * nonceLength - N.getBitLength());
    var nonce = new e2e.BigNum(nonceBytes);
    // nonce must be in the range [1..N-1]
  } while (nonce.isEqual(e2e.BigNum.ZERO) || nonce.compare(N) >= 0);
  return nonce;
};


/**
 * Creates a message digest, truncating it to the bit-length of the curve order.
 * @param {Uint8Array|Array.<number>|string} message The message to hash.
 * @return {!Array.<number>} The checksum.
 * @private
 */
e2e.ecc.Ecdsa.prototype.hashWithTruncation_ = function(message) {
  var hash = this.hash_.hash(message);

  var bitLength = this.params.n.getBitLength();
  // Use 512-bit hashes for P_521 curve.
  if (bitLength == 521) {
    bitLength = 512;
  }
  if (Math.ceil(bitLength / 8) > hash.length) {
    throw new e2e.error.InvalidArgumentsError(
        'Digest algorithm is too short for this curve.');
  }
  return goog.array.slice(hash, 0, Math.ceil(bitLength / 8));
};

