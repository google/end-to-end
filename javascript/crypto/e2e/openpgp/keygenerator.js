// Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Key generator. End-To-End supports generating only ECC keys.
 */

goog.provide('e2e.openpgp.keygenerator');

goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.Ecdh');
goog.require('e2e.ecc.PrimeCurve');
goog.require('e2e.ecc.Protocol');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.Ecdsa');



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
