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
goog.require('e2e.ImmutableArray');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.compression.all');
goog.require('e2e.compression.factory');
goog.require('e2e.debug.Console');
goog.require('e2e.hash.Algorithm');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.hash.all');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.SignatureError');
goog.require('e2e.openpgp.error.SignatureExpiredError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.packet.Key');
goog.require('e2e.openpgp.packet.Packet');
goog.require('e2e.openpgp.packet.Signature');
goog.require('e2e.openpgp.packet.SignatureSub');
goog.require('e2e.openpgp.packet.factory');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.crypt');


/**
 * Verification state for certifications associated with a key.
 * @enum {boolean}
 * @private
 */
e2e.openpgp.packet.UserIdCertificationState_ = {
  VERIFIED: true,
  UNVERIFIED: false
};



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
   * Map from Key ID to an array of certifications or revocations from
   * that Key ID. Each array also contains a state indicating whether
   * the certifications in it have been verified.
   * @type {!Object.<string,
   *     !e2e.ImmutableArray<!e2e.openpgp.packet.Signature,
   *         e2e.openpgp.packet.UserIdCertificationState_>>}
   * @private
   */
  this.keyIdSignatureMap_ = {};
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
  e2e.openpgp.packet.UserId.console_.info(
      '  User ID', userId);
  data = [];
  return new e2e.openpgp.packet.UserId(userId);
};


/**
 * Query if the provided key has certified the User ID for a specific
 * use. This information is obtained from the KEY_FLAGS property of
 * its certification signature. If the signature contains no KEY_FLAGS
 * at all, the userid is considered to be certified for all uses.
 * If the key was never certified (through verifySignatures())
 * this method will throw an exception.
 * @param {!e2e.openpgp.packet.Key} key
 * @param {!e2e.openpgp.packet.Key.Usage} use
 * @return {boolean}
 */
e2e.openpgp.packet.UserId.prototype.isCertifiedTo = function(key, use) {
  var sig = this.getVerifiedCertification_(key);
  if (goog.isNull(sig)) {
    throw new e2e.openpgp.error.SignatureError(
        'User ID is not certified by the provided key');
  }

  // If the signature has no KEY_FLAGS property at all, the User ID
  // is considered to be certified for all uses.
  if (!sig.attributes.hasOwnProperty('KEY_FLAGS')) {
    return true;
  }
  // Otherwise, look for a suitable attribute on the signature.
  if (use === e2e.openpgp.packet.Key.Usage.SIGN) {
    return sig.attributes.KEY_FLAG_SIGN !== 0;
  } else if (use === e2e.openpgp.packet.Key.Usage.ENCRYPT) {
    return sig.attributes.KEY_FLAG_ENCRYPT_COMMUNICATION ||
        sig.attributes.KEY_FLAG_ENCRYPT_STORAGE !== 0;
  } else {
    return false;
  }
};


/**
 * The timestamp of the most recent valid self-signature for
 * this User ID made by the provided key. If the key was never
 * certified (through verifySignatures()) this method will throw
 * an exception.
 * @param {!e2e.openpgp.packet.Key} key
 * @return {number} timestamp
 */
e2e.openpgp.packet.UserId.prototype.getCertifiedTime = function(key) {
  var sig = this.getVerifiedCertification_(key);
  if (goog.isNull(sig)) {
    throw new e2e.openpgp.error.SignatureError('This key is not verified');
  }
  return sig.creationTime;
};


/** @inheritDoc */
e2e.openpgp.packet.UserId.prototype.serializePacketBody = function() {
  return e2e.stringToByteArray(this.userId);
};


