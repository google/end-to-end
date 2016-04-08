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
 *
 * @fileoverview Public domain parameters for prime curves.
 * @author thaidn@google.com (Thai Duong)
 */

goog.provide('e2e.ecc.DomainParam');
goog.provide('e2e.ecc.PrimeCurve');
goog.provide('e2e.ecc.PrimeCurveOid');

goog.require('e2e.BigNum');
goog.require('e2e.BigPrimeNum');
goog.require('e2e.FastModulus');
goog.require('e2e.ecc.constant');
goog.require('e2e.ecc.constant.ed_25519.G_FAST_MULTIPLY_TABLE');
goog.require('e2e.ecc.constant.p_256.G_FAST_MULTIPLY_TABLE');
goog.require('e2e.ecc.constant.p_384.G_FAST_MULTIPLY_TABLE');
goog.require('e2e.ecc.constant.p_521.G_FAST_MULTIPLY_TABLE');
goog.require('e2e.ecc.curve.Curve25519');
goog.require('e2e.ecc.curve.Ed25519');
goog.require('e2e.ecc.curve.Nist');
goog.require('e2e.ecc.fastModulus.Curve25519');
goog.require('e2e.ecc.fastModulus.Nist');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.error.UnsupportedError');
goog.require('e2e.hash.Sha512');
goog.require('e2e.random');
goog.require('goog.array');
goog.require('goog.asserts');


/**
 * Prime curves.
 * @enum {string}
 */
e2e.ecc.PrimeCurve = {
  'P_256': 'P_256',
  'P_384': 'P_384',
  'P_521': 'P_521',
  'CURVE_25519': 'CURVE_25519',
  'ED_25519': 'ED_25519'
};


/**
 * Prime curve OIDs (including the one-byte length prefix), as defined in
 *     section 11 in RFC 6637.
 *     Curve25519 and Ed25519 OIDs sourced from GnuPG.
 * @enum {!e2e.ByteArray}.
 */
e2e.ecc.PrimeCurveOid = {
  // First byte is the length of what comes next.
  'P_256': [0x08, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07],
  'P_384': [0x05, 0x2B, 0x81, 0x04, 0x00, 0x22],
  'P_521': [0x05, 0x2B, 0x81, 0x04, 0x00, 0x23],
  'CURVE_25519': [0x0A, 0x2B, 0x06, 0x01, 0x04,
                  0x01, 0x97, 0x55, 0x01, 0x05, 0x01],
  'ED_25519': [0x09, 0x2B, 0x06, 0x01, 0x04, 0x01, 0xDA, 0x47, 0x0F, 0x01]
};



/**
 * Representation of domain parameters for prime curves.
 * @param {!e2e.ecc.curve.Curve} curve The elliptic curve.
 * @param {!e2e.ecc.point.Point} g The base point.
 * @param {!e2e.BigPrimeNum} n The order of the base point.
 * @constructor
 */
e2e.ecc.DomainParam = function(curve, g, n) {
  this.curve = curve;
  this.g = g;
  this.n = n;
  goog.asserts.assert(g);
  // Expensive sanity check.  Documentation claims that asserts are
  // elided if code is compiled.  But this is such an expensive
  // test that we're being paranoid.
  goog.asserts.assert(!goog.asserts.ENABLE_ASSERTS ||
      g.multiply(n).isIdentity());
};


/**
 * Gets curve's name from curve's OID.
 * @param {e2e.ecc.PrimeCurveOid} curveOid Curve's OID (including
 *     the one-byte length prefix), as defined in section 11 in RFC 6637.
 * @return {e2e.ecc.PrimeCurve}
 */
e2e.ecc.DomainParam.curveNameFromCurveOid = function(curveOid) {
  if (goog.array.equals(curveOid, e2e.ecc.PrimeCurveOid.P_256)) {
    return e2e.ecc.PrimeCurve.P_256;
  } else if (goog.array.equals(curveOid, e2e.ecc.PrimeCurveOid.P_384)) {
    return e2e.ecc.PrimeCurve.P_384;
  } else if (goog.array.equals(curveOid, e2e.ecc.PrimeCurveOid.P_521)) {
    return e2e.ecc.PrimeCurve.P_521;
  } else if (goog.array.equals(curveOid, e2e.ecc.PrimeCurveOid.CURVE_25519)) {
    return e2e.ecc.PrimeCurve.CURVE_25519;
  } else if (goog.array.equals(curveOid, e2e.ecc.PrimeCurveOid.ED_25519)) {
    return e2e.ecc.PrimeCurve.ED_25519;
  }

  throw new e2e.error.UnsupportedError('Invalid curve OID');
};


