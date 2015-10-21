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
 * @fileoverview DSA for OpenPGP as described in RFC 4880 and FIPS 186.
 * @author thaidn@google.com (Thai Duong)
 */

goog.provide('e2e.signer.Dsa');

goog.require('e2e.AlgorithmImpl');
goog.require('e2e.BigNum');
goog.require('e2e.BigPrimeNum');
goog.require('e2e.async.Result');
goog.require('e2e.hash.Algorithm');
goog.require('e2e.hash.factory');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.random');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.Signer');
goog.require('e2e.signer.factory');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Representation of a DSA public or private key.
 * @param {e2e.signer.Algorithm} algorithm The algorithm to retrieve.
 *     It must be e2e.signer.Algorithm.DSA.
  * @param {e2e.signer.key.Key=} opt_key The DSA key as specified in
 *     RFC 4480.
 * @constructor
 * @implements {e2e.signer.Signer}
 * @extends {e2e.AlgorithmImpl}
 */
e2e.signer.Dsa = function(algorithm, opt_key) {
  goog.asserts.assert(algorithm == e2e.signer.Algorithm.DSA,
      'Algorithm must be DSA.');
  goog.base(this, e2e.signer.Algorithm.DSA, opt_key);
};
goog.inherits(e2e.signer.Dsa, e2e.AlgorithmImpl);


/**
 * List of Hash algorithms that are allowed to be used for DSA for a given q
 * bitlength. See {@link https://tools.ietf.org/html/rfc4880#section-13.6}.
 * @type {!Object<number,!Array<!e2e.hash.Algorithm>>}
 * @private
 */
e2e.signer.Dsa.ALLOWED_HASHES_ = {
  160: [
    e2e.hash.Algorithm.SHA1,
    e2e.hash.Algorithm.SHA224,
    e2e.hash.Algorithm.SHA256,
    e2e.hash.Algorithm.SHA384,
    e2e.hash.Algorithm.SHA512
  ],
  224: [
    e2e.hash.Algorithm.SHA224,
    e2e.hash.Algorithm.SHA256,
    e2e.hash.Algorithm.SHA384,
    e2e.hash.Algorithm.SHA512
  ],
  256: [
    e2e.hash.Algorithm.SHA256,
    e2e.hash.Algorithm.SHA384,
    e2e.hash.Algorithm.SHA512
  ]
};


/**
 * The prime modulus. This must be a prime number.
 * @private {e2e.BigPrimeNum}
 */
e2e.signer.Dsa.prototype.p_;


/**
 * The prime order of the subgroup. This is a prime divisor of (p - 1).
 * @private {e2e.BigPrimeNum}
 */
e2e.signer.Dsa.prototype.q_;


/**
 * The generator of the subgroup of order q. 1 < g < p.
 * @private {e2e.BigNum}
 */
e2e.signer.Dsa.prototype.g_;


/**
 * The private key. x is a randomly or pseudorandomly generated integer,
 *     such that x is in [1, q - 1].
 * @private {e2e.BigNum}
 */
e2e.signer.Dsa.prototype.x_;


/**
 * The public key, where y = g^x (mod p).
 * @private {e2e.BigNum}
 */
e2e.signer.Dsa.prototype.y_;


/**
 * The hash function that should be used. This is selected based on the bit
 *     lengths p and q.
 * @private {!e2e.hash.Hash}
 */
e2e.signer.Dsa.prototype.hash_;


/** @override */
e2e.signer.Dsa.prototype.getHash = function() {
  return this.hash_;
};


/** @override */
e2e.signer.Dsa.prototype.getHashAlgorithm = function() {
  return this.hash_.algorithm;
};


/** @override */
e2e.signer.Dsa.prototype.setHash = function(hash) {
  var lenQ = this.q_.getBitLength();
  var algorithm = hash.algorithm;
  if (!e2e.signer.Dsa.ALLOWED_HASHES_[lenQ] ||
      !goog.array.contains(e2e.signer.Dsa.ALLOWED_HASHES_[lenQ], algorithm)) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Given hash algorithm is disallowed for this DSA key: ' + algorithm);
  }
  this.hash_ = hash;
};


/**
 * Sets the DSA public key and/or private key.
 * @override
 */
