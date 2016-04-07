/**
 * @license
 * Copyright 2012 Google Inc. All rights reserved.
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
 * @fileoverview Represents a key packet (parent of public and private key).
 * @author evn@google.com (Eduardo Vela)
 */


goog.provide('e2e.openpgp.packet.Key');
goog.provide('e2e.openpgp.packet.Key.Usage');

goog.require('e2e');
goog.require('e2e.ImmutableArray');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.factory');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.SerializationError');
goog.require('e2e.openpgp.error.SignatureError');
goog.require('e2e.openpgp.error.SignatureExpiredError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.packet.Packet');
goog.require('e2e.openpgp.packet.Signature');
/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.openpgp.types');
goog.require('e2e.signer.factory');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.DeferredList');
goog.require('goog.crypt');


/**
 * Verification state for certifications on this key.
 * @enum {boolean}
 * @private
 */
e2e.openpgp.packet.KeyCertificationState_ = {
  VERIFIED: true,
  UNVERIFIED: false
};



/**
 * A Key Packet that is the parent of SecretKey and PublicKey.
 * @param {number} version The version of the key. Should be 0x04.
 * @param {number} timestamp The creation time of the key.
 * @param {!e2e.cipher.Cipher|!e2e.signer.Signer} cipher An
 *     instance of the cipher used.
 * @param {!e2e.openpgp.KeyFingerprint=} opt_fingerprint The fingerprint of the
 *     key.
 * @param {!e2e.openpgp.KeyId=} opt_keyId The key ID of the key. Should be
 *     passed in for v3 keys, but not for v4 keys.
 * @extends {e2e.openpgp.packet.Packet}
 * @constructor
 */
e2e.openpgp.packet.Key = function(
    version, timestamp, cipher, opt_fingerprint, opt_keyId) {
  goog.base(this);
  /**
   * The version of the key.
   * @type {number}
   */
  this.version = version;

  var keyId;
  if (version == 3 || version == 2) {
    keyId = opt_keyId;
  }

  if (goog.isDefAndNotNull(opt_fingerprint)) {
    /**
     * The fingerprint of the key.
     * @type {!e2e.openpgp.KeyFingerprint}
     */
    this.fingerprint = opt_fingerprint;

    if (version == 4) {  // V4 fingerprint specified at 12.2 in RFC.
      keyId = this.fingerprint.slice(-8);
    }
  }
  /**
   * If available, the key ID of the key.
   * @type {!e2e.openpgp.KeyId|undefined}
   */
  this.keyId = keyId;
  /**
   * The timestamp of the creation of this public key.
   * @type {number}
   */
  this.timestamp = timestamp;
  /**
   * The cipher of this public key (RSA/DSA/etc..).
   * @type {!e2e.cipher.Cipher|!e2e.signer.Signer}
   */
  this.cipher = cipher;
  /**
   * @type {!e2e.ImmutableArray.<!e2e.openpgp.packet.Signature,
   *     e2e.openpgp.packet.KeyCertificationState_>}
   * @private
   */
  this.bindingSignatures_ = new e2e.ImmutableArray([]);
  /**
   * @type {!e2e.ImmutableArray.<!e2e.openpgp.packet.Signature,
   *     e2e.openpgp.packet.KeyCertificationState_>}
   * @private
   */
  this.revocations_ = new e2e.ImmutableArray([]);
};
goog.inherits(e2e.openpgp.packet.Key,
              e2e.openpgp.packet.Packet);


/**
 * @enum {string} Key usage.
 */
e2e.openpgp.packet.Key.Usage = {
  'ENCRYPT': 'encrypt',
  'SIGN': 'sign'
};


/**
 * @return {!e2e.openpgp.packet.PublicKey}
 */
e2e.openpgp.packet.Key.prototype.getPublicKeyPacket = goog.abstractMethod;


/**
 * True iff key is a subkey. Used to implement common key logic in this class
 * without introducing circular dependencies.
 * @type {boolean}
 */
