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
 * @fileoverview One-Pass Signature packet.
 */

goog.provide('e2e.openpgp.packet.OnePassSignature');

goog.require('e2e.openpgp.packet.Packet');
goog.require('e2e.openpgp.packet.factory');



/**
 * @param {number} version
 * @param {number} type
 * @param {number} hashAlgo
 * @param {number} pubkeyAlgo
 * @param {!e2e.openpgp.KeyId} keyId
 * @param {boolean} nested
 * @constructor
 * @extends {e2e.openpgp.packet.Packet}
 */
e2e.openpgp.packet.OnePassSignature = function(
    version, type, hashAlgo, pubkeyAlgo, keyId, nested) {
  goog.base(this);
  this.version = version;

  this.type = type;

  this.hashAlgo = hashAlgo;

  this.pubkeyAlgo = pubkeyAlgo;

  this.keyId = keyId;

  // true indicates that the next packet is a onepassSignature.
  this.nested = nested;
};
goog.inherits(e2e.openpgp.packet.OnePassSignature,
              e2e.openpgp.packet.Packet);


/** @override */
e2e.openpgp.packet.OnePassSignature.prototype.tag = 4;


/**
 * @type {!e2e.openpgp.packet.Signature}
 */
e2e.openpgp.packet.OnePassSignature.prototype.signature;


/** @override */
e2e.openpgp.packet.OnePassSignature.prototype.serializePacketBody =
    function() {
  return [this.version, this.type, this.hashAlgo, this.pubkeyAlgo].concat(
      this.keyId).concat([this.nested ? 0 : 1]);
};


/**
 * Verifies that a key pair actually signed the specified data. Forwards the
 * verification to the related Signature packet.
 * @param {!e2e.ByteArray|!Uint8Array} data The signed data.
 * @param {!e2e.signer.Signer} signer Signer with the public key that
 *     signed the data.
 * @param {string=} opt_hashAlgo message digest algorithm declared in the
 *     message.
 * @return {boolean} True if the signature correctly verifies.
 */
e2e.openpgp.packet.OnePassSignature.prototype.verify = function(
    data, signer, opt_hashAlgo) {
  if (this.signature) {
    return this.signature.verify(data, signer, opt_hashAlgo);
  }
  return false;
};


/**
 * Extracts key ID used to place the signature (if possible, forwards the call
 * to the related Signature object, as key ID there might be signed as well.
 * @return {!e2e.openpgp.KeyId} signer key ID
 */
e2e.openpgp.packet.OnePassSignature.prototype.getSignerKeyId = function() {
  if (this.signature) {
    return this.signature.getSignerKeyId();
  }
  return this.keyId;
};


/**
 * Returns hash algorithm declared in the related Signature packet. Ignores
 * algorithm declared in OnePassSignature packet.
 * @return {?e2e.hash.Algorithm} Hash algorithm
 */
e2e.openpgp.packet.OnePassSignature.prototype.getHashAlgorithm = function() {
  if (this.signature) {
    return this.signature.getHashAlgorithm();
  }
  return null;
};


/**
 * @param {!e2e.ByteArray} body
 * @return {!e2e.openpgp.packet.OnePassSignature}
 */
e2e.openpgp.packet.OnePassSignature.parse = function(body) {
  var version = body.shift();
  var type = body.shift();
  var hashAlgo = body.shift();
  var pubkeyAlgo = body.shift();
  var keyId = body.splice(0, 8);
  var nested = body.shift() == 0;
  return new e2e.openpgp.packet.OnePassSignature(
      version, type, hashAlgo, pubkeyAlgo, keyId, nested);
};


e2e.openpgp.packet.factory.add(e2e.openpgp.packet.OnePassSignature);