/** @override */
e2e.openpgp.packet.UserId.prototype.serialize = function() {
  var serialized = goog.base(this, 'serialize');

  // Append the serialization of every signature in our map.
  this.forEachSignature_(function(sig) {
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
  // Add this to our map of signatures keyed by signer Key ID.
  this.addToKeyIdMap_(signature);
};


/**
 * Add the provided signature to the internal map of Key IDs to signatures.
 * @param {!e2e.openpgp.packet.Signature} signature
 * @private
 */
e2e.openpgp.packet.UserId.prototype.addToKeyIdMap_ = function(signature) {
  var kid = e2e.openpgp.packet.UserId.keyIdToString_(
      signature.getSignerKeyId());
  this.keyIdSignatureMap_[kid] = e2e.ImmutableArray.pushCopy(
      this.keyIdSignatureMap_[kid], signature);
};


/**
 * Given a Key ID bytearray, convert it into a hex string
 * to be used as an index into the keyIdSignatureMap.
 * @param {!e2e.ByteArray} keyid
 * @return {string}
 * @private
 */
e2e.openpgp.packet.UserId.keyIdToString_ = function(keyid) {
  return goog.crypt.byteArrayToHex(keyid);
};


/**
 * Iterate over all signatures in our map.
 * @param {function(!e2e.openpgp.packet.Signature): ?} f the function
 *     to call over all signatures attached to this User ID.
 * @private
 */
e2e.openpgp.packet.UserId.prototype.forEachSignature_ = function(f) {
  var map = this.keyIdSignatureMap_;
  for (var kid in map) {
    if (map.hasOwnProperty(kid)) {
      e2e.ImmutableArray.forEach(map[kid], f);
    }
  }
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
  // Add this to our map of signatures keyed by signer Key ID.
  this.addToKeyIdMap_(signature);
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
    e2e.openpgp.packet.UserId.console_.warn(
        'Unable to verify signature for ', this.userId, e);
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
 * Checks if a packet has valid certification signature by a given
 *     key packet. This function will throw error if signature verification
 *     fails.
 * @param {!e2e.openpgp.packet.Key} verifyingKey key packet that should
 *     verify the signatures
 * @return {boolean} True if key has a valid certification.
 */
e2e.openpgp.packet.UserId.prototype.verifySignatures = function(verifyingKey) {
  // 0. Only permit verification by keys with a Key ID.
  if (!goog.isDef(verifyingKey.keyId)) {
    e2e.openpgp.packet.UserId.console_.warn('No Key ID in verifying key');
    return false;
  }

  // 1. Check if we have any signatures by the verifying Key ID.
  var kid = e2e.openpgp.packet.UserId.keyIdToString_(verifyingKey.keyId);
  var signatures = this.keyIdSignatureMap_[kid];
  if (!goog.isDefAndNotNull(signatures)) {
    e2e.openpgp.packet.UserId.console_.warn('No signatures made by ', kid);
    return false;
  }

  // We first find the newest valid signature made by the verifying key.
  //
  // The User ID is considered certified iff such a valid signature
  // exists, and is a certification signature.
  //
  // The rationale is that revocations on uid certifications are only
  // applicable for certifications with timestamps older than them.
  // See https://tools.ietf.org/html/rfc4880#section-5.2.1 and
  // documentation on 0x30 signatures.
  //
  // Further, only the most recent certification is to be considered
  // on User IDs. See
  // https://tools.ietf.org/html/rfc4880#section-5.2.3.3
  // This permits sequences of UID signatures like
  // certify -- t1
  // revoke  -- t2
  // certify -- t3
  // where t3 > t2 > t1
  // In this case, the User ID is considered certified, and any
  // metadata is to be used from the t3 certification. (In practice as
  // well, this is the model used by gpg.)
  // However, if t2 > t3 and t1, then the User ID is considered
  // revoked.
  //
  // If certified, all other signatures made by this key are removed,
  // and only the latest (valid) signature is stored in the
  // ImmutableArray.

  var newestSignature = this.findNewestValidSignature_(
      signatures, verifyingKey);

  if (goog.isNull(newestSignature)) {
    e2e.openpgp.packet.UserId.console_.warn('No usable signatures from ', kid);
    return false;
  }

  // Reject unless the most recent signature is a certification signature.
  if (!newestSignature.isCertificationSignature()) {
    return false;
  }

  // 3. Now we clear the ImmutableArray of everything except
  // the one valid signature, and mark it as verified.
  this.keyIdSignatureMap_[kid] = new e2e.ImmutableArray(
      [newestSignature],
      e2e.openpgp.packet.UserIdCertificationState_.VERIFIED);
  return true;
};


/**
 * Returns the newest valid signature within the provided array made
 * by the verifyingKey, or null if none exists.
 * @param {!e2e.ImmutableArray<
 *     !e2e.openpgp.packet.Signature,
 *      e2e.openpgp.packet.UserIdCertificationState_>} signatures
 * @param {!e2e.openpgp.packet.Key} verifyingKey
 * @return {e2e.openpgp.packet.Signature}
 * @private
 */
e2e.openpgp.packet.UserId.prototype.findNewestValidSignature_ = function(
    signatures, verifyingKey) {
  var latestSignature = null;
  var latestTimestamp = -1;
  var signatureData = this.getCertificationSignatureData_(verifyingKey);
  e2e.ImmutableArray.forEach(signatures, function(signature) {
    if (this.verifySignatureInternal_(
        signature, verifyingKey, signatureData,
        'User ID signature verification failed.')) {
      // See if this is newer than our current newest signature.
      if (signature.creationTime >= latestTimestamp) {
        latestSignature = signature;
        latestTimestamp = signature.creationTime;
      }
    }
  }, this);
  return latestSignature;
};


/**
 * Return a verified certification made by the provided key, or null if
 * no verified signatures were found.
 * @param {!e2e.openpgp.packet.Key} key
 * @return {e2e.openpgp.packet.Signature}
 * @private
 */
e2e.openpgp.packet.UserId.prototype.getVerifiedCertification_ = function(key) {
  // 0. Only allow keys with Key IDs.
  if (!goog.isDef(key.keyId)) {
    return null;
  }

  // 1. Get the ImmutableArray containing signatures made by
  // this Key ID.
  var kid = e2e.openpgp.packet.UserId.keyIdToString_(key.keyId);
  var array = this.keyIdSignatureMap_[kid];
  if (!goog.isDef(array)) {
    return null;
  }

  // 2. Check whether we've assigned a certification state for this
  // array.
  if (!goog.isDef(array.getState())) {
    return null;
  }

  // 3. Sanity checks. We only ever set a VERIFIED state. Furthermore,
  // there must be exactly one certification signature.
  e2e.assert((array.getState() ===
      e2e.openpgp.packet.UserIdCertificationState_.VERIFIED) &&
      (array.size() === 1));
  var ret = array.get(0);
  e2e.assert(ret.isCertificationSignature());
  return ret;
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

  var pubkey = key.getPublicKeyPacket();
  sigResult.addCallback(function(sig) {
    // This newly minted signature should become the latest, valid
    // certification on this User ID. We check this by explicitly
    // verifying the newly created signature.
    this.addCertification(sig);
    if (!this.verifySignatures(pubkey)) {
      throw new e2e.openpgp.error.SignatureError(
          'Unexpected - newly certified signature could not be verified.');
    }
    if (sig != this.getVerifiedCertification_(pubkey)) {
      throw new e2e.openpgp.error.SignatureError(
          'Unexpected - new certification was not the latest.');
    }
  }, this);
};


/**
 * Returns key certification signature attributes, including End-to-End
 * algorithm preferences.
 * @param {e2e.openpgp.packet.SecretKey} key
 * @return {!Object.<string, number|!e2e.ByteArray>}  Attributes
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
  var data = e2e.stringToByteArray(this.userId);
  return goog.array.flatten(
      0xB4, // v4 User ID certifications must hash this constant first
      e2e.dwordArrayToByteArray([data.length]),
      data
  );
};


/**
 * @type {!e2e.debug.Console}
 * @private
 */
e2e.openpgp.packet.UserId.console_ =
    e2e.debug.Console.getConsole('e2e.openpgp.packet.UserId');

e2e.openpgp.packet.factory.add(e2e.openpgp.packet.UserId);