/**
 * Gets curve OID from curve's name.
 * @param {e2e.ecc.PrimeCurve} curveName The name of the curve.
 * @return {?e2e.ecc.PrimeCurveOid}
 */
e2e.ecc.DomainParam.curveOidFromCurveName = function(curveName) {
  if (curveName == e2e.ecc.PrimeCurve.P_256) {
    return e2e.ecc.PrimeCurveOid.P_256;
  } else if (curveName == e2e.ecc.PrimeCurve.P_384) {
    return e2e.ecc.PrimeCurveOid.P_384;
  } else if (curveName == e2e.ecc.PrimeCurve.P_521) {
    return e2e.ecc.PrimeCurveOid.P_521;
  } else if (curveName == e2e.ecc.PrimeCurve.CURVE_25519) {
    return e2e.ecc.PrimeCurveOid.CURVE_25519;
  } else if (curveName == e2e.ecc.PrimeCurve.ED_25519) {
    return e2e.ecc.PrimeCurveOid.ED_25519;
  }
  return null;
};


/**
 * The curve.
 * @type {!e2e.ecc.curve.Curve}
 */
e2e.ecc.DomainParam.prototype.curve;


/**
 * The base point.
 * @type {!e2e.ecc.point.Point}
 */
e2e.ecc.DomainParam.prototype.g;


/**
 * The order of the base point.
 * @type {!e2e.BigPrimeNum}
 */
e2e.ecc.DomainParam.prototype.n;


/**
 * Obtains the set of domain parameters for a particular curve.
 * @param {!e2e.ecc.PrimeCurve} curveName The curve to retrieve.
 * @return {!e2e.ecc.DomainParam}
 */
e2e.ecc.DomainParam.fromCurve = function(curveName) {
  if (curveName in e2e.ecc.DomainParam) {
    // already generated this curve.
    return e2e.ecc.DomainParam[curveName];
  }
  var result;
  switch (curveName) {
    case e2e.ecc.PrimeCurve.P_256:
    case e2e.ecc.PrimeCurve.P_384:
    case e2e.ecc.PrimeCurve.P_521:
      result = e2e.ecc.DomainParam.NIST.fromCurve(curveName);
      break;
    case e2e.ecc.PrimeCurve.CURVE_25519:
      result = e2e.ecc.DomainParam.Curve25519.fromCurve(curveName);
      break;
    case e2e.ecc.PrimeCurve.ED_25519:
      result = e2e.ecc.DomainParam.Ed25519.fromCurve(curveName);
      break;
    default:
      throw new e2e.error.UnsupportedError(
          'Curve is not known or not supported');
  }
  e2e.ecc.DomainParam[curveName] = result;
  return result;
};


/**
 * @type {Object<!e2e.ecc.PrimeCurve, {
 *  data: !Array.<!Array.<Array.<!Array.<!number>>>>,
 *  isConverted: boolean,
 *  isAffine: boolean,
 * }>}
 */
e2e.ecc.DomainParam.fastMultiplyTable = {};

e2e.ecc.DomainParam.fastMultiplyTable[e2e.ecc.PrimeCurve.P_256] = {
  data: e2e.ecc.constant.p_256.G_FAST_MULTIPLY_TABLE,
  isConverted: false,
  isAffine: false
};
e2e.ecc.DomainParam.fastMultiplyTable[e2e.ecc.PrimeCurve.P_384] = {
  data: e2e.ecc.constant.p_384.G_FAST_MULTIPLY_TABLE,
  isConverted: false,
  isAffine: false
};
e2e.ecc.DomainParam.fastMultiplyTable[e2e.ecc.PrimeCurve.P_521] = {
  data: e2e.ecc.constant.p_521.G_FAST_MULTIPLY_TABLE,
  isConverted: false,
  isAffine: false
};
e2e.ecc.DomainParam.fastMultiplyTable[e2e.ecc.PrimeCurve.ED_25519] = {
  data: e2e.ecc.constant.ed_25519.G_FAST_MULTIPLY_TABLE,
  isConverted: false,
  isAffine: false
};


/**
 * @typedef {?{privateKey: !e2e.ByteArray,
 *             publicKey: !e2e.ByteArray,
 *             privateKeyBigNum: ?e2e.BigNum,
 *             publicKeyPoint: !e2e.ecc.point.Point}}
 */
e2e.ecc.DomainParam.KeyPair;


