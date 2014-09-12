// Copyright 2012 Google Inc. All Rights Reserved.
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
 * @fileoverview Represents a key packet (parent of public and private key).
 * @author evn@google.com (Eduardo Vela)
 */


goog.provide('e2e.openpgp.packet.Key');
goog.provide('e2e.openpgp.packet.Key.Usage');

goog.require('e2e');
goog.require('e2e.openpgp.EncryptedCipher');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.SerializationError');
goog.require('e2e.openpgp.error.SignatureError');
goog.require('e2e.openpgp.error.SignatureExpiredError');
goog.require('e2e.openpgp.packet.Packet');
goog.require('e2e.openpgp.packet.Signature');

goog.require('e2e.openpgp.packet.Signature.SignatureType');
/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.openpgp.types');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.crypt');



/**
 * A Key Packet that is the parent of SecretKey and PublicKey.
 * @param {number} version The version of the key. Should be 0x04.
 * @param {number} timestamp The creation time of the key.
 * @param {!e2e.cipher.Cipher|!e2e.signer.Signer} cipher An
 *     instance of the cipher used.
 * @param {!e2e.ByteArray=} opt_fingerprint The fingerprint of the key.
 * @param {!e2e.ByteArray=} opt_keyId The key ID of the key. Should be
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
     * @type {!e2e.ByteArray}
     */
    this.fingerprint = opt_fingerprint;

    if (version == 4) {  // V4 fingerprint specified at 12.2 in RFC.
      keyId = this.fingerprint.slice(-8);
    }
  }
  /**
   * If available, the key ID of the key.
   * @type {!e2e.ByteArray|undefined}
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
   * @type {!Array.<!e2e.openpgp.packet.Signature>}
   * @private
   */
  this.bindingSignatures_ = [];
  /**
   * @type {!Array.<!e2e.openpgp.packet.Signature>}
   * @private
   */
  this.revocations_ = [];
  /**
   * Usages of the key packet that have been certified in signatures.
   * @type {!Array.<!e2e.openpgp.packet.Key.Usage>}
   * @private
   */
  this.certifiedUsage_ = [];
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
 * Adds the key binding signature.
 * Caution! Signature is not verified, use verifySignatures() function to verify
 * the signature.
 * @param {!e2e.openpgp.packet.Signature} signature
 */
e2e.openpgp.packet.Key.prototype.addBindingSignature = function(signature) {
  if (signature.signatureType !==
      e2e.openpgp.packet.Signature.SignatureType.SUBKEY) {
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
          !goog.array.equals(crossSignature.getSignerKeyId(), this.keyId) ||
          crossSignature.signatureType !==
              e2e.openpgp.packet.Signature.SignatureType.PRIMARY_KEY) {
        throw new e2e.openpgp.error.ParseError('Invalid key cross-signature.');
      }
  }
  this.bindingSignatures_.push(signature);
};

/**
 * Returns key binding signatures.
 * @return {!Array.<!e2e.openpgp.packet.Signature>}
 */
e2e.openpgp.packet.Key.prototype.getBindingSignatures = function() {
  return this.bindingSignatures_;
};


/**
 * Checks if a key has valid (unrevoked) binding signature to a given key
 *     packet. This function will throw SignatureError if any signature
 *     verification fails.
 * @param {!e2e.openpgp.packet.Key} verifyingKey key packet that should
 *     verify the signatures
 * @return {boolean} True if key has valid binding.
 */
e2e.openpgp.packet.Key.prototype.verifySignatures = function(verifyingKey) {
  // Always process signatures to throw errors on any signature tampering.

  // There should be no valid revocation signatures.
  var isRevoked = false;
  goog.array.forEach(this.revocations_, function(signature) {
      if (this.verifyRevocation_(signature, verifyingKey)) {
        isRevoked = true;
      }
  }, this);
  var hasBinding = false;
  // Subkeys needs to have a binding signature. See RFC 4880 11.1.
  goog.array.forEach(this.bindingSignatures_, function(signature) {
    if (this.verifyBindingSignature_(signature, verifyingKey)) {
      hasBinding = true;
    }
  }, this);
  return (!isRevoked && (!this.isSubkey || hasBinding));
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
  this.revocations_.push(signature);
};


/**
 * Verifies key/subkey revocation signature.
 * @param {!e2e.openpgp.packet.Signature} signature Revocation signature
 * @param {!e2e.openpgp.packet.Key} verifyingKey key packet that should
 *     verify the signature
 * @return {boolean} True iff signature verified correctly.
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
 * @return {boolean} True iff signature verified correctly.
 * @private
 */
e2e.openpgp.packet.Key.prototype.verifyBindingSignature_ = function(signature,
    verifyingKey) {
  var result = this.verifySignatureInternal_(
      signature,
      verifyingKey,
      this.getKeyBindingSignatureData_(verifyingKey),
      'Binding signature verification failed.');
  if (result) {
    if (signature.attributes &&
        signature.attributes.hasOwnProperty('KEY_FLAGS')) {
      this.certifiedUsage_ = [];
      if (signature.attributes.KEY_FLAG_SIGN) {
        this.certifiedUsage_.push(e2e.openpgp.packet.Key.Usage.SIGN);
      }
      if (signature.attributes.KEY_FLAG_ENCRYPT_COMMUNICATION ||
          signature.attributes.KEY_FLAG_ENCRYPT_STORAGE) {
        this.certifiedUsage_.push(e2e.openpgp.packet.Key.Usage.ENCRYPT);
      }
    }
  }
  return result;
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
 * @return {boolean} True iff signature verified correctly.
 * @private
 */
e2e.openpgp.packet.Key.prototype.verifySignatureInternal_ = function(signature,
    verifyingKey, signedData, verificationErrorMsg) {
  if (!verifyingKey.keyId || !goog.array.equals(signature.getSignerKeyId(),
      verifyingKey.keyId)) {
    // Key mismatch, ignore signature.
    return false;
  }
  var signer = /** @type {!e2e.signer.Signer} */ (verifyingKey.cipher);
  try {
    var signatureVerified = signature.verify(signedData,
      goog.asserts.assertObject(signer));
  } catch (e) {
    // Ignore signatures that throw unsupported errors (e.g. weak hash
    // algorithms) or expired signatures.
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
 * @param {number} opt_keyFlags key usage flags to embed in the signature
 * @return {!e2e.async.Result.<undefined>}
 */
e2e.openpgp.packet.Key.prototype.bindTo = function(bindingKey, type,
    opt_keyFlags) {
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

  return sigRes.addCallback(function(sig) {
    this.bindingSignatures_.push(sig);
  }, this);
};


/** @override */
e2e.openpgp.packet.Key.prototype.serialize = function() {
  var serialized = goog.base(this, 'serialize');
  goog.array.forEach(
      this.revocations_.concat(this.bindingSignatures_),
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
  return false;
};


/**
 * Specifies whether the key packet has been certified for a specific use.
 * @param {e2e.openpgp.packet.Key.Usage} use Either 'sign' or 'encrypt'.
 * @return {boolean}
 */
e2e.openpgp.packet.Key.prototype.isCertifiedTo = function(use) {
  return goog.array.contains(this.certifiedUsage_, use);
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
