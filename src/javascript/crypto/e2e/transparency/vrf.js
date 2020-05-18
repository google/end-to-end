/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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
 * @fileoverview File containing functions to verify VRF proofs from Key
 *     Transparency.
 */

goog.provide('e2e.transparency.vrf');

goog.require('e2e');
goog.require('e2e.ecc.DomainParam');
goog.require('e2e.ecc.PrimeCurve');
goog.require('e2e.ecc.curve.Curve');
goog.require('e2e.ecc.point.Point');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('goog.crypt.Sha512');

/**
 * The VRF for Key Transparency uses the NIST P-256 curve.
 *
 * @private
 * @const {!e2e.ecc.DomainParam}
 */
e2e.transparency.vrf.CURVE_PARAMS_ =
    e2e.ecc.DomainParam.fromCurve(e2e.ecc.PrimeCurve.P_256);

/**
 * Curve object for NIST P-256.
 *
 * @private
 * @const {!e2e.ecc.curve.Curve}
 */
e2e.transparency.vrf.CURVE_ = e2e.transparency.vrf.CURVE_PARAMS_.curve;

/**
 * Required length, in bytes, of a valid VRF proof.
 *
 * @private
 * @const {number}
 */
e2e.transparency.vrf.VRF_PROOF_LENGTH_ = 64 + 65;

/**
 * Verifies a VRF proof for a message.
 *
 * @see {@link
 * https://github.com/google/keytransparency/blob/master/core/crypto/vrf/p256/p256.go#L160}
 *
 * @param {!e2e.ByteArray} message Message claimed for the proof.
 * @param {!e2e.ByteArray} proof Proof to be verified.
 * @param {!e2e.ecc.point.Nist} pubKey Public key of the entity providing the
 *     proof, as a point on P-256.
 * @return {boolean} True if the proof can be verified for the given message,
 *     and false otherwise.
 */
e2e.transparency.vrf.verify = function(message, proof, pubKey) {
  if (proof.length != e2e.transparency.vrf.VRF_PROOF_LENGTH_) {
    return false;
  }
  const s = new e2e.BigNum(proof.slice(0, 32));
  const t = new e2e.BigNum(proof.slice(32, 64));
  const vrf = proof.slice(64, 64 + 65);
  let /** @type {!e2e.ecc.point.Point} */ kH;
  try {
    kH = e2e.transparency.vrf.CURVE_.pointFromByteArray(vrf);
  } catch (err) {
    // Could not interpret proof[64:64+65] as a point on P-256.
    return false;
  }

  const tG = e2e.transparency.vrf.CURVE_PARAMS_.g.multiply(t);
  const ksG = pubKey.multiply(s);
  const tksG = tG.add(ksG);  // (t+ks)G

  const h = e2e.transparency.vrf.hashToCurvePoint(message);
  const tH = h.multiply(t);
  const ksH = kH.multiply(s);
  const tksH = tH.add(ksH);  // (t+ks)H

  const /** @type {!e2e.ByteArray} */ buf =
      new Array(0)
          .concat(e2e.transparency.vrf.CURVE_PARAMS_.g.toByteArray())
          .concat(h.toByteArray())
          .concat(pubKey.toByteArray())
          .concat(vrf)
          .concat(tksG.toByteArray())
          .concat(tksH.toByteArray());

  const expectedProof = e2e.transparency.vrf.hashToBigNum(buf).toByteArray();
  // Left-pad with zeroes to a fixed length of 32.
  while (expectedProof.length < 32) {
    expectedProof.unshift(0x00);
  }
  return e2e.compareByteArray(expectedProof, s.toByteArray());
};

/**
 * Hashes data to a point on the P-256 curve.  (This is the function called "H1"
 * in the Key Transparency reference implementation.)
 *
 * @see {@link
 * https://github.com/google/keytransparency/blob/master/core/crypto/vrf/p256/p256.go}
 *
 * @param {!e2e.ByteArray} message Message to hash.
 * @return {!e2e.ecc.point.Point} Point on the P-256 curve.
 * @throws {!e2e.error.InvalidArgumentsError} If the value cannot be hashed.
 */
e2e.transparency.vrf.hashToCurvePoint = function(message) {
  var h = new goog.crypt.Sha512();
  var byteLen = Math.ceil(e2e.transparency.vrf.CURVE_.keySizeInBits() / 8);
  for (var i = 0; i < 100; i++) {
    h.reset();
    // Hack: use dwordArrayToByteArray([x]) instead of numberToByteArray(x) to
    // ensure that the result is 4 bytes long.
    h.update(e2e.dwordArrayToByteArray([i]));
    h.update(message);
    var digest = h.digest();
    // Prepend 0x02 so pointFromByteArray treats this as a compressed point.
    digest.unshift(0x02);
    try {
      return e2e.transparency.vrf.CURVE_.pointFromByteArray(
          digest.slice(0, byteLen + 1));
    } catch (err) {
      // We couldn't deserialize the message as a curve point, so we iterate and
      // try again.
    }
  }
  throw new e2e.error.InvalidArgumentsError('cannot hash to point on curve');
};

/**
 * Hashes data to a big integer in the range [1, N-1], where N is the order of
 * the base point of the P-256 curve.  This is the function called "H2" in the
 * Go implementation.
 *
 * @see NIST Special Publication 800-90A Rev 1 section A.5.1
 * @see {@link
 * https://github.com/google/keytransparency/blob/master/core/crypto/vrf/p256/p256.go}
 *
 * @param {!e2e.ByteArray} message Message to hash.
 * @return {!e2e.BigNum} Integer between 1 and N-1.
 */
e2e.transparency.vrf.hashToBigNum = function(message) {
  var h = new goog.crypt.Sha512();
  var byteLen = Math.ceil(e2e.transparency.vrf.CURVE_.keySizeInBits() / 8);
  for (var i = 0;; i++) {
    h.reset();
    h.update(e2e.dwordArrayToByteArray([i]));
    h.update(message);
    var k = new e2e.BigNum(h.digest().slice(0, byteLen));
    // We need numbers in the range [1, n-1], so we check that k < (n - 1) and
    // then return k + 1.  (BigNums are always non-negative.)
    if (k.isLess(
            e2e.transparency.vrf.CURVE_PARAMS_.n.subtract(e2e.BigNum.ONE))) {
      return k.add(e2e.BigNum.ONE);
    }
  }
};
