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
goog.require('e2e.openpgp.packet.Packet');
goog.require('e2e.openpgp.packet.Signature');


/**
 * A Key Packet that is the parent of SecretKey and PublicKey.
 * @param {number} version The version of the key. Should be 0x04.
 * @param {number} timestamp The creation time of the key.
 * @param {!e2e.cipher.Cipher|e2e.signer.Signer} cipher An
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
     * @type {e2e.ByteArray}
     */
    this.fingerprint = opt_fingerprint;

    if (version == 4) {  // V4 fingerprint specified at 12.2 in RFC.
      keyId = this.fingerprint.slice(-8);
    }
  }
  /**
   * If available, the key ID of the key.
   * @type {e2e.ByteArray|undefined}
   */
  this.keyId = keyId;
  /**
   * The timestamp of the creation of this public key.
   * @type {number}
   */
  this.timestamp = timestamp;
  /**
   * The cipher of this public key (RSA/DSA/etc..).
   * @type {!e2e.cipher.Cipher|e2e.signer.Signer}
   */
  this.cipher = cipher;
  /**
   * @type {Array.<e2e.openpgp.packet.Signature>}
   * @private
   */
  this.certifications_ = [];
  /**
   * @type {Array.<e2e.openpgp.packet.Signature>}
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
 * @return {e2e.openpgp.packet.PublicKey}
 */
e2e.openpgp.packet.Key.prototype.getPublicKeyPacket = goog.abstractMethod;


/**
 * @param {e2e.openpgp.packet.Signature} signature
 */
e2e.openpgp.packet.Key.prototype.addCertification = function(signature) {
  // TODO(evn): Verify the signature before adding it.
  this.certifications_.push(signature);
};


/**
 * @param {e2e.openpgp.packet.Signature} signature
 */
e2e.openpgp.packet.Key.prototype.addRevocation = function(signature) {
  // TODO(evn): Verify the signature before adding it.
  this.revocations_.push(signature);
};


/**
 * @param {e2e.openpgp.packet.SecretKey} key
 * @param {e2e.openpgp.packet.Signature.SignatureType} type
 */
e2e.openpgp.packet.Key.prototype.certifyBy = function(key, type) {
  var signingKeyData = key.getPublicKeyPacket().serializePacketBody();
  var signedKeyData = this.getPublicKeyPacket().serializePacketBody();
  if (signingKeyData.length > 0xFFFF || signedKeyData.length > 0xFFFF) {
    throw new Error();
  }
  var data = [];
  data = data.concat([0x99]);
  data = data.concat(
      e2e.dwordArrayToByteArray([signingKeyData.length]).slice(2));
  data = data.concat(signingKeyData);
  data = data.concat([0x99]);
  data = data.concat(
      e2e.dwordArrayToByteArray([signedKeyData.length]).slice(2));
  data = data.concat(signedKeyData);
  var sig = e2e.openpgp.packet.Signature.construct(
      key,
      data,
      type,
      {
        'SIGNATURE_CREATION_TIME': e2e.dwordArrayToByteArray(
          [Math.floor(new Date().getTime() / 1e3)]),
        'ISSUER': key.keyId
      });
  this.addCertification(sig);
};


/** @override */
e2e.openpgp.packet.Key.prototype.serialize = function() {
  var serialized = goog.base(this, 'serialize');
  goog.array.forEach(
    this.certifications_.concat(this.revocations_),
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