e2e.openpgp.packet.Key.prototype.isSubkey = false;


/**
 * Adds the key binding signature. Only possible for subkeys.
 * Caution! Signature is not verified, use verifySignatures() function to verify
 * the signature.
 * @param {!e2e.openpgp.packet.Signature} signature
 */
e2e.openpgp.packet.Key.prototype.addBindingSignature = function(signature) {
  if (!this.isSubkey ||
      (signature.signatureType !==
      e2e.openpgp.packet.Signature.SignatureType.SUBKEY)) {
    throw new e2e.openpgp.error.ParseError(
        'Invalid binding signature type.');
  }
  if (Boolean(signature.attributes && signature.attributes.KEY_FLAG_SIGN)) {
    // RFC 4880 5.2.1.
    // A signature that binds a signing subkey MUST have
    // an Embedded Signature subpacket in this binding signature that
    // contains a 0x19 signature made by the signing subkey on the
    // primary key and subkey.
    if (!signature.embeddedSignature) {
      throw new e2e.openpgp.error.ParseError(
          'Missing required key cross-signature.');
    }
    var crossSignature = signature.embeddedSignature;
    if (!this.keyId ||
        !e2e.compareByteArray(crossSignature.getSignerKeyId(), this.keyId) ||
        crossSignature.signatureType !==
        e2e.openpgp.packet.Signature.SignatureType.PRIMARY_KEY) {
      throw new e2e.openpgp.error.ParseError('Invalid key cross-signature.');
    }
  }
  this.bindingSignatures_ = e2e.ImmutableArray.pushCopy(
      this.bindingSignatures_, signature);
};


/**
 * Checks if a key has a valid (unrevoked) binding signature to a given
 * key packet. The provided key must be the top-level key if this is a
 * subkey, otherwise it must be the key itself. This function will
 * throw SignatureError if any signature verification fails.
 * @param {!e2e.openpgp.packet.Key} verifyingKey key packet that should
 *     verify the signatures
 * @return {!e2e.async.Result<boolean>} True if key has valid binding.
 */
e2e.openpgp.packet.Key.prototype.verifySignatures = function(verifyingKey) {
  // Always process signatures to throw errors on any signature tampering.

  var verifyingKeyId = verifyingKey.keyId;
  if (!verifyingKeyId || !this.keyId) {
    // Reject check on keys with no keyids.
    return e2e.async.Result.toResult(false);
  }

  // Ensure we're passed a toplevel key.
  if (verifyingKey.isSubkey) {
    return e2e.async.Result.toError(new e2e.openpgp.error.SignatureError(
        'Cannot verify key signatures with a subkey.'));
  }

  // If we're a primary key, we can only be verified by ourselves.
  if (!this.isSubkey &&
      !e2e.compareByteArray(this.keyId, verifyingKeyId)) {
    return e2e.async.Result.toError(new e2e.openpgp.error.SignatureError(
        'Cannot verify primary key with a different key.'));
  }

  /** @type {!Array<!e2e.async.Result<boolean>>} */
  var pendingVerifies = [];
  e2e.ImmutableArray.forEach(this.revocations_, function(signature) {
    pendingVerifies.push(this.verifyRevocation_(signature, verifyingKey));
  }, this);

  var result = new e2e.async.Result();
  goog.async.DeferredList.gatherResults(pendingVerifies)
      .addCallback(function(verifiedRevocations) {
        if (goog.array.contains(verifiedRevocations, true)) {
          // There should be no valid revocation signatures.
          return false;
        }

        // There are no valid revocation signatures, remove everything from
        // our revocation array, and mark it as verified.
        this.revocations_ = new e2e.ImmutableArray(
            [], e2e.openpgp.packet.KeyCertificationState_.VERIFIED);

        // Checks for a primary key are now complete.
        if (!this.isSubkey) {
          // We never add binding signatures to primary keys, so assert it.
          e2e.assert(this.bindingSignatures_.size() == 0);
          // Also mark binding array as verified.
          this.bindingSignatures_ = new e2e.ImmutableArray(
              [], e2e.openpgp.packet.KeyCertificationState_.VERIFIED);
          return true;
        }

        // Subkeys must have a binding signature. See RFC 4880 11.1.
        // If we have multiple valid binding signatures, use the most recent
        // one.
        return this.findNewestBindingSignature_(verifyingKey)
            .addCallback(function(newestSignature) {
              if (goog.isNull(newestSignature)) {
                return false;
              }
              // Mark our binding array as being verified, and remove all
              // elements from it except for the newest signature.
              this.bindingSignatures_ =
                  new e2e.ImmutableArray([newestSignature],
                      e2e.openpgp.packet.KeyCertificationState_.VERIFIED);
              return true;
            }, this);
      }, this).addCallback(result.callback, result)
      .addErrback(result.errback, result);
  return result;
};


