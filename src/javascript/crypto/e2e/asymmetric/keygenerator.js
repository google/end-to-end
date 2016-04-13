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
 * @fileoverview Key generator. End-To-End supports generating only ECC keys.
 */

goog.provide('e2e.asymmetric.keygenerator');

goog.require('e2e.BigNum');
goog.require('e2e.BigPrimeNum');
goog.require('e2e.algorithm.KeyLocations');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.Ecdh');
goog.require('e2e.ecc.Element');
goog.require('e2e.ecc.PrimeCurve');
goog.require('e2e.ecc.PrimeCurveOid');
goog.require('e2e.ecc.Protocol');
goog.require('e2e.ecc.constant');
goog.require('e2e.ecc.curve.Nist');
goog.require('e2e.ecc.point.Nist');
goog.require('e2e.error.UnsupportedError');
goog.require('e2e.hash.Algorithm');
goog.require('e2e.openpgp.constants');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.Ecdsa');
goog.require('goog.asserts');
goog.require('goog.crypt.base64');
goog.require('goog.string');


/**
 * Generates a key pair on the default curve and uses it to construct
 * an ECDSA object.
 * @param {!e2e.ByteArray=} opt_privateKey  An optional already known
 *     private key. If not given, a random key will be created.
 * @return {!e2e.signer.Ecdsa}
 */
e2e.asymmetric.keygenerator.newEcdsaWithP256 = function(
    opt_privateKey) {
  var key = e2e.ecc.Protocol.generateKeyPair(
      e2e.ecc.PrimeCurve.P_256, opt_privateKey);
  return new e2e.signer.Ecdsa(e2e.signer.Algorithm.ECDSA, key);
};


/**
 * Generates a key pair on the default curve and uses it to construct
 * an ECDH object.
 * @param {!e2e.ByteArray=} opt_privateKey  An optional already known
 *     private key. If not given, a random key will be created.
 * @return {!e2e.cipher.Ecdh}
 */
e2e.asymmetric.keygenerator.newEcdhWithP256 = function(
    opt_privateKey) {
  var key = e2e.ecc.Protocol.generateKeyPair(
      e2e.ecc.PrimeCurve.P_256, opt_privateKey);
  key['kdfInfo'] = [
    0x3, 0x1, 0x8 /* SHA256 Algo ID*/, 0x7 /* AES-128 Algo ID */];
  return new e2e.cipher.Ecdh(e2e.cipher.Algorithm.ECDH, key);
};


/**
 * @return {!e2e.async.Result<!Array<!(e2e.signer.Ecdsa|e2e.cipher.Ecdh)>>}
 */
e2e.asymmetric.keygenerator.newWebCryptoP256Keys = function() {
  if (!('crypto' in goog.global && 'subtle' in goog.global.crypto)) {
    throw new e2e.error.UnsupportedError('No WebCrypto support!');
  }
  var result = new e2e.async.Result;
  Promise.all([
    e2e.asymmetric.keygenerator.populateWebCrypto_(
        new e2e.signer.Ecdsa(e2e.signer.Algorithm.ECDSA),
        {name: 'ECDSA', namedCurve: 'P-256'},
        ['sign', 'verify']
    ),
    e2e.asymmetric.keygenerator.populateWebCrypto_(
        new e2e.cipher.Ecdh(e2e.cipher.Algorithm.ECDH),
        {name: 'ECDH', namedCurve: 'P-256'},
        ['deriveKey', 'deriveBits']
    )
  ]).then(goog.bind(result.callback, result),
      goog.bind(result.errback, result));
  return result;
};


/**
 * @param {!e2e.cipher.Ecdh|!e2e.signer.Ecdsa} algorithm
 * @param {!webCrypto.Algorithm} aid
 * @param {!Array<string>} usages
 * @return {!goog.Thenable<(!e2e.cipher.Ecdh|!e2e.signer.Ecdsa)>}
 * @private
 */
e2e.asymmetric.keygenerator.populateWebCrypto_ = function(algorithm, aid,
    usages) {
  return goog.global.crypto.subtle.generateKey(aid, true, usages)
      .then(function(keyPair) {
        algorithm.setWebCryptoKey(keyPair);
        return goog.global.crypto.subtle.exportKey('jwk', keyPair.privateKey);
      }).then(function(jwkKey) {
        var ecKey = e2e.asymmetric.keygenerator.jwkToEc(jwkKey);
        algorithm.setKey(ecKey);
        return algorithm;
      });
};


/**
 * Converts a field element (x or y) in JWK string format to an Element object.
 * @param {!e2e.BigPrimeNum} q
 * @param {string} jwkElement
 * @return {!e2e.ecc.Element}
 * @private
 */
e2e.asymmetric.keygenerator.decodeP256Element_ = function(q, jwkElement) {
  var byteArray = goog.crypt.base64.decodeStringToByteArray(jwkElement);
  var bigNum = new e2e.BigNum(byteArray);
  return new e2e.ecc.Element(q, bigNum);
};


/**
 * @param {!e2e.ByteArray|Uint8Array} bytes A byte array to encode.
 * @return {string} The byte array encoded in WebCrypto-compatible base64.
 * @private
 */
