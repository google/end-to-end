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
 * @fileoverview Definition of a signature packet.
 */

goog.provide('e2e.openpgp.packet.Signature');
goog.provide('e2e.openpgp.packet.Signature.SignatureType');

goog.require('e2e');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.openpgp.MPI');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.constants.Type');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.SerializationError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.packet.OnePassSignature');
goog.require('e2e.openpgp.packet.Packet');
goog.require('e2e.openpgp.packet.SignatureSub');
goog.require('e2e.openpgp.packet.factory');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.Signer');


/**
 * A Signature Packet (Tag 2) RFC 4880 Section 5.2.
 * @param {number} version The version of the signature packet.
 * @param {e2e.openpgp.packet.Signature.SignatureType} signatureType
 *     The signature type.
 * @param {e2e.signer.Algorithm} pubKeyAlgorithm The public key
 *     algorithm.
 * @param {e2e.hash.Algorithm} hashAlgorithm The hash algorithm.
 * @param {e2e.signer.signature.Signature} signature The signature.
 * @param {e2e.ByteArray} leftTwoBytes The left two bytes of the hash.
 * @param {Array.<e2e.openpgp.packet.SignatureSub>=} opt_hashedSubpackets
 *     The hashed subpackets of the signature.
 * @param {Array.<e2e.openpgp.packet.SignatureSub>=} opt_unhashedSubpackets
 *     The non hashed subpackets of the signature.
 * @param {e2e.ByteArray=} opt_signerKeyId The key id of the signer.
 * @param {number=} opt_creationTime The time the signature was created.
 * @constructor
 * @extends {e2e.openpgp.packet.Packet}
 */
e2e.openpgp.packet.Signature = function(
    version, signatureType,
    pubKeyAlgorithm, hashAlgorithm,
    signature, leftTwoBytes,
    opt_hashedSubpackets, opt_unhashedSubpackets,
    opt_signerKeyId, opt_creationTime) {
  goog.base(this);
  if (version == 0x04) {
    /**
     * Hashed signature subpackets.
     * @type {Array.<e2e.openpgp.packet.SignatureSub>}
     */
    this.hashedSubpackets = opt_hashedSubpackets || [];
    /**
     * @type {Object.<string, number|e2e.ByteArray>}
     */
    this.attributes = {};
    goog.array.forEach(this.hashedSubpackets, function(subpacket) {
      e2e.openpgp.packet.SignatureSub.populateAttribute(
        this.attributes, subpacket, false);
    }, this);
    /**
     * Non hashed signature subpackets.
     * @type {Array.<e2e.openpgp.packet.SignatureSub>}
     */
    this.unhashedSubpackets = opt_unhashedSubpackets || [];
    /**
     * @type {Object.<string, number|e2e.ByteArray>}
     */
    this.untrustedAttributes = {};
    goog.array.forEach(this.unhashedSubpackets, function(subpacket) {
      e2e.openpgp.packet.SignatureSub.populateAttribute(
        this.untrustedAttributes, subpacket, false);
    }, this);
  } else if (version == 0x03 || version == 0x02) {
    if (!goog.isDef(opt_signerKeyId) ||
        !goog.isDef(opt_creationTime)) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Missing key data.');
    }
    /**
     * ID of the key that generated this signature..
     * @type {e2e.ByteArray}
     */
    this.signerKeyId = opt_signerKeyId;
    /**
     * Creation time of the signature.
     * @type {number}
     */
    this.creationTime = opt_creationTime;
  } else {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Invalid Signature Packet version.');
  }
  /**
   * Version of this signature.
   * @type {number}
   */
  this.version = version;
  /**
   * Type of the signature.
   * @type {e2e.openpgp.packet.Signature.SignatureType}
   */
  this.signatureType = signatureType;
  /**
   * Public key algorithm used in this signature.
   * @type {e2e.signer.Algorithm}
   */
  this.pubKeyAlgorithm = pubKeyAlgorithm;
  /**
   * Hash algorithm used in this signature.
   * @type {e2e.hash.Algorithm}
   */
  this.hashAlgorithm = hashAlgorithm;
  /**
   * Signature data.
   * @type {e2e.signer.signature.Signature}
   */
  this.signature = signature;
  /**
   * Left Two Bytes of hash.
   * @type {e2e.ByteArray}
   */
  this.leftTwoBytes = leftTwoBytes;
};
goog.inherits(e2e.openpgp.packet.Signature,
              e2e.openpgp.packet.Packet);


/** @inheritDoc */
e2e.openpgp.packet.Signature.prototype.tag = 2;


