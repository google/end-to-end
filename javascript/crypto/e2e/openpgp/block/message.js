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
 * @fileoverview Base class for OpenPGP message blocks.
 */

goog.provide('e2e.openpgp.block.Message');

goog.require('e2e.hash.factory');
goog.require('e2e.openpgp');
goog.require('e2e.openpgp.block.Block');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.packet.Key');
goog.require('e2e.openpgp.packet.Signature');
goog.require('e2e.signer.Signer');


/**
 * Representation of a message block. According to the OpenPGP RFC (RFC 4880)
 * Section 11.3, a message block has the following grammar:
 *  OpenPGP Message :- Encrypted Message | Signed Message |
 *                     Compressed Message | Literal Message.
 *
 *  Compressed Message :- Compressed Data Packet.
 *
 *  Literal Message :- Literal Data Packet.
 *
 *  ESK :- Public-Key Encrypted Session Key Packet |
 *         Symmetric-Key Encrypted Session Key Packet.
 *
 *  ESK Sequence :- ESK | ESK Sequence, ESK.
 *
 *  Encrypted Data :- Symmetrically Encrypted Data Packet |
 *        Symmetrically Encrypted Integrity Protected Data Packet
 *
 *  Encrypted Message :- Encrypted Data | ESK Sequence, Encrypted Data.
 *
 *  One-Pass Signed Message :- One-Pass Signature Packet,
 *              OpenPGP Message, Corresponding Signature Packet.
 *
 *  Signed Message :- Signature Packet, OpenPGP Message |
 *              One-Pass Signed Message.
 * @param {Array.<e2e.openpgp.packet.Signature>=} opt_signatures
 * @extends {e2e.openpgp.block.Block}
 * @constructor
 */
e2e.openpgp.block.Message = function(opt_signatures) {
  goog.base(this);

  /**
   * @type {Array.<e2e.openpgp.packet.Signature>}
   */
  this.signatures = opt_signatures || [];
};
goog.inherits(e2e.openpgp.block.Message,
    e2e.openpgp.block.Block);


/**
 * Extracts the data from the block. Might throw if can't extract the data.
 * @return {e2e.openpgp.packet.Data} Packet with the information.
 */
e2e.openpgp.block.Message.prototype.getData = goog.abstractMethod;


/** @override */
e2e.openpgp.block.Message.prototype.serialize = function() {
  var onepassSuffix = [];
  return goog.array.flatten(goog.array.map(this.signatures, function(sig) {
    if (sig instanceof e2e.openpgp.packet.OnePassSignature) {
      onepassSuffix.unshift(sig.signature.serialize());
    }
    return sig.serialize();
  }), this.serializeMessage(), onepassSuffix);
};


/**
 * Serialize the message internal body without signatures.
 * @return {e2e.ByteArray}
 */
e2e.openpgp.block.Message.prototype.serializeMessage = goog.abstractMethod;


/**
 * Consumes all one pass signatures.
 * @param {!Array.<!e2e.openpgp.packet.OnePassSignature>} onepass
 * @param {!Array.<!e2e.openpgp.packet.Packet>} packets
 */
e2e.openpgp.block.Message.prototype.consumeOnePassSignatures = function(
    onepass, packets) {
  for (var i = onepass.length - 1; i >= 0; i--) {
    if (packets[0] instanceof e2e.openpgp.packet.Signature) {
      onepass[i].signature = /** @type {e2e.openpgp.packet.Signature} */ (
          packets.shift());
    }
  }
};


/**
 * Signs the message with the key and adds the signature packet to the message.
 * @param {e2e.openpgp.packet.SecretKey} key
 */
e2e.openpgp.block.Message.prototype.sign = function(key) {
  this.signatures.unshift(this.constructSignature(key));
};


/**
 * Signs the message with the key, and adds OnePassSignature packet to the
 * message.
 * @param {e2e.openpgp.packet.SecretKey} key
 */
e2e.openpgp.block.Message.prototype.signWithOnePass = function(key) {
  var realSignature = this.constructSignature(key);
  var onePass = realSignature.constructOnePassSignaturePacket(
    this.signatures.length > 0);
  onePass.signature = realSignature;
  this.signatures.unshift(onePass);
};


/**
 * Construct a signature over the message and return it without modifying the
 * message.
 * @param  {e2e.openpgp.packet.SecretKey} key
 * @return {e2e.openpgp.packet.Signature} signature
 */
e2e.openpgp.block.Message.prototype.constructSignature = function(key) {
  return e2e.openpgp.packet.Signature.construct(
    key, this.getBytesToSign(),
    e2e.openpgp.packet.Signature.SignatureType.BINARY,
    {
      'SIGNATURE_CREATION_TIME': e2e.dwordArrayToByteArray(
        [Math.floor(new Date().getTime() / 1e3)]),
      'ISSUER': key.keyId
    });
};


/**
 * Gets a byte array representing the message data to create the signature over.
 * @return {e2e.ByteArray} The serialization of the block.
 * @protected
 */
e2e.openpgp.block.Message.prototype.getBytesToSign = function() {
  return this.serializeMessage();
};


/**
 * Returns key IDs for all the signatures in this message.
 * @return {!Array.<!e2e.ByteArray>} Key IDs extracted from signatures.
 */
e2e.openpgp.block.Message.prototype.getSignatureKeyIds = function() {
  var keyIds = goog.array.map(this.signatures, function(signature) {
    return signature.getSignerKeyId();
  });
  goog.array.removeDuplicates(keyIds);
  return keyIds;
};


/**
 * Verifies all the signatures present on the message against given keys.
 * Signatures created by other keys are ignored.
 * @param {!Array.<!e2e.openpgp.block.TransferableKey>} keys Keys to verify
 *     the signature against.
 * @return {!e2e.openpgp.block.Message.verifyResult}
 */
e2e.openpgp.block.Message.prototype.verify = function(keys) {
  var result = /** @type {e2e.openpgp.block.Message.verifyResult} */ ({
        success: [],
        failure: []
  });
  var resultsByKey = [];
  var signedData = this.getBytesToSign();
  goog.array.forEach(this.signatures, function(signature) {
    var keyId = signature.getSignerKeyId();
    var verifyingKey = goog.array.find(keys, function(key) {
      return key.hasKeyById(keyId);
    });
    if (!verifyingKey) { // Key not found, ignore signature.
      return;
    }
    var signer = /** @type {e2e.signer.Signer} */ (verifyingKey
      .getKeyById(keyId).cipher);
    // Hash algorithm declared in signature may differ from the one used
    // when instantiating cipher. Use the one declared in signature
    // (if it's allowed).
    var allowedAlgo = e2e.openpgp.SignatureDigestAlgorithm[
        signature.getHashAlgorithm()];
    if (!allowedAlgo) {
      throw new e2e.openpgp.error.UnsupportedError(
          'Specified hash algorithm is not allowed for signatures.');
    }
    var digestAlgo = e2e.hash.factory.require(allowedAlgo);
    signer.setHash(digestAlgo);
    if (signature.verify(signedData, signer)) {
      goog.array.extend(result.success, verifyingKey);
    } else {
      goog.array.extend(result.failure, verifyingKey);
    }
  });
  return result;
};

/**
 * Result of a verification operation.
 * @typedef {{
 *   success: !Array.<!e2e.openpgp.block.TransferableKey>,
 *   failure: !Array.<!e2e.openpgp.block.TransferableKey>
 * }}
 */
e2e.openpgp.block.Message.verifyResult;