/**
 * Generates a key pair used in ECC protocols.
 * @param {!e2e.ByteArray=} opt_privateKey  An optional already known
 *     private key.  If not given, a random key will be created.
 * @return {!e2e.ecc.DomainParam.KeyPair}
 */
e2e.ecc.DomainParam.prototype.generateKeyPair = goog.abstractMethod;


/**
 * Calculates the shared secret.
 * This code assumes that the public key has already been vetted and known
 * to be a reasonable public key.
 *
 * @param {!e2e.ecc.point.Point} peerPublicKey The peer's public key.
 * @param {!e2e.BigNum} myPrivateKey My private key.
 * @return {!e2e.ByteArray}
 */
e2e.ecc.DomainParam.prototype.calculateSharedSecret =
    goog.abstractMethod;


/**
 * Returns the BigNum corresponding to a byte array representing a secret key
 * @param {!e2e.ByteArray} p The byte array represent the private key
 * @return {!e2e.BigNum}
 */
e2e.ecc.DomainParam.prototype.bigNumFromPrivateKey =
    goog.abstractMethod;



/**
 * Representation of domain parameters for NIST prime curves.
 * @constructor
 * @extends {e2e.ecc.DomainParam}
 * @param {!e2e.ecc.curve.Curve} curve The elliptic curve.
 * @param {!e2e.ecc.point.Point} g The base point.
 * @param {!e2e.BigPrimeNum} n The order of the base point.
 */
e2e.ecc.DomainParam.NIST = function(curve, g, n) {
  e2e.ecc.DomainParam.NIST.base(this, 'constructor', curve, g, n);
};
goog.inherits(e2e.ecc.DomainParam.NIST, e2e.ecc.DomainParam);


/**
 * Representation of domain parameters for NIST prime curves.  These values
 * are defined in
 *    http://csrc.nist.gov/groups/ST/toolkit/documents/dss/NISTReCur.pdf
 * @param {!e2e.ecc.PrimeCurve} curveName The domain params to retrieve.
 * @return {!e2e.ecc.DomainParam.NIST}
 */
e2e.ecc.DomainParam.NIST.fromCurve = function(curveName) {
  var constants, fastModulus;
  var fastMultiplyTable = e2e.ecc.DomainParam.fastMultiplyTable[curveName];
  if (curveName == e2e.ecc.PrimeCurve.P_256) {
    constants = e2e.ecc.constant.P_256;
    fastModulus = e2e.ecc.fastModulus.Nist.P_256;
  } else if (curveName == e2e.ecc.PrimeCurve.P_384) {
    constants = e2e.ecc.constant.P_384;
    fastModulus = e2e.ecc.fastModulus.Nist.P_384;
  } else if (curveName == e2e.ecc.PrimeCurve.P_521) {
    constants = e2e.ecc.constant.P_521;
  } else {
    throw new e2e.error.InvalidArgumentsError('Unknown curve.');
  }
  var q = new e2e.BigPrimeNum(constants.Q);  // prime field
  var b = new e2e.BigPrimeNum(constants.B);  // parameter of curve
  if (fastModulus) {
    q.setFastModulusType(fastModulus);
  }
  var curve = new e2e.ecc.curve.Nist(q, b);

  var g =/**@type{!e2e.ecc.point.Nist}*/(curve.pointFromByteArray(constants.G));
  if (fastMultiplyTable) {
    g.setFastMultiplyTable(fastMultiplyTable);
  }
  var n = new e2e.BigPrimeNum(constants.N);  // order of group
  n.setFastModulusType(e2e.FastModulus.FFFFFF);
  return new e2e.ecc.DomainParam.NIST(curve, g, n);
};


/**
 * Generates a random private key in the range [1, N-1] as described
 * in section B.4.2 of FIPS-186-4.
 *
 * @override
 */
e2e.ecc.DomainParam.NIST.prototype.generateKeyPair = function(
    opt_privateKey) {
  var privateKey;
  var expectedKeyLength = Math.ceil(this.curve.keySizeInBits() / 8);
  var count = 0;
  do {
    if (goog.isDefAndNotNull(opt_privateKey)) {
      if (count++ != 0) {
        throw new e2e.error.InvalidArgumentsError(
            'Bad private key');
      }
      goog.asserts.assert(opt_privateKey.length == expectedKeyLength,
          'Private key length must be ' + expectedKeyLength + ' bytes');
      privateKey = opt_privateKey;
    } else {
      privateKey = e2e.random.getRandomBytes(expectedKeyLength);
      // remove extra bits (if any) in the high-order byte
      privateKey[0] >>= (8 * expectedKeyLength - this.curve.keySizeInBits());
    }
    var multiplier = new e2e.BigNum(privateKey);
  } while (multiplier.isEqual(e2e.BigNum.ZERO) ||
           multiplier.compare(this.n) >= 0);
  var publicKey = this.g.multiply(multiplier);
  return {
    'privateKey': privateKey,
    'publicKey': publicKey.toByteArray(),
    'privateKeyBigNum': multiplier,
    'publicKeyPoint': publicKey
  };
};