/**
 * Finds the newest valid binding signature on this key made by the
 * verifyingKey, or null if none exists.
 * @param {!e2e.openpgp.packet.Key} verifyingKey
 * @return {!e2e.async.Result<?e2e.openpgp.packet.Signature>}
 * @private
 */
e2e.openpgp.packet.Key.prototype.findNewestBindingSignature_ = function(
    verifyingKey) {
  /** @type {!Array<!e2e.async.Result<?e2e.openpgp.packet.Signature>>} */
  var pendingVerifies = [];
  e2e.ImmutableArray.forEach(this.bindingSignatures_, function(signature) {
    pendingVerifies.push(this.verifyBindingSignature_(signature, verifyingKey)
        .addCallback(function(verified) {
          return verified ? signature : null;
        }));
  }, this);
  /** @type {!e2e.async.Result<?e2e.openpgp.packet.Signature>} */
  var result = new e2e.async.Result();
  goog.async.DeferredList.gatherResults(pendingVerifies)
      .addCallback(function(verifiedSignatures) {
        /** @type {?e2e.openpgp.packet.Signature} */
        var latestSignature = null;
        var latestSignatureTime = -1;
        verifiedSignatures.forEach(function(signature) {
          // Check if we need to update the most recent signature.
          if (signature && signature.creationTime >= latestSignatureTime) {
            latestSignature = signature;
            latestSignatureTime = signature.creationTime;
          }
        });
        result.callback(latestSignature);
      }).addErrback(result.errback, result);
  return result;
};


/**
 * Adds the key/subkey revocation signature.
 * Caution! Signature is not verified, use verifySignatures() function to verify
 * the signature.
 * @param {!e2e.openpgp.packet.Signature} signature Revocation signature
 */
e2e.openpgp.packet.Key.prototype.addRevocation = function(signature) {
  if (signature.signatureType !== (this.isSubkey ?
      e2e.openpgp.packet.Signature.SignatureType.SUBKEY_REVOCATION :
      e2e.openpgp.packet.Signature.SignatureType.KEY_REVOCATION)) {
    throw new e2e.openpgp.error.ParseError(
        'Invalid revocation signature type.');
  }
  this.revocations_ = e2e.ImmutableArray.pushCopy(this.revocations_, signature);
};


/**
 * Verifies key/subkey revocation signature.
 * @param {!e2e.openpgp.packet.Signature} signature Revocation signature
 * @param {!e2e.openpgp.packet.Key} verifyingKey key packet that should
 *     verify the signature
 * @return {!e2e.async.Result<boolean>} True iff signature verified correctly.
 * @private
 */
e2e.openpgp.packet.Key.prototype.verifyRevocation_ = function(signature,
    verifyingKey) {
  if (this.isSubkey) {
    return this.verifySignatureInternal_(
        signature,
        verifyingKey,
        this.getKeyBindingSignatureData_(verifyingKey),
        'Subkey revocation signature verification failed.');
  } else {
    return this.verifySignatureInternal_(
        signature,
        verifyingKey,
        this.getPublicKeyPacket().getBytesToSign(),
        'Key revocation signature verification failed.');
  }
};


