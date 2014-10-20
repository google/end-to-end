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
 * @fileoverview User ID packet.
 */

goog.provide('e2e.openpgp.packet.UserId');

goog.require('e2e');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.compression.all');
goog.require('e2e.compression.factory');

goog.require('e2e.hash.Algorithm');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.hash.all');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.SignatureError');
goog.require('e2e.openpgp.error.SignatureExpiredError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.packet.Packet');
goog.require('e2e.openpgp.packet.Signature');
goog.require('e2e.openpgp.packet.SignatureSub');
goog.require('e2e.openpgp.packet.factory');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * User ID Packet (Tag 13) defined in RFC 4880 section 5.11.
 * @param {string} userId The user ID.
 * @constructor
 * @extends {e2e.openpgp.packet.Packet}
 */
e2e.openpgp.packet.UserId = function(userId) {
  goog.base(this);
  /**
   * UTF-8 text representing the name and email address of the key holder.
   * @type {string}
   */
  this.userId = userId;
  /**
   * @type {!Array.<!e2e.openpgp.packet.Signature>}
   * @private
   */
  this.certifications_ = [];
  /**
   * @type {!Array.<!e2e.openpgp.packet.Signature>}
   * @private
   */
  this.revocations_ = [];
};
goog.inherits(e2e.openpgp.packet.UserId,
              e2e.openpgp.packet.Packet);


/** @inheritDoc */
e2e.openpgp.packet.UserId.prototype.tag = 13;


/**
 * Parses and extracts the data from the body. It will consume all data from the
 * array.
 * @param {!e2e.ByteArray} data The data to parse.
 * @return {e2e.openpgp.packet.UserId} A user ID Packet.
 */
e2e.openpgp.packet.UserId.parse = function(data) {
  var userId = e2e.byteArrayToString(data);
  data = [];
  return new e2e.openpgp.packet.UserId(userId);
};


/** @inheritDoc */
e2e.openpgp.packet.UserId.prototype.serializePacketBody = function() {
  return e2e.stringToByteArray(this.userId);
};


/** @override */
e2e.openpgp.packet.UserId.prototype.serialize = function() {
  var serialized = goog.base(this, 'serialize');
  goog.array.forEach(
      this.revocations_.concat(this.certifications_),
      function(sig) {
        goog.array.extend(serialized, sig.serialize());
      });
  return serialized;
};


/**
 * @param {e2e.openpgp.packet.Signature} signature
 */
e2e.openpgp.packet.UserId.prototype.addCertification = function(signature) {
  if (!signature.isCertificationSignature()) {
    throw new e2e.openpgp.error.ParseError(
        'Signature is not a certification signature.');
  }
  this.certifications_.push(signature);
};


/**
 * Adds the User ID revocation signature.
 * Caution! Signature is not verified, use verifySignatures() function to verify
 * the signature.
 * @param {!e2e.openpgp.packet.Signature} signature Revocation signature
 */
e2e.openpgp.packet.UserId.prototype.addRevocation = function(signature) {
  if (signature.signatureType !==
      e2e.openpgp.packet.Signature.SignatureType.CERTIFICATION_REVOCATION) {
    throw new e2e.openpgp.error.ParseError(
        'Invalid revocation signature type.');
  }
  this.revocations_.push(signature);
};


/**
 * @param {e2e.openpgp.packet.Signature} signature
 * @param {!e2e.openpgp.packet.Key} verifyingKey key packet that should
 *     verify the certification signature.
 * @param {!e2e.ByteArray} signedData data that was signed.
 * @param {string} verificationErrorMsg error message when signature did not
 *     verify.
 * @return {boolean} True iff signature verified correctly.
 * @private
 */
e2e.openpgp.packet.UserId.prototype.verifySignatureInternal_ = function(
    signature, verifyingKey, signedData, verificationErrorMsg) {
  if (!verifyingKey.keyId || !goog.array.equals(signature.getSignerKeyId(),
      verifyingKey.keyId)) {
    // Different key, ignore signature.
    return false;
  }
  var signer = /** @type {!e2e.signer.Signer} */ (verifyingKey.cipher);
  try {
    var signatureVerified = signature.verify(signedData,
        goog.asserts.assertObject(signer));
  } catch (e) {
    // Ignore signatures that throw unsupported errors (e.g. weak hash
    // algorithms) and expired signatures.
    if (e instanceof e2e.openpgp.error.UnsupportedError) {
      return false;
    } else if (e instanceof e2e.openpgp.error.SignatureExpiredError) {
      return false;
    }
    throw e;
  }
  if (!signatureVerified) {
    throw new e2e.openpgp.error.SignatureError(verificationErrorMsg);
  }
  return true;
};


/**
 * @param {e2e.openpgp.packet.Signature} signature
 * @param {!e2e.openpgp.packet.Key} verifyingKey key packet that should
 *     verify the certification signature.
 * @return {boolean} True iff signature verified correctly.
 * @private
 */
e2e.openpgp.packet.UserId.prototype.verifyCertification_ = function(signature,
    verifyingKey) {
  return this.verifySignatureInternal_(
      signature,
      verifyingKey,
      this.getCertificationSignatureData_(verifyingKey),
      'Certification signature verification failed.');
};


/**
 * Checks if a packet has valid certification signature by a given
 *     key packet. This function will throw error if signature verification
 *     fails.
 * @param {!e2e.openpgp.packet.Key} verifyingKey key packet that should
 *     verify the signatures
 * @return {boolean} True if key has a valid certification.
 */
