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
goog.require('e2e.openpgp.packet.Packet');
goog.require('e2e.openpgp.packet.Signature');
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
 * Verifies and adds the key binding signature.
 * @param {!e2e.openpgp.packet.Signature} signature
 * @param {!e2e.openpgp.packet.Key} verifyingKey key packet that should
 *     verify the signature.
 */
e2e.openpgp.packet.Key.prototype.addBindingSignature = function(signature,
    verifyingKey) {
  var signer = /** @type {!e2e.signer.Signer} */ (verifyingKey.cipher);
  var signedData = this.getKeyBindingSignatureData_(verifyingKey);
  if (signer instanceof e2e.openpgp.EncryptedCipher && signer.isLocked()) {
    // TODO(user): Fix that. Key is locked, so the hashed data will be wrong.
    this.bindingSignatures_.push(signature);
    return;
  }
  if (!signature.verify(signedData, goog.asserts.assertObject(signer))) {
    throw new e2e.openpgp.error.ParseError(
        'Binding signature verification failed.');
  }
  this.bindingSignatures_.push(signature);
};


/**
 * @param {!e2e.openpgp.packet.Signature} signature
 */
e2e.openpgp.packet.Key.prototype.addRevocation = function(signature) {
  // TODO(user): Verify the signature before adding it.
  this.revocations_.push(signature);
};


/**
 * Creates and attaches a SubKey Binding Signature, issued by the specified key
 *     packet.
 * @param {!e2e.openpgp.packet.SecretKey} bindingKey
 * @param {!e2e.openpgp.packet.Signature.SignatureType} type
 * @return {!e2e.async.Result.<undefined>}
 */
e2e.openpgp.packet.Key.prototype.bindTo = function(bindingKey, type) {
  var data = this.getKeyBindingSignatureData_(bindingKey.getPublicKeyPacket());

  var sigRes = e2e.openpgp.packet.Signature.construct(
      bindingKey,
      data,
      type,
      {
        'SIGNATURE_CREATION_TIME': e2e.dwordArrayToByteArray(
            [Math.floor(new Date().getTime() / 1e3)]),
        'ISSUER': bindingKey.keyId
      });
  return sigRes.addCallback(function(sig) {
    this.bindingSignatures_.push(sig);
  }, this);
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
      bindingKey.getBytesToSign(),
      this.getBytesToSign());
};


/** @override */
e2e.openpgp.packet.Key.prototype.serialize = function() {
  var serialized = goog.base(this, 'serialize');
  goog.array.forEach(
      this.bindingSignatures_.concat(this.revocations_),
      function(sig) {
        goog.array.extend(serialized, sig.serialize());
      });
  return serialized;
};


/**
 * Specifies whether the key packet can be used for a specific use.
 * @param {string} use Either 'sign' or 'encrypt'.
 * @return {boolean}
 */
e2e.openpgp.packet.Key.prototype.can = function(use) {
  return false;
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