/**
 * Verifies subkey binding signature.
 * @param {!e2e.openpgp.packet.Signature} signature Subkey binding signature
 * @param {!e2e.openpgp.packet.Key} verifyingKey key packet that should
 *     verify the signature
 * @return {!e2e.async.Result<boolean>} True iff signature verified correctly.
 * @private
 */
e2e.openpgp.packet.Key.prototype.verifyBindingSignature_ = function(signature,
    verifyingKey) {
  return this.verifySignatureInternal_(
      signature,
      verifyingKey,
      this.getKeyBindingSignatureData_(verifyingKey),
      'Binding signature verification failed.');
};


/**
 * Verifies the signature, throwing error when verification fails or if
 *     signature is not of expected type.
 * @param {!e2e.openpgp.packet.Signature} signature Revocation signature
 * @param {!e2e.openpgp.packet.Key} verifyingKey key packet that should
 *     verify the signature
 * @param {!e2e.ByteArray} signedData data that was signed.
 * @param {string} verificationErrorMsg error message when signature did not
 *     verify.
 * @return {!e2e.async.Result<boolean>} True iff signature verified correctly.
 * @private
 */
e2e.openpgp.packet.Key.prototype.verifySignatureInternal_ = function(signature,
    verifyingKey, signedData, verificationErrorMsg) {
  if (!verifyingKey.keyId || !e2e.compareByteArray(signature.getSignerKeyId(),
      verifyingKey.keyId)) {
    // Key mismatch, ignore signature.
    return e2e.async.Result.toResult(false);
  }
  var signer = /** @type {!e2e.signer.Signer} */ (verifyingKey.cipher);
  return signature.verify(signedData,
      goog.asserts.assertObject(signer)).addCallback(function(verified) {
    if (!verified) {
      throw new e2e.openpgp.error.SignatureError(verificationErrorMsg);
    }
    // Process embedded signature
    if (this.isSubkey &&
        signature.attributes &&
        signature.attributes.KEY_FLAG_SIGN &&
        signature.signatureType ===
            e2e.openpgp.packet.Signature.SignatureType.SUBKEY) {
      if (!signature.embeddedSignature) {
        throw new e2e.openpgp.error.SignatureError(
            'Missing cross-signature for a signing subkey.');
      }
      if (signature.embeddedSignature.signatureType !==
          e2e.openpgp.packet.Signature.SignatureType.PRIMARY_KEY) {
        throw new e2e.openpgp.error.SignatureError(
            'Invalid cross-signature type.');
      }
      return this.verifySignatureInternal_(
          signature.embeddedSignature,
          this.getPublicKeyPacket(),
          signedData,
          'Cross-signature verification failed.');
    }
    return true;
  }, this).addErrback(function(e) {
    // Ignore signatures that throw unsupported errors (e.g. weak hash
    // algorithms) or expired signatures.
    if (e instanceof e2e.openpgp.error.UnsupportedError) {
      return false;
    } else if (e instanceof e2e.openpgp.error.SignatureExpiredError) {
      return false;
    }
    throw e;
  });
};


/**
 * Returns data for creating a subkey binding signature between this (bound key)
 *     and a given binding key.
 * @param  {!e2e.openpgp.packet.Key} bindingKey Key to bind to
 * @return {!e2e.ByteArray} Signature data.
 * @private
 */
e2e.openpgp.packet.Key.prototype.getKeyBindingSignatureData_ = function(
    bindingKey) {
  return goog.array.flatten(
      bindingKey.getPublicKeyPacket().getBytesToSign(),
      this.getPublicKeyPacket().getBytesToSign());
};


/**
 * Creates and attaches a SubKey Binding Signature, issued by the specified key
 *     packet.
 * @param {!e2e.openpgp.packet.SecretKey} bindingKey
 * @param {!e2e.openpgp.packet.Signature.SignatureType} type
 * @param {number=} opt_keyFlags key usage flags to embed in the signature
 * @return {!e2e.async.Result.<undefined>}
 */