e2e.signer.Dsa.prototype.setKey = function(keyArg, opt_keySize) {
  var key = /** @type {!e2e.signer.key.Dsa} */ (keyArg);
  goog.asserts.assertArray(key['p'], 'The prime modulus should be defined.');
  this.p_ = new e2e.BigPrimeNum(key['p']);
  var lenP = this.p_.getBitLength();
  goog.asserts.assertArray(key['q'], 'The prime order should be defined.');
  this.q_ = new e2e.BigPrimeNum(key['q']);
  var lenQ = this.q_.getBitLength();

  switch (lenP) {
    case 1024:
      if (lenQ != 160) {
        throw new e2e.openpgp.error.InvalidArgumentsError(
            'q must be 160-bit when p is 1024-bit.');
      }
      this.hash_ = e2e.hash.factory.require(
          e2e.hash.Algorithm.SHA1);
      break;
    case 2048:
      if (lenQ == 224) {
        this.hash_ = e2e.hash.factory.require(
            e2e.hash.Algorithm.SHA224);
      } else if (lenQ == 256) {
        this.hash_ = e2e.hash.factory.require(
            e2e.hash.Algorithm.SHA256);
      } else {
        throw new e2e.openpgp.error.InvalidArgumentsError(
            'q must be 224-bit or 256-bit when p is 2048-bit.');
      }
      break;
    case 3072:
      if (lenQ != 256) {
        throw new e2e.openpgp.error.InvalidArgumentsError(
            'q must be 256-bit when p is 3072-bit.');
      }
      this.hash_ = e2e.hash.factory.require(
          e2e.hash.Algorithm.SHA256);
      break;
    default:
      throw new e2e.openpgp.error.UnsupportedError(
          'The bit lengths of p and q are not supported.');
      break;
  }

  var pminus1 = this.p_.subtract(e2e.BigNum.ONE);
  // q should be a divisor of p - 1.
  if (this.q_.mod(pminus1).isEqual(
      e2e.BigNum.ZERO)) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'q must be a divisor of p - 1.');
  }

  goog.asserts.assertArray(key['g'], 'The generator should be defined.');
  this.g_ = new e2e.BigNum(key['g']);
  // 1 < g < p and g^q (mod p) == 1.
  if (!this.g_.isBetween(e2e.BigNum.ONE, this.p_) ||
      !this.p_.modPower(this.g_, key['q']).isEqual(e2e.BigNum.ONE)) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Invalid generator.');
  }

  if (!goog.isDefAndNotNull(key['x']) &&
      !goog.isDefAndNotNull(key['y'])) {
    goog.asserts.fail('Either public key or private key should be defined.');
  }

  if (goog.isDefAndNotNull(key['x'])) {
    this.x_ = new e2e.BigNum(key['x']);
    if (!this.x_.isBetween(e2e.BigNum.ZERO, this.q_)) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'x must be in range (0, q).');
    }
  }

  if (goog.isDefAndNotNull(key['y'])) {
    this.y_ = new e2e.BigNum(key['y']);
    // NIST SP 800-89 checks for DSA.
    // 1 < y < p-1
    if (!this.y_.isBetween(e2e.BigNum.ONE, pminus1)) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'y must be in the range(1, p-1).');
    }
    // y^q = 1 (mod p).
    if (!this.p_.modPower(this.y_, this.q_).isEqual(e2e.BigNum.ONE)) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Invalid public key.');
    }
    if (goog.isDefAndNotNull(key['x'])) {
      // y == g^x (mod p).
      if (!this.p_.modPower(this.g_, key['x']).isEqual(this.y_)) {
        throw new e2e.openpgp.error.InvalidArgumentsError(
            'Invalid public key.');
      }
    }
  }

  // Save key material to serialize later the key.
  goog.base(this, 'setKey', key);
};


/** @inheritDoc */
e2e.signer.Dsa.prototype.sign = function(m) {
  /** @type {!e2e.signer.signature.Signature} */
  var sig;
  do {
    var k = this.generatePerMessageSecret_();
    sig = this.signWithNonce_(m, k);
    var r = new e2e.BigNum(sig['r']);
    var s = new e2e.BigNum(sig['s']);
  } while (r.isEqual(e2e.BigNum.ZERO) ||
           s.isEqual(e2e.BigNum.ZERO));
  return e2e.async.Result.toResult(sig);
};


/**
 * Exports the sign function for testing.
 * @param {!e2e.ByteArray} m The message to be signed.
 * @param {!e2e.BigNum} k The per-message secret.
 * @return {!e2e.async.Result.<!e2e.signer.signature.Signature>} The result of
 *     signing.
 */
e2e.signer.Dsa.prototype.signForTestingOnly = function(m, k) {
  return e2e.async.Result.toResult(this.signWithNonce_(m, k));
};