/** @override */
e2e.ecc.DomainParam.NIST.prototype.calculateSharedSecret = function(
    peerPublicKey, myPrivateKey) {
  var S = /**@type{!e2e.ecc.point.Nist}*/(peerPublicKey.multiply(myPrivateKey));
  if (S.isInfinity()) {
    throw new e2e.error.InvalidArgumentsError(
        'ECDH: Cannot derive shared secret.');
  }
  var Xbytes = S.getX().toBigNum().toByteArray();
  var fieldSize = Math.ceil(this.curve.keySizeInBits() / 8);
  // Pads X if needed.
  while (Xbytes.length < fieldSize) {
    goog.array.insertAt(Xbytes, 0x00, 0);
  }
  return Xbytes;
};


/** @override */
e2e.ecc.DomainParam.NIST.prototype.bigNumFromPrivateKey = function(p) {
  return new e2e.BigNum(p);
};



/**
 * Representation of domain parameters for Curve25519 prime curves.
 * @constructor
 * @extends {e2e.ecc.DomainParam}
 * @param {!e2e.ecc.curve.Curve} curve The elliptic curve.
 * @param {!e2e.ecc.point.Point} g The base point.
 * @param {!e2e.BigPrimeNum} n The order of the base point.
 */
e2e.ecc.DomainParam.Curve25519 = function(curve, g, n) {
  e2e.ecc.DomainParam.Curve25519.base(this, 'constructor', curve, g, n);
};
goog.inherits(e2e.ecc.DomainParam.Curve25519,
    e2e.ecc.DomainParam);


/**
 * Representation of domain parameters for Curve25519 prime curves.
 * @param {!e2e.ecc.PrimeCurve} curveName The domain params to retrieve.
 * @return {!e2e.ecc.DomainParam.Curve25519}
 */
e2e.ecc.DomainParam.Curve25519.fromCurve = function(curveName) {
  goog.asserts.assert(curveName == e2e.ecc.PrimeCurve.CURVE_25519);
  var constants = e2e.ecc.constant.CURVE_25519;

  var q = new e2e.BigPrimeNum(constants.Q);  // prime field
  q.setFastModulus(new e2e.ecc.fastModulus.Curve25519(q));
  var curve = new e2e.ecc.curve.Curve25519(q);

  var g = curve.POINT_AT_NINE;
  var n = new e2e.BigPrimeNum(constants.N);  // order of group
  n.setFastModulusType(e2e.FastModulus.Ox1000000);
  return new e2e.ecc.DomainParam.Curve25519(curve, g, n);
};


/** @override */
e2e.ecc.DomainParam.Curve25519.prototype.generateKeyPair = function(
    opt_privateKey) {
  // A private key is any sequence of 32 bytes
  var privateKey;
  if (goog.isDefAndNotNull(opt_privateKey)) {
    goog.asserts.assert(opt_privateKey.length == 32,
        'Private key length must be 32 bytes');
    privateKey = opt_privateKey;
  } else {
    privateKey = e2e.random.getRandomBytes(32);
  }
  // Clamp a copy of the private key
  var p = privateKey.slice();
  p[0] &= ~7;  // Must be a multiple of 8
  p[31] = (p[31] & 63) | 64;  // high bit clear, next higher bit set.
  // Use that clamped private key as a little-endian bignum, and scalar
  // multiply the base.
  var multiplier = new e2e.BigNum(p.reverse());
  var publicKey = this.g.multiply(multiplier);
  return {
    'privateKey': privateKey,
    'publicKey': publicKey.toByteArray(),
    'privateKeyBigNum': multiplier,
    'publicKeyPoint': publicKey
  };
};


/** @override */
e2e.ecc.DomainParam.Curve25519.prototype.calculateSharedSecret =
    function(peerPublicKey, myPrivateKey) {
  var p = myPrivateKey.toByteArray().reverse();
  p[0] &= ~7;  // Must be a multiple of 8
  p[31] = (p[31] & 63) | 64;  // high bit clear, next higher bit set.

  var S = peerPublicKey.multiply(new e2e.BigNum(p.reverse()));
  return S.toByteArray();
};