e2e.openpgp.packet.Key.prototype.bindTo = function(bindingKey, type,
    opt_keyFlags) {
  // Check that we're a subkey, and that the provided key is a
  // top-level key.
  if (!this.isSubkey || bindingKey.isSubkey) {
    throw new e2e.openpgp.error.SignatureError(
        'Subkeys must be bound by top-level keys.');
  }
  var data = this.getKeyBindingSignatureData_(bindingKey);
  var attributes = {
    'SIGNATURE_CREATION_TIME': e2e.dwordArrayToByteArray(
        [Math.floor(new Date().getTime() / 1e3)]),
    'ISSUER': bindingKey.keyId
  };
  if (goog.isDef(opt_keyFlags)) {
    attributes.KEY_FLAGS = [opt_keyFlags];
  }
  var sigRes = e2e.openpgp.packet.Signature.construct(
      bindingKey,
      data,
      type,
      attributes);

  var bindingPublicKey = bindingKey.getPublicKeyPacket();
  return sigRes.addCallback(function(sig) {
    // This newly minted signature should become the latest bound
    // certification on this key. We check this by explicitly
    // verifying the newly created signature.
    this.addBindingSignature(sig);
    return this.verifySignatures(bindingPublicKey)
        .addCallback(function(isVerified) {
          if (!isVerified) {
            throw new e2e.openpgp.error.SignatureError(
               'Unexpected - newly bound signature could not be verified.');
          }
          if (sig != this.getVerifiedCertification_(bindingPublicKey)) {
            throw new e2e.openpgp.error.SignatureError(
               'Unexpected - newly bound signature was not the latest.');
          }
        }, this);
  }, this);
};


/** @override */
e2e.openpgp.packet.Key.prototype.serialize = function() {
  var serialized = goog.base(this, 'serialize');
  e2e.ImmutableArray.forEach(
      e2e.ImmutableArray.concat(this.revocations_, this.bindingSignatures_),
      function(sig) {
        goog.array.extend(serialized, sig.serialize());
      });
  return serialized;
};


/**
 * Specifies whether the key packet can be used for a specific use.
 * It only takes the cipher capabilities into consideration. In order to check
 * whether the key owner wants the key to be used in a certain way, call
 * isCertifiedTo().
 * @param {e2e.openpgp.packet.Key.Usage} use Either 'sign' or 'encrypt'.
 * @return {boolean}
 */
e2e.openpgp.packet.Key.prototype.can = function(use) {
  if (use == e2e.openpgp.packet.Key.Usage.ENCRYPT) {
    return e2e.cipher.factory.has(
        /** @type {e2e.cipher.Algorithm} */ (this.cipher.algorithm));
  } else if (use == e2e.openpgp.packet.Key.Usage.SIGN) {
    return e2e.signer.factory.has(
        /** @type {e2e.signer.Algorithm} */ (this.cipher.algorithm));
  } else {
    return false;
  }
};


/**
 * Specifies whether the key packet has been certified for a specific use.
 * Can only ask this question of a subkey.
 * This information is obtained from the KEY_FLAGS property of
 * its certification signature. If the signature contains no KEY_FLAGS
 * at all, the subkey is considered to be certified for all uses.
 * @param {!e2e.openpgp.packet.Key} verifyingKey the main key that originally
 *     certified this key.
 * @param {!e2e.openpgp.packet.Key.Usage} use Either 'sign' or 'encrypt'.
 * @return {boolean}
 */