/** @inheritDoc */
e2e.openpgp.packet.Signature.prototype.serializePacketBody =
    function() {
  var serialized = [];
  serialized.push(this.version);
  if (this.version == 0x03 || this.version == 0x02) {
    goog.array.extend(
        serialized,
        0x05, // Length of metadata.
        this.signatureType,
        e2e.dwordArrayToByteArray([this.creationTime]),
        this.signerKeyId,
        e2e.openpgp.constants.getId(this.pubKeyAlgorithm),
        e2e.openpgp.constants.getId(this.hashAlgorithm),
        this.leftTwoBytes);
  } else if (this.version == 0x04) {
    goog.array.extend(
        serialized,
        this.signatureType,
        e2e.openpgp.constants.getId(this.pubKeyAlgorithm),
        e2e.openpgp.constants.getId(this.hashAlgorithm),
        this.serializeHashedSubpackets(),
        this.serializeUnhashedSubpackets(),
        this.leftTwoBytes);
  } else {
    throw new e2e.openpgp.error.SerializationError('Invalid version.');
  }
  var sig = this.signature;
  switch (this.pubKeyAlgorithm) {
    case e2e.cipher.Algorithm.RSA:
      goog.array.extend(serialized,
          (new e2e.openpgp.MPI(sig['s'])).serialize());
      break;
    case e2e.signer.Algorithm.ECDSA:
    case e2e.signer.Algorithm.DSA:
      goog.array.extend(serialized,
          (new e2e.openpgp.MPI(sig['r'])).serialize(),
          (new e2e.openpgp.MPI(sig['s'])).serialize());
      break;
    default:
      throw new e2e.openpgp.error.UnsupportedError(
          'Unsupported algorithm for signature verification.');
  }
  return serialized;
};


/**
 * @return {e2e.ByteArray} The serialized subpackets.
 */
e2e.openpgp.packet.Signature.prototype.serializeHashedSubpackets =
    function() {
  return e2e.openpgp.packet.Signature.serializeSubpackets(
      this.hashedSubpackets);
};


/**
 * @return {e2e.ByteArray} The serialized subpackets.
 */
e2e.openpgp.packet.Signature.prototype.serializeUnhashedSubpackets =
    function() {
  return e2e.openpgp.packet.Signature.serializeSubpackets(
      this.unhashedSubpackets);
};


/**
 * Returns hash algorithm used in the signature.
 * @return {e2e.hash.Algorithm} Hash algorithm
 */
e2e.openpgp.packet.Signature.prototype.getHashAlgorithm = function() {
  return this.hashAlgorithm;
};


/** @inheritDoc */
e2e.openpgp.packet.Signature.parse = function(data) {
  var version = data.shift();
  if (version == 0x03 || version == 0x02) {
    var hashedMaterialLength = data.shift();
    if (hashedMaterialLength != 0x05) {
      throw new e2e.openpgp.error.ParseError('Invalid material length.');
    }
    var signatureType =
        /** @type {e2e.openpgp.packet.Signature.SignatureType} */(
            data.shift());
    var creationTime = e2e.byteArrayToDwordArray(data.splice(0, 4))[0];
    var signerKeyId = data.splice(0, 8);
    var pubKeyAlgorithm = /** @type {e2e.cipher.Algorithm} */ (
        e2e.openpgp.constants.getAlgorithm(
          e2e.openpgp.constants.Type.PUBLIC_KEY, data.shift()));
    var hashAlgorithm = /** @type {e2e.hash.Algorithm} */ (
        e2e.openpgp.constants.getAlgorithm(
          e2e.openpgp.constants.Type.HASH, data.shift()));
  } else if (version == 0x04) {
    var signatureType =
        /** @type {e2e.openpgp.packet.Signature.SignatureType} */(
            data.shift());
    var pubKeyAlgorithm = /** @type {e2e.signer.Algorithm} */ (
        e2e.openpgp.constants.getAlgorithm(
            e2e.openpgp.constants.Type.PUBLIC_KEY, data.shift()));
    var hashAlgorithm = /** @type {e2e.hash.Algorithm} */ (
        e2e.openpgp.constants.getAlgorithm(
          e2e.openpgp.constants.Type.HASH, data.shift()));
    var hashedSubpacketLength = e2e.byteArrayToWord(
        data.splice(0, 2));
    var hashedSubpackets = e2e.openpgp.packet.SignatureSub.parse(
        data.splice(0, hashedSubpacketLength));
    var unhashedSubpacketLength = e2e.byteArrayToWord(
        data.splice(0, 2));
    var unhashedSubpackets = e2e.openpgp.packet.SignatureSub.parse(
        data.splice(0, unhashedSubpacketLength));
  } else {
    throw new e2e.openpgp.error.UnsupportedError(
        'Unsupported signature packet version:' + version);
  }
  var leftTwoBytes = data.splice(0, 2);
  var signature = {
    's': []
  };
  switch (pubKeyAlgorithm) {
      case e2e.signer.Algorithm.RSA:
        signature['s'] = e2e.openpgp.MPI.parse(data);
        break;
      case e2e.signer.Algorithm.DSA:
      case e2e.signer.Algorithm.ECDSA:
        signature['r'] = e2e.openpgp.MPI.parse(data);
        signature['s'] = e2e.openpgp.MPI.parse(data);
        break;
      default:
        throw new e2e.openpgp.error.UnsupportedError(
            'Unsupported algorithm for signature verification.');
  }
  return new e2e.openpgp.packet.Signature(
      version, signatureType,
      pubKeyAlgorithm, hashAlgorithm,
      signature, leftTwoBytes,
      hashedSubpackets, unhashedSubpackets,
      signerKeyId, creationTime);
};