e2e.openpgp.packet.UserId.prototype.verifySignatures = function(verifyingKey) {
  // Revocation removes related certification signatures.
  goog.array.forEach(this.revocations_,
      goog.bind(this.applyRevocation_, this, verifyingKey));
  // User ID needs to have a valid certification signature. See RFC 4880 11.1.
  var hasCertification = false;
  // Process all signatures to detect tampering.
  goog.array.forEach(this.certifications_, function(signature) {
    if (this.verifyCertification_(signature, verifyingKey))
      hasCertification = true;
  }, this);
  return hasCertification;
};


/**
 * Applies a revocation signature, removing all certification signatures by a
 * given key.
 * @param {!e2e.openpgp.packet.Key} verifyingKey key packet that should
 *     verify the signatures
 * @param  {!e2e.openpgp.packet.Signature} revocation revocation signature
 * @private
 */
e2e.openpgp.packet.UserId.prototype.applyRevocation_ = function(verifyingKey,
    revocation) {
  if (this.verifySignatureInternal_(
      revocation,
      verifyingKey,
      this.getCertificationSignatureData_(verifyingKey),
      'User ID revocation signature verification failed.')) {
    var revocationKey = revocation.getSignerKeyId();
    for (var i = this.certifications_.length - 1; i >= 0; i--) {
      if (goog.array.equals(revocationKey,
          this.certifications_[i].getSignerKeyId())) {
        // Invalidate certifications by the same key
        this.certifications_.splice(i, 1);
      }
    }
  }
};


/**
 * Returns data for creating a certification signature between this packet and
 *     a given binding key.
 * @param  {!e2e.openpgp.packet.Key} certifyingKey Key that certified
 * @return {!e2e.ByteArray} Signature data.
 * @private
 */
e2e.openpgp.packet.UserId.prototype.getCertificationSignatureData_ = function(
    certifyingKey) {
  return goog.array.flatten(
      certifyingKey.getPublicKeyPacket().getBytesToSign(),
      this.getBytesToSign());
};


/**
 * @return {Array.<e2e.openpgp.packet.Signature>} certifications
 */
e2e.openpgp.packet.UserId.prototype.getCertifications = function() {
  return this.certifications_;
};


/**
 * @param {e2e.openpgp.packet.SecretKey} key
 */
e2e.openpgp.packet.UserId.prototype.certifyBy = function(key) {
  var data = goog.array.flatten(
      key.getPublicKeyPacket().getBytesToSign(),
      this.getBytesToSign()
      );
  var sigResult = e2e.openpgp.packet.Signature.construct(
      key,
      data,
      e2e.openpgp.packet.Signature.SignatureType.GENERIC_USER_ID,
      this.getSignatureAttributes_(key));

  sigResult.addCallback(function(sig) {
    this.certifications_.push(sig);
  }, this);
};


/**
 * Returns key certification signature attributes, including End-to-End
 * algorithm preferences.
 * @param {e2e.openpgp.packet.SecretKey} key
 * @return {Object.<string, number|!e2e.ByteArray>}  Attributes
 * @private
 */
e2e.openpgp.packet.UserId.prototype.getSignatureAttributes_ = function(key) {
  // Prefer only SHA-2 family.
  var hashAlgos = [
    e2e.hash.Algorithm.SHA256,
    e2e.hash.Algorithm.SHA384,
    e2e.hash.Algorithm.SHA512,
    e2e.hash.Algorithm.SHA224
  ];
  var hashIds = goog.array.map(hashAlgos, e2e.openpgp.constants.getId);
  // Prefer all available compression mechanisms.
  var compressionAlgos = e2e.compression.factory.getAvailable();
  var compressionIds = goog.array.map(compressionAlgos,
      e2e.openpgp.constants.getId);
  // Prefer only the default symmetric algorithm (AES-256).
  var symAlgos = [
    e2e.openpgp.constants.DEFAULT_SYMMETRIC_CIPHER
  ];
  var symIds = goog.array.map(symAlgos, e2e.openpgp.constants.getId);

  return {
    'SIGNATURE_CREATION_TIME': e2e.dwordArrayToByteArray(
        [Math.floor(new Date().getTime() / 1e3)]),
    'ISSUER': key.keyId,
    'PREFERRED_SYMMETRIC_ALGORITHMS': symIds,
    'PREFERRED_HASH_ALGORITHMS': hashIds,
    'PREFERRED_COMPRESSION_ALGORITHMS': compressionIds,
    'FEATURES': [0x01], // Modification detection. See RFC 4880 5.2.3.24.
    'KEY_FLAGS': [
      e2e.openpgp.packet.SignatureSub.KeyFlags.CERTIFY |
          e2e.openpgp.packet.SignatureSub.KeyFlags.SIGN]
  };
};


/**
 * Gets a byte array representing the User ID data to create the signature over.
 * This is intended for signatures of type 0x10 through 0x13.
 * See RFC 4880 5.2.4 for details.
 * @return {!e2e.ByteArray} The bytes to sign.
 * @protected
 */
e2e.openpgp.packet.UserId.prototype.getBytesToSign = function() {
  return goog.array.flatten(
      0xB4,
      e2e.dwordArrayToByteArray([this.userId.length]),
      e2e.stringToByteArray(this.userId)
  );
};


e2e.openpgp.packet.factory.add(e2e.openpgp.packet.UserId);