/** @inheritDoc */
e2e.signer.Dsa.prototype.verify = function(m, sig) {
  goog.asserts.assertObject(this.p_, 'The prime modulus should be defined.');
  goog.asserts.assertObject(this.q_, 'The prime order should be defined.');
  goog.asserts.assertObject(this.g_, 'The order should be defined.');
  goog.asserts.assertObject(this.y_, 'The public key should be defined.');

  var r = new e2e.BigNum(sig['r']);
  var s = new e2e.BigNum(sig['s']);
  if (!r.isBetween(e2e.BigNum.ZERO, this.q_) ||
      !s.isBetween(e2e.BigNum.ZERO, this.q_)) {
    return e2e.async.Result.toResult(false);
  }

  var w = this.q_.modInverse(s);
  var z = new e2e.BigNum(this.hashWithTruncation_(m));
  var u1 = this.q_.modMultiply(z.mod(this.q_), w);  // z may be >= q_
  var u2 = this.q_.modMultiply(r, w);
  var v = this.p_.modMultiply(this.p_.modPower(this.g_, u1),
      this.p_.modPower(this.y_, u2)).mod(this.q_);
  return e2e.async.Result.toResult(v.isEqual(r));
};


/**
 * Generates the DSA signature using the provided per-message secret.
 * @param {!e2e.ByteArray} m The message to be signed.
 * @param {!e2e.BigNum} k The per-message secret.
 * @return {!e2e.signer.signature.Signature}
 * @private
 */
e2e.signer.Dsa.prototype.signWithNonce_ = function(m, k) {
  goog.asserts.assertObject(this.p_, 'The prime modulus should be defined.');
  goog.asserts.assertObject(this.q_, 'The prime order should be defined.');
  goog.asserts.assertObject(this.g_, 'The order should be defined.');
  goog.asserts.assertObject(this.x_, 'The private key should be defined.');

  // Sanity check on the per-message nonce that it's in [1, q-1].
  if (!k.isBetween(e2e.BigNum.ZERO, this.q_)) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Failed to sign message: invalid per-message nonce.');
  }
  // r = (g^k mod p) mod q.
  var r = this.p_.modPower(this.g_, k).mod(this.q_);
  var hashValue = this.hashWithTruncation_(m);
  var z = new e2e.BigNum(hashValue);
  // s = (k^{-1} (z + xr)) mod q.
  var tmp = z.add(this.q_.modMultiply(this.x_, r)).mod(this.q_);
  var s = this.q_.modMultiply(this.q_.modInverse(k), tmp);
  return {
    'r': r.toByteArray(),
    's': s.toByteArray(),
    'hashValue': hashValue
  };
};


/**
 * Generates a random number used as the per-message secret in DSA.
 * @return {!e2e.BigNum}
 * @private
 */
e2e.signer.Dsa.prototype.generatePerMessageSecret_ = function() {
  goog.asserts.assertObject(this.q_,
      'Cannot generate random per-message secret: q should be defined.');

  // 64 more bits are requested from the PRNG than are needed for this nonce
  // to avoid bias in the modular reduction in the last step of this function.
  // Otherwise this might leak a fraction of a bit of the nonce, and that's
  // enough for Bleichenbacher to steal the private key.
  var nonceLength = Math.ceil((this.q_.getBitLength() + 64) / 8);
  // OpenPGP supports only 3 key sizes in bits: 160, 224 and 256, so double
  // check nonce length to ensure enough entropy shall be requested from the
  // PRNG.
  if (nonceLength != 28 /* 160-bit q */ &&
      nonceLength != 36 /* 224-bit q */ &&
      nonceLength != 40 /* 256-bit q */) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Cannot generate random nonce: invalid nonce length.');
  }
  var nonce = new e2e.BigNum(
      e2e.random.getRandomBytes(nonceLength));
  // nonce is [1, q - 1].
  return nonce.mod(this.q_.subtract(e2e.BigNum.ONE)).add(
      e2e.BigNum.ONE);
};


/**
 * Creates a message digest, truncating it to the bit-length of the prime order.
 * @param {!e2e.ByteArray} message The message to hash.
 * @return {!Array.<number>} The digest.
 * @private
*/
e2e.signer.Dsa.prototype.hashWithTruncation_ = function(message) {
  var hash = this.hash_.hash(message);

  var requiredLength = Math.ceil(this.q_.getBitLength() / 8);

  if (requiredLength > hash.length) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Digest algorithm is too short for given DSA parameters.');
  }

  return goog.array.slice(hash, 0, requiredLength);
};

e2e.signer.factory.add(e2e.signer.Dsa, e2e.signer.Algorithm.DSA);