/**
 * Extracts key ID used to place the signature directly from the packet
 *     (for version 3 packets) or from subpackets (for version 4 packets).
 * @return {e2e.ByteArray} signer key ID
 */
e2e.openpgp.packet.Signature.prototype.getSignerKeyId = function() {
  if (this.version == 0x03 || this.version == 0x02) {
    return this.signerKeyId;
  }
  if (this.version == 0x04) {
    if (this.attributes.hasOwnProperty('ISSUER')) {
      return /** @type e2e.ByteArray */ (this.attributes['ISSUER']);
    }
    if (this.untrustedAttributes.hasOwnProperty('ISSUER')) {
      // GnuPG puts Key ID in unhashed subpacket.
      return /** @type e2e.ByteArray */ (
        this.untrustedAttributes['ISSUER']);
    }
  }
  return e2e.openpgp.constants.EMPTY_KEY_ID;
};


/**
 * Creates OnePassSignature packet with data consistent with this packet.
 * @param {boolean=} opt_nested Should the OnePassSignature be nested
 *     (false by default).
 * @return {e2e.openpgp.packet.OnePassSignature} created signature packet
 */
e2e.openpgp.packet.Signature.prototype.constructOnePassSignaturePacket =
  function(opt_nested) {
  return new e2e.openpgp.packet.OnePassSignature(
    3, // Only version 3 packets exist according to RFC 4880.
    this.signatureType,
    e2e.openpgp.constants.getId(this.hashAlgorithm),
    e2e.openpgp.constants.getId(this.pubKeyAlgorithm),
    this.getSignerKeyId(),
    Boolean(opt_nested));
};


/**
 * Verifies that a key pair actually signed the specified data.
 * @param {Array.<number> | Uint8Array } data The signed data.
 * @param {e2e.signer.Signer} signer Signer with the public key that
 *     signed the data.
 * @param {string} opt_hashAlgo message digest algorithm declared in the message
 * @return {boolean} True if the signature correctly verifies.
 */
e2e.openpgp.packet.Signature.prototype.verify = function(data, signer,
    opt_hashAlgo) {
  if (this.pubKeyAlgorithm != signer.algorithm) {
    return false;
  }
  if (goog.isDef(opt_hashAlgo) && opt_hashAlgo !== signer.getHash().algorithm) {
    // different hash algorithm
    return false;
  }
  if (this.version != 0x04) {
    throw new e2e.openpgp.error.UnsupportedError(
        'Verification of old signature packets is not implemented.');
  }
  return e2e.async.Result.getValue(
      signer.verify(e2e.openpgp.packet.Signature.getDataToHash(
          data,
          this.signatureType,
          this.pubKeyAlgorithm, this.hashAlgorithm,
          this.hashedSubpackets),
      /** @type e2e.signer.signature.Signature */ (this.signature)));
};


/**
 * Signs the data and creates a signature packet.
 * @param {e2e.openpgp.packet.SecretKey} key Key to sign with.
 * @param {e2e.ByteArray} data Data to sign.
 * @param {e2e.openpgp.packet.Signature.SignatureType} signatureType
 * @param {Object.<string, number|e2e.ByteArray>=} opt_attributes
 *     The signature attributes.
 * @param {Object.<string, number|e2e.ByteArray>=}
 *     opt_untrustedAttributes The signature untrusted attributes.
 * @return {e2e.openpgp.packet.Signature} The signature packet.
 */
