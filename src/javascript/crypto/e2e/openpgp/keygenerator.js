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

goog.provide('e2e.openpgp.keygenerator');

goog.require('e2e.algorithm.KeyLocations');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.Ecdh');
goog.require('e2e.cipher.Rsa');
goog.require('e2e.ecc.PrimeCurve');
goog.require('e2e.ecc.Protocol');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.Ecdsa');
goog.require('goog.crypt.base64');


/**
 * Generates a key pair on the default curve and uses it to construct
 * an ECDSA object.
 * @param {!e2e.ByteArray=} opt_privateKey  An optional already known
 *     private key. If not given, a random key will be created.
 * @return {!e2e.signer.Ecdsa}
 */
e2e.openpgp.keygenerator.newEcdsaWithP256 = function(
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
e2e.openpgp.keygenerator.newEcdhWithP256 = function(
    opt_privateKey) {
  var key = e2e.ecc.Protocol.generateKeyPair(
      e2e.ecc.PrimeCurve.P_256, opt_privateKey);
  key['kdfInfo'] = [
    0x3, 0x1, 0x8 /* SHA256 Algo ID*/, 0x7 /* AES-128 Algo ID */];
  return new e2e.cipher.Ecdh(e2e.cipher.Algorithm.ECDH, key);
};


/**
 * @param {number} keyLength  Length of the key. Should be 4096 or 8192.
 * @return {!e2e.async.Result.<Array.<e2e.Algorithm>>}
 */
e2e.openpgp.keygenerator.newWebCryptoRsaKeys = function(keyLength) {
  if (!('crypto' in goog.global && 'subtle' in goog.global.crypto)) {
    throw new e2e.openpgp.error.UnsupportedError('No WebCrypto support!');
  }
  // Disable typechecking until crypto.subtle is available in stable chrome.
  var crypto = /** @type {{generateKey: function(...): *,
                exportKey: function(...): *}} */ (goog.global.crypto['subtle']);

  var aid = {'name': 'RSASSA-PKCS1-v1_5',
    'modulusLength': keyLength,
    'publicExponent': new Uint8Array([1, 0, 1]),
    'hash': {'name': 'SHA-256'}};

  var result = new e2e.async.Result;
  var rsaSigner;
  var rsaCipher;
  crypto.generateKey(aid, false, ['sign', 'verify']).catch (
      function(e) {
        result.errback(e);
      }).then(function(sigKeyPair) {
    crypto.exportKey('jwk', sigKeyPair.publicKey).then(
        function(sigPubStr) {
          var sigPubKey = JSON.parse(String.fromCharCode.apply(null,
              new Uint8Array(sigPubStr)));
          var sigRSAKey = e2e.openpgp.keygenerator.jwkToNative_(sigPubKey);
          rsaSigner = new e2e.cipher.Rsa(e2e.signer.Algorithm.RSA, sigRSAKey);
          rsaSigner.setWebCryptoKey(sigKeyPair);

          aid.name = 'RSAES-PKCS1-v1_5';
          crypto.generateKey(aid, false, ['encrypt', 'decrypt']).catch (
              function(e) {
                result.errback(e);
              }).then(function(encKeyPair) {
            crypto.exportKey('jwk', encKeyPair.publicKey).then(
                function(encPubStr) {
                  var encPubKey = JSON.parse(String.fromCharCode.apply(
                      null, new Uint8Array(encPubStr)));
                  var encRSAKey = e2e.openpgp.keygenerator.jwkToNative_(
                      encPubKey);
                  rsaCipher = new e2e.cipher.Rsa(e2e.cipher.Algorithm.RSA,
                      encRSAKey);
                  rsaCipher.setWebCryptoKey(encKeyPair);

                  result.callback([rsaSigner, rsaCipher]);
                }).catch (function(e) { result.errback(e); });
          });
        }).catch (function(e) { result.errback(e); });
  });
  return result;
};


/**
 * Given a JWK-formatted RSA key, return a key in the format that we want.
 * @param {*} jwkKey
 * @return {e2e.cipher.key.Rsa}
 * @private
 */
e2e.openpgp.keygenerator.jwkToNative_ = function(jwkKey) {
  return {
    'n': goog.crypt.base64.decodeStringToByteArray(jwkKey.n),
    'e': goog.crypt.base64.decodeStringToByteArray(jwkKey.e),
    'loc': e2e.algorithm.KeyLocations.WEB_CRYPTO
  };
};