e2e.asymmetric.keygenerator.encodeBase64ForWebCrypto_ = function(bytes) {
  var str = goog.crypt.base64.encodeByteArray(bytes, true /* websafe */);
  // goog.crypt.base64 produces padded base64, but WebCrypto demands unpadded.
  return goog.string.removeAll(str, '.');
};


/**
 * Converts a field element (x or y) Element object to JWK string format.
 * @param {!e2e.ecc.Element} element
 * @return {string}
 * @private
 */
e2e.asymmetric.keygenerator.encodeP256Element_ = function(element) {
  var bigNum = element.toBigNum();
  var trimmedBytes = bigNum.toByteArray();  // Leading zeros are trimmed.
  var bytes = new Uint8Array(32);
  bytes.set(trimmedBytes, 32 - trimmedBytes.length);  // Re-add leading zeros.
  return e2e.asymmetric.keygenerator.encodeBase64ForWebCrypto_(bytes);
};


/**
 * Given a JWK-formatted ECDH or ECDSA key, return a key in e2e format.
 * @param {webCrypto.JsonWebKey} jwkKey
 * @return {e2e.cipher.key.Ecdh|e2e.signer.key.Ecdsa}
 */
e2e.asymmetric.keygenerator.jwkToEc = function(jwkKey) {
  if (jwkKey['kty'] !== 'EC') {
    throw new Error('Wrong keytype for Elliptic Curve: ' + jwkKey.kty);
  }
  if (jwkKey['crv'] !== 'P-256') {
    throw new Error('Not a P-256 key');
  }
  var curve = e2e.ecc.PrimeCurveOid.P_256;
  // KDF params, as specified in http://tools.ietf.org/html/rfc6637#section-9
  /** @type {!Array<number>} */ var kdfInfo = [
    0x3,  // 3 bytes to follow
    0x1,  // Reserved byte
    e2e.openpgp.constants.getId(e2e.hash.Algorithm.SHA256),  // 0x8
    e2e.openpgp.constants.getId(e2e.cipher.Algorithm.AES128)  // 0x7
  ];

  var q = new e2e.BigPrimeNum(e2e.ecc.constant.P_256.Q);
  var xElement = e2e.asymmetric.keygenerator.decodeP256Element_(q, jwkKey.x);
  var yElement = e2e.asymmetric.keygenerator.decodeP256Element_(q, jwkKey.y);
  var b = new e2e.BigPrimeNum(e2e.ecc.constant.P_256.B);
  var curveObj = new e2e.ecc.curve.Nist(q, b);
  var point = new e2e.ecc.point.Nist(curveObj, xElement, yElement);

  var privKey = jwkKey.d ? goog.crypt.base64.decodeStringToByteArray(jwkKey.d) :
      null;

  return {
    'curve': curve,
    'kdfInfo': kdfInfo,
    'pubKey': point.toByteArray(),
    'privKey': privKey,
    'loc': e2e.algorithm.KeyLocations.WEB_CRYPTO
  };
};


/**
 * @param {!e2e.ByteArray} pubKey An MPI-serialized P256 curve point, as in
 *     e2e.cipher.key.Ecdh.pubKey.
 * @param {!e2e.ByteArray=} opt_privKey An MPI-serialized P256 private key, as
 *     in e2e.cipher.key.Ecdh.privKey.
 * @return {!webCrypto.JsonWebKey} A representation of this public key as JWK.
 */
e2e.asymmetric.keygenerator.ecToJwk = function(pubKey, opt_privKey) {
  var q = new e2e.BigPrimeNum(e2e.ecc.constant.P_256.Q);
  var b = new e2e.BigPrimeNum(e2e.ecc.constant.P_256.B);
  var curve = new e2e.ecc.curve.Nist(q, b);
  var point = curve.pointFromByteArray(pubKey);
  var xString = e2e.asymmetric.keygenerator.encodeP256Element_(point.x);
  var yString = e2e.asymmetric.keygenerator.encodeP256Element_(point.y);

  var jwk = /** @type {!webCrypto.JsonWebKey} */({
    kty: 'EC',
    crv: 'P-256',
    x: xString,
    y: yString,
    ext: true
  });
  if (opt_privKey) {
    goog.asserts.assert(opt_privKey.length == 32);
    jwk.d = e2e.asymmetric.keygenerator.encodeBase64ForWebCrypto_(opt_privKey);
  }

  return jwk;
};


/**
 * @param {!e2e.ByteArray} v The public key to import.
 * @param {webCrypto.AlgorithmIdentifier} aid Algorithm identifier.
 * @param {Array<string>=} opt_usages The allowed usages of the key.
 * @param {!e2e.ByteArray=} opt_privKey The private key to import.
 * @return {!goog.Thenable<webCrypto.CryptoKey>}
 */
e2e.asymmetric.keygenerator.importWebCryptoKey = function(v, aid,
    opt_usages, opt_privKey) {
  if (aid.name != 'ECDSA' && aid.name != 'ECDH') {
    throw new Error('Algorithm name must be ECDSA or ECDH, not ' + aid.name);
  }
  if (aid.namedCurve != 'P-256') {
    throw new Error('Only P-256 keys are supported, not ' + aid.namedCurve);
  }
  var jwkKey = e2e.asymmetric.keygenerator.ecToJwk(v, opt_privKey);
  return goog.global.crypto.subtle.importKey('jwk', jwkKey, aid,
      true /* extractable */, opt_usages || []);
};