/** @override */
e2e.ecc.DomainParam.Curve25519.prototype.bigNumFromPrivateKey =
    function(p) {
  return new e2e.BigNum(p.slice().reverse());
};



/**
 * Representation of domain parameters for Ed5519 prime curves.
 * @constructor
 * @extends {e2e.ecc.DomainParam}
 * @param {!e2e.ecc.curve.Curve} curve The elliptic curve.
 * @param {!e2e.ecc.point.Point} g The base point.
 * @param {!e2e.BigPrimeNum} n The order of the base point.
 */
e2e.ecc.DomainParam.Ed25519 = function(curve, g, n) {
  e2e.ecc.DomainParam.Ed25519.base(this, 'constructor', curve, g, n);
};
goog.inherits(e2e.ecc.DomainParam.Ed25519, e2e.ecc.DomainParam);


/**
 * Representation of domain parameters for Ed5519 prime curves.
 * @param {!e2e.ecc.PrimeCurve} curveName The domain params to retrieve.
 * @return {!e2e.ecc.DomainParam.Ed25519}
 */
e2e.ecc.DomainParam.Ed25519.fromCurve = function(curveName) {
  goog.asserts.assert(curveName == e2e.ecc.PrimeCurve.ED_25519);
  var constants = e2e.ecc.constant.CURVE_25519;

  var q = new e2e.BigPrimeNum(constants.Q);  // prime field
  q.setFastModulus(new e2e.ecc.fastModulus.Curve25519(q));
  var curve = new e2e.ecc.curve.Ed25519(q);

  var g = /** @type {!e2e.ecc.point.Ed25519} */ (curve.B);
  g.setFastMultiplyTable(e2e.ecc.DomainParam.fastMultiplyTable[curveName]);
  var n = new e2e.BigPrimeNum(constants.N);  // order of group
  n.setFastModulusType(e2e.FastModulus.Ox1000000);
  return new e2e.ecc.DomainParam.Ed25519(curve, g, n);
};


/** @override */
e2e.ecc.DomainParam.Ed25519.prototype.generateKeyPair = function(
    opt_privateKey) {
  var privateKey;
  if (goog.isDefAndNotNull(opt_privateKey)) {
    goog.asserts.assert(opt_privateKey.length == 32,
        'Private key length must be 32 bytes');
    privateKey = opt_privateKey;
  } else {
    privateKey = e2e.random.getRandomBytes(32);
  }
  var hash = new e2e.hash.Sha512();
  var expandedKey = this.expandPrivateKey(hash, privateKey);
  var a = expandedKey.multiplier;
  var publicKey = this.g.multiply(a);
  return {
    'privateKey': privateKey,
    'privateKeyBigNum': null,
    'publicKey': publicKey.toByteArray(),
    'publicKeyPoint': publicKey
  };
};


/** @override */
e2e.ecc.DomainParam.Ed25519.prototype.calculateSharedSecret = function(
    peerPublicKey, myPrivateKey) {
  throw new e2e.error.InvalidArgumentsError(
      'ECDH: Cannot derive shared secret.');
};


/** @override */
e2e.ecc.DomainParam.Ed25519.prototype.bigNumFromPrivateKey =
    function(p) {
  return new e2e.BigNum(p.slice().reverse());
};


/**
 * Expands a 32-byte protokey into a 64 byte EdDSA private key.
 *
 * p = bytes[0:32] are used as a private scalar; p*B = the public key
 *
 * Several bits are clamped to zero or one in order to clear the cofactor
 * of 8 (equivalently, clear the torsion), and to make it more difficult
 * to implement scalar multiplication incorrectly.
 *
 * k = bytes[32:64] is used as the key input to the nonce-derivation PRF.
 *
 * @param {!e2e.hash.Hash} hash The hash function.
 * @param {!e2e.ByteArray} privateKey  The private (proto-)key.
 * @return {{multiplier: !e2e.BigNum, extra: !e2e.ByteArray}}
 */
e2e.ecc.DomainParam.Ed25519.prototype.expandPrivateKey = function(hash,
    privateKey) {
  var digest = hash.hash(privateKey);
  goog.asserts.assert(digest.length == 64, 'Digest length must be 64 bytes');

  // Clamp the low 32 bytes of the expanded private key to use as a multiplier
  var bytes = digest.slice(0, 32);
  bytes[0] &= ~7;
  bytes[31] = (bytes[31] & 63) | 64;
  var a = this.bigNumFromPrivateKey(bytes);

  return {
    multiplier: a,
    extra: digest.slice(32)
  };
};