e2e.openpgp.packet.Key.prototype.isCertifiedTo = function(verifyingKey, use) {
  var sig = this.getVerifiedCertification_(verifyingKey);

  // If the signature has no KEY_FLAGS property at all, the key
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
 * The timestamp of the (valid) binding signature for this subkey. If
 * the key was never certified (through verifySignatures()) this
 * method will throw an exception. The key to be passed in is the
 * toplevel key -- used as a check to ensure that the certified
 * signature was in fact issued by that key.
 * @param {!e2e.openpgp.packet.Key} verifyingKey is the main key that
 *     originally certified this key.
 * @return {number} timestamp
 */
e2e.openpgp.packet.Key.prototype.getCertifiedTime = function(verifyingKey) {
  var sig = this.getVerifiedCertification_(verifyingKey);
  return sig.creationTime;
};


/**
 * Converts a key packet to KeyPacketInfo.
 * @return {!e2e.openpgp.KeyPacketInfo}
 */
e2e.openpgp.packet.Key.prototype.toKeyPacketInfo = function() {
  return {
    /** @suppress {missingRequire} Only used for an instanceof check. */
    secret: this instanceof e2e.openpgp.packet.SecretKey,
    fingerprint: this.fingerprint,
    fingerprintHex: this.getFingerprintHex_(),
    algorithm: this.cipher.algorithm
  };
};


/**
 * Return a previously verified certification, or raise an exception
 * if none were found. This method only makes sense for a subkey.
 * @param {!e2e.openpgp.packet.Key} verifyingKey the main key that
 *     certified this key.
 * @return {!e2e.openpgp.packet.Signature}
 * @private
 */
e2e.openpgp.packet.Key.prototype.getVerifiedCertification_ = function(
    verifyingKey) {
  if (!this.isSubkey) {
    throw new e2e.openpgp.error.SignatureError(
        'Cannot directly certify a primary key.');
  }

  // 1. Check that both the revocation and binding arrays are marked
  // as verified.
  if ((this.revocations_.getState() !==
      e2e.openpgp.packet.KeyCertificationState_.VERIFIED) ||
      (this.bindingSignatures_.getState() !==
      e2e.openpgp.packet.KeyCertificationState_.VERIFIED)) {
    throw new e2e.openpgp.error.SignatureError('This key is not certified.');
  }

  // 2. Sanity check - revocations array must be empty, and there should
  // be exactly one element in bindingSignatures.
  e2e.assert(this.revocations_.size() === 0);
  e2e.assert(this.bindingSignatures_.size() === 1);

  // signature should never be undefined, and this check also convinces
  // closure that signature is defined.
  var signature = goog.asserts.assertObject(this.bindingSignatures_.get(0));

  // 3. Binding signature must be made by the verifyingKey
  if (!verifyingKey.keyId ||
      !e2e.compareByteArray(verifyingKey.keyId, signature.getSignerKeyId())) {
    throw new e2e.openpgp.error.SignatureError(
        'This key was certified by a different issuer.');
  }
  return signature;
};


/**
 * Returns human-readable key fingerprint formatted as a hexadecimal string,
 * with spaces separating each 4 hex digits, and 5 digit blocks.
 * @return {string}
 * @private
 */
e2e.openpgp.packet.Key.prototype.getFingerprintHex_ = function() {
  var hex = goog.crypt.byteArrayToHex(this.fingerprint).toUpperCase();
  hex = hex.replace(/([0-9A-F]{4})/g, '$1 '); // Group by 4 digits.
  hex = hex.replace(/(([0-9A-F]{4} ){5})/g, '$1 '); // Space after 5 groups.
  return hex.trim();
};


/**
 * Gets a byte array representing the key data to create the signature over.
 * See RFC 4880 5.2.4 for details.
 * @return {!e2e.ByteArray} The serialization of the key packet.
 */
e2e.openpgp.packet.Key.prototype.getBytesToSign = function() {
  var serialized = this.serializePacketBody(); // goog.base(this, 'serialize');
  if (serialized.length > 0xFFFF) {
    throw new e2e.openpgp.error.SerializationError(
        'Key packet length is too big.');
  }
  var length = e2e.dwordArrayToByteArray(
      [serialized.length]).slice(2);
  return goog.array.flatten(
      0x99,
      length,
      serialized
  );
};
