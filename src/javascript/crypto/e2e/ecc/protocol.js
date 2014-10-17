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
 * @fileoverview Super class containing shared functions of common ECC
 *     protocols such as ECDH or ECDSA.
 * @author thaidn@google.com (Thai Duong).
 */

goog.provide('e2e.ecc.Protocol');

goog.require('e2e.algorithm.KeyLocations');
goog.require('e2e.ecc.DomainParam');
goog.require('goog.asserts');



/**
 * Representation of an ECC protocol.
 * @param {!e2e.ecc.PrimeCurve} curve The curve used for this protocol.
 * @param {{pubKey: !e2e.ByteArray, privKey: (!e2e.ByteArray|undefined)}=}
 *     opt_key The public and/or private key used in this protocol.
 * @constructor
 */
e2e.ecc.Protocol = function(curve, opt_key) {
  this.params = e2e.ecc.DomainParam.fromCurve(curve);
  goog.asserts.assertObject(this.params.n,
      'Cannot generate protocol for this curve.');
  if (goog.isDefAndNotNull(opt_key)) {
    this.setKey(opt_key);
  }
};


/**
 * ECC domain parameters.
 * @type {e2e.ecc.DomainParam}
 */
e2e.ecc.Protocol.prototype.params;


/**
 * The public key used in this protocol, as an array
 * @type {!e2e.ByteArray}
 * @private
 */
e2e.ecc.Protocol.prototype.pubKey_;


/**
 * The public key used in this protocol, as a point
 * @type {!e2e.ecc.point.Point}
 * @private
 */
e2e.ecc.Protocol.prototype.pubKeyAsPoint_;


/**
 * The private key used in this protocol.
 * @type {!e2e.ByteArray}
 * @private
 */
e2e.ecc.Protocol.prototype.privKey_;


/**
 * Sets the public and/or private key.
 * @param {{pubKey: !e2e.ByteArray, privKey: (!e2e.ByteArray|undefined)}}
 *     key The public and/or private key.
 */
e2e.ecc.Protocol.prototype.setKey = function(key) {
  if (!goog.isDefAndNotNull(key['pubKey']) &&
      !goog.isDefAndNotNull(key['privKey'])) {
    goog.asserts.fail('Either public key or private key should be defined.');
  }
  if (goog.isDefAndNotNull(key['pubKey'])) {
    // This also checks if the pubKey is valid.
    this.pubKey_ = key['pubKey'];
    this.pubKeyAsPoint_ = this.params.curve.pointFromByteArray(key['pubKey']);
  }
  if (goog.isDefAndNotNull(key['privKey'])) {
    this.privKey_ = key['privKey'];
  }
};


/**
 * Returns the public key.
 * @return {!e2e.ByteArray}
 */
e2e.ecc.Protocol.prototype.getPublicKey = function() {
  return this.pubKey_;
};


/**
 * Returns the public key as a point
 * @return {!e2e.ecc.point.Point}
 */
e2e.ecc.Protocol.prototype.getPublicKeyAsPoint = function() {
  return this.pubKeyAsPoint_;
};


/**
 * Returns the private key.
 * @return {!e2e.ByteArray}
 */
e2e.ecc.Protocol.prototype.getPrivateKey = function() {
  return this.privKey_;
};


/**
 * Generates a key pair used in ECC protocols.
 * @param {!e2e.ecc.PrimeCurve} curve The curve of the to-be-generated
 *     key pair.
 * @param {!e2e.ByteArray=} opt_privateKey  An optional already known
 *     private key. If not given, a random key will be created.
 * @return {!e2e.signer.key.Ecdsa}
 */
e2e.ecc.Protocol.generateKeyPair = function(curve, opt_privateKey) {
  var params = e2e.ecc.DomainParam.fromCurve(curve);
  var temp = params.generateKeyPair(opt_privateKey);
  return {
    'privKey': temp['privateKey'],
    'pubKey': temp['publicKey'],
    'curve': e2e.ecc.DomainParam.curveOidFromCurveName(curve),
    'loc': e2e.algorithm.KeyLocations.JAVASCRIPT
  };
};
