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
 * @fileoverview Base class for OpenPGP message blocks.
 */

goog.provide('e2e.openpgp.block.Message');

goog.require('e2e');
goog.require('e2e.async.Result');
goog.require('e2e.openpgp.block.Block');
goog.require('e2e.openpgp.packet.OnePassSignature');
goog.require('e2e.openpgp.packet.Signature');
/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.openpgp.types');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.DeferredList');



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
 * @param {Array.<!e2e.openpgp.packet.Signature|
 *     !e2e.openpgp.packet.OnePassSignature>=} opt_signatures
 * @extends {e2e.openpgp.block.Block}
 * @constructor
 */
e2e.openpgp.block.Message = function(opt_signatures) {
  goog.base(this);

  /**
   * @type {!Array.<!e2e.openpgp.packet.Signature|
   *                !e2e.openpgp.packet.OnePassSignature>}
   */
  this.signatures = opt_signatures || [];
};
goog.inherits(e2e.openpgp.block.Message,
    e2e.openpgp.block.Block);


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
 * @return {!e2e.ByteArray}
 */
e2e.openpgp.block.Message.prototype.serializeMessage = goog.abstractMethod;


/**
 * @return {!e2e.openpgp.block.LiteralMessage}
 */
e2e.openpgp.block.Message.prototype.getLiteralMessage = goog.abstractMethod;


/**
 * Consumes all one pass signatures.
 * @param {!Array.<!e2e.openpgp.packet.OnePassSignature>} onepass
 * @param {!Array.<!e2e.openpgp.packet.Packet>} packets
 */
e2e.openpgp.block.Message.prototype.consumeOnePassSignatures = function(
    onepass, packets) {
  for (var i = onepass.length - 1; i >= 0; i--) {
    if (packets[0] instanceof e2e.openpgp.packet.Signature) {
      onepass[i].signature = /** @type {!e2e.openpgp.packet.Signature} */ (
          packets.shift());
    }
  }
};


/**
 * Signs the message with the key and adds the signature packet to the message.
 * @param {!e2e.openpgp.packet.SecretKeyInterface} key The key to sign with.
 * @param {e2e.openpgp.packet.Signature.SignatureType=} opt_signatureType Type
 *    of signature to generate (defaults to BINARY)
 * @return {!e2e.async.Result.<undefined>}
 */
e2e.openpgp.block.Message.prototype.sign = function(key, opt_signatureType) {
  return this.constructSignature(key, opt_signatureType).addCallback(
      function(sig) {
        this.addSignature(sig);
      }, this);
};


/**
 * Signs the message with the key, and adds OnePassSignature packet to the
 * message.
 * @param {!e2e.openpgp.packet.SecretKeyInterface} key The key to sign with.
 * @param {e2e.openpgp.packet.Signature.SignatureType=} opt_signatureType Type
 *    of signature to generate (defaults to BINARY)
 * @return {!e2e.async.Result.<undefined>}
 */
e2e.openpgp.block.Message.prototype.signWithOnePass = function(key,
    opt_signatureType) {
  var realSignatureRes = this.constructSignature(key, opt_signatureType);
  return realSignatureRes.addCallback(function(realSignature) {
    var onePass = realSignature.constructOnePassSignaturePacket(
        this.signatures.length > 0);
    onePass.signature = realSignature;
    this.signatures.unshift(onePass);
  }, this);
};


/**
 * Adds a signature packet to the message.
 * @param {e2e.openpgp.packet.Signature} signature
 */
e2e.openpgp.block.Message.prototype.addSignature = function(signature) {
  this.signatures.unshift(signature);
};


/**
 * Construct a signature over the message and return it without modifying the
 * message.
 * @param  {!e2e.openpgp.packet.SecretKeyInterface} key The key to sign with.
 * @param  {e2e.openpgp.packet.Signature.SignatureType=} opt_signatureType Type
 *     of signature to generate (defaults to BINARY)
 * @return {!e2e.async.Result.<!e2e.openpgp.packet.Signature>} signature
 */
e2e.openpgp.block.Message.prototype.constructSignature = function(key,
    opt_signatureType) {
  return e2e.openpgp.packet.Signature.construct(
      key, this.getBytesToSign(),
      opt_signatureType || e2e.openpgp.packet.Signature.SignatureType.BINARY,
      {
        'SIGNATURE_CREATION_TIME': e2e.dwordArrayToByteArray(
            [Math.floor(new Date().getTime() / 1e3)]),
        'ISSUER': key.keyId
      });
};


/**
 * Gets a byte array representing the message data to create the signature over.
 * @return {!e2e.ByteArray} The serialization of the block.
 * @protected
 */
e2e.openpgp.block.Message.prototype.getBytesToSign = function() {
  return this.serializeMessage();
};


/**
 * Returns key IDs for all the signatures in this message.
 * @return {!Array.<!e2e.openpgp.KeyId>} Key IDs extracted from signatures.
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
 * @return {!e2e.async.Result<e2e.openpgp.block.Message.VerifyResult>}
 */
e2e.openpgp.block.Message.prototype.verify = function(keys) {
  /** @type {!e2e.async.Result<e2e.openpgp.block.Message.VerifyResult>} */
  var result = new e2e.async.Result();
  var signedData = this.getBytesToSign();
  /** @type {!Array<!e2e.async.Result<
   *      !e2e.openpgp.block.Message.VerifyResult>>} */
  var pendingVerifies = goog.array.map(this.signatures, function(signature) {
    var keyId = signature.getSignerKeyId();
    /** @type {e2e.signer.Signer} */
    var signer;
    var verifyingKey = goog.array.find(keys, function(key) {
      var innerKey = key.getKeyById(keyId);
      signer = /** @type {e2e.signer.Signer} */ (innerKey && innerKey.cipher);
      return !!innerKey;
    });
    if (!verifyingKey) { // Key not found, ignore signature.
      return e2e.async.Result.toResult({success: [], failure: []});
    }
    return signature.verify(signedData, goog.asserts.assertObject(signer))
        .addCallback(function(signatureVerified) {
          if (signatureVerified) {
            return {success: [verifyingKey], failure: []};
          } else {
            return {failure: [verifyingKey], success: []};
          }
        });
  });
  goog.async.DeferredList.gatherResults(pendingVerifies).addCallback(
      function(verifyResults) {
        /** @type {!e2e.openpgp.block.Message.VerifyResult} */
        var combinedResult = {success: [], failure: []};
        verifyResults.forEach(function(verifyResult) {
          // verifyResult is constructed in the callback above, so it always has
          // at most one success or one failure.
          goog.asserts.assert(verifyResult.success.length +
              verifyResult.failure.length <= 1);
          if (verifyResult.success.length > 0) {
            combinedResult.success.push(verifyResult.success[0]);
          } else if (verifyResult.failure.length > 0) {
            combinedResult.failure.push(verifyResult.failure[0]);
          }
        });
        result.callback(combinedResult);
      }).addErrback(result.errback, result);
  return result;
};


/** @override */
e2e.openpgp.block.Message.prototype.header = 'MESSAGE';


/**
 * Result of a verification operation.
 * @typedef {?{
 *   success: !Array.<!e2e.openpgp.block.TransferableKey>,
 *   failure: !Array.<!e2e.openpgp.block.TransferableKey>
 * }}
 */
e2e.openpgp.block.Message.VerifyResult;