e2e.openpgp.packet.Signature.construct = function(
    key, data, signatureType, opt_attributes, opt_untrustedAttributes) {
  // Described in RFC4880 section 5.2.4.
  var hashedSubpackets = opt_attributes ?
      e2e.openpgp.packet.SignatureSub.construct(opt_attributes) : [];
  var unhashedSubpackets = opt_untrustedAttributes ?
      e2e.openpgp.packet.SignatureSub.construct(opt_untrustedAttributes) :
      [];
  var signer = /** @type {e2e.signer.Signer} */ (key.cipher);
  var plaintext = e2e.openpgp.packet.Signature.getDataToHash(
      data,
      signatureType,
      /** @type {e2e.signer.Algorithm} */ (signer.algorithm),
      signer.getHash().algorithm,
      hashedSubpackets);
  var signature = e2e.async.Result.getValue(signer.sign(plaintext));
  return new e2e.openpgp.packet.Signature(
      4, // version
      signatureType,
      /** @type {e2e.signer.Algorithm} */ (signer.algorithm),
      signer.getHash().algorithm,
      signature,
      signature['hashValue'].slice(0, 2),
      hashedSubpackets,
      unhashedSubpackets);
};


/**
 * Canonicalizes data by converting all line endings to <CR><LF>.
 * @param {string} data The text to canonicalize.
 * @return {string} The canonicalized text.
 */
e2e.openpgp.packet.Signature.convertNewlines = function(data) {
  return data.replace(/(\r\n|\r|\n)/g, '\r\n');
};


/**
 * Returns the data that has to be hashed for the signature algorithm.
 * @param {e2e.ByteArray|Uint8Array} data The data that was signed.
 * @param {e2e.openpgp.packet.Signature.SignatureType} signatureType
 *     The signature type.
 * @param {e2e.signer.Algorithm} pubKeyAlgorithm The public key
 *     algorithm.
 * @param {e2e.hash.Algorithm} hashAlgorithm The hash algorithm.
 * @param {Array.<e2e.openpgp.packet.SignatureSub>} subpackets
 *     The hashed subpackets of the signature.
 * @return {e2e.ByteArray} The data to hash.
 */
e2e.openpgp.packet.Signature.getDataToHash = function(
    data, signatureType, pubKeyAlgorithm, hashAlgorithm, subpackets) {
  var serializedHashedSubpackets =
      e2e.openpgp.packet.Signature.serializeSubpackets(subpackets);
  return goog.array.flatten(
      data,
      4,  // version
      signatureType,
      e2e.openpgp.constants.getId(pubKeyAlgorithm),
      e2e.openpgp.constants.getId(hashAlgorithm),
      serializedHashedSubpackets,
      4, // version
      0xFF,
      // Length of this hashTrailer (not including 6 final bytes):
      e2e.dwordArrayToByteArray(
          [serializedHashedSubpackets.length + 4])
  );
};


/**
 * Serializes a list of subpackets.
 * @param {Array.<e2e.openpgp.packet.SignatureSub>} subpackets
 * @return {e2e.ByteArray} The serialized subpackets.
 */
e2e.openpgp.packet.Signature.serializeSubpackets =
    function(subpackets) {
  var serialized = goog.array.flatten(
      goog.array.map(subpackets,
        function(packet) {
          return packet.serialize();
        }));
  if (serialized.length > 0xFFFF) {
    throw new e2e.openpgp.error.SerializationError(
        'Subpacket length is too long.');
  }
  var length = e2e.dwordArrayToByteArray(
      [serialized.length]).slice(2);
  return length.concat(serialized);
};


e2e.openpgp.packet.factory.add(e2e.openpgp.packet.Signature);


/**
 * Type of signature RFC 4880 Section 5.2.1.
 * @enum {number}
 */
e2e.openpgp.packet.Signature.SignatureType = {
  'BINARY': 0x00,
  'TEXT': 0x01,
  'STANDALONE': 0x02,
  'GENERIC_USER_ID': 0x10,
  'PERSONA_USER_ID': 0x11,
  'CASUAL_USER_ID': 0x12,
  'POSITIVE_USER_ID': 0x13,
  'SUBKEY': 0x18,
  'PRIMARY_KEY': 0x19,
  'KEY': 0x1F,
  'KEY_REVOCATION': 0x20,
  'SUBKEY_REVOCATION': 0x28,
  'CERTIFICATION_REVOCATION': 0x30,
  'TIMESTAMP': 0x40,
  'CONFIRMATION': 0x50
};
