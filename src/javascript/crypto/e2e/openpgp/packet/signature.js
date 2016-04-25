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
 * @fileoverview Definition of a signature packet.
 */

goog.provide('e2e.openpgp.packet.Signature');
goog.provide('e2e.openpgp.packet.Signature.RevocationReason');
goog.provide('e2e.openpgp.packet.Signature.SignatureType');

goog.require('e2e');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.debug.Console');
/** @suppress {extraRequire} force loading of all hash functions */
goog.require('e2e.hash.all');
goog.require('e2e.hash.factory');
goog.require('e2e.openpgp.KeyProviderCipher');
goog.require('e2e.openpgp.Mpi');
goog.require('e2e.openpgp.SignatureDigestAlgorithm');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.constants.Type');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.SerializationError');
goog.require('e2e.openpgp.error.SignatureExpiredError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.packet.OnePassSignature');
goog.require('e2e.openpgp.packet.Packet');
goog.require('e2e.openpgp.packet.SignatureSub');
goog.require('e2e.openpgp.packet.factory');
goog.require('e2e.scheme.Ecdsa');
goog.require('e2e.scheme.Rsassa');
goog.require('e2e.signer.Algorithm');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * A Signature Packet (Tag 2) RFC 4880 Section 5.2.
 * @param {number} version The version of the signature packet.
 * @param {!e2e.openpgp.packet.Signature.SignatureType} signatureType
 *     The signature type.
 * @param {!e2e.signer.Algorithm} pubKeyAlgorithm The public key
 *     algorithm.
 * @param {!e2e.hash.Algorithm} hashAlgorithm The hash algorithm.
 * @param {!e2e.signer.signature.Signature} signature The signature.
 * @param {!e2e.ByteArray} leftTwoBytes The left two bytes of the hash.
 * @param {Array.<e2e.openpgp.packet.SignatureSub>=} opt_hashedSubpackets
 *     The hashed subpackets of the signature.
 * @param {Array.<e2e.openpgp.packet.SignatureSub>=} opt_unhashedSubpackets
 *     The non hashed subpackets of the signature.
 * @param {!e2e.openpgp.KeyId=} opt_signerKeyId The key id of the signer.
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

  var creationTime;
  if (version == 0x04) {
    /**
     * Hashed signature subpackets.
     * @type {!Array.<!e2e.openpgp.packet.SignatureSub>}
     */
    this.hashedSubpackets = opt_hashedSubpackets || [];
    /**
     * @type {!Object.<string, number|!e2e.ByteArray>}
     */
    this.attributes = {};
    goog.array.forEach(this.hashedSubpackets, function(subpacket) {
      e2e.openpgp.packet.SignatureSub.populateAttribute(
          this.attributes, subpacket, false);
    }, this);

    // rfc 4880: 5.2.3.4 - signature creation time MUST be present
    // within the hashed area.
    if (!this.attributes.hasOwnProperty('SIGNATURE_CREATION_TIME')) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Missing signature timestamp.');
    }
    creationTime = this.attributes.SIGNATURE_CREATION_TIME;

    /**
     * Non hashed signature subpackets.
     * @type {!Array.<!e2e.openpgp.packet.SignatureSub>}
     */
    this.unhashedSubpackets = opt_unhashedSubpackets || [];
    /**
     * @type {!Object.<string, number|!e2e.ByteArray>}
     */
    this.untrustedAttributes = {};
    goog.array.forEach(this.unhashedSubpackets, function(subpacket) {
      e2e.openpgp.packet.SignatureSub.populateAttribute(
          this.untrustedAttributes, subpacket, false);
    }, this);
    /**
     * Embedded signature.
     * @type {e2e.openpgp.packet.Signature}
     */
    this.embeddedSignature = null;
    var sigBytes = this.attributes.EMBEDDED_SIGNATURE ||
        this.untrustedAttributes.EMBEDDED_SIGNATURE;
    if (sigBytes) {
      this.embeddedSignature = e2e.openpgp.packet.Signature.parse(
          goog.array.clone(sigBytes));
    }
  } else if (version == 0x03 || version == 0x02) {
    if (!goog.isDef(opt_signerKeyId) ||
        !goog.isDef(opt_creationTime)) {
      throw new e2e.openpgp.error.InvalidArgumentsError(
          'Missing key data.');
    }
    creationTime = opt_creationTime;
    /**
     * ID of the key that generated this signature..
     * @type {!e2e.openpgp.KeyId}
     */
    this.signerKeyId = opt_signerKeyId;
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
   * Creation time of the signature.
   * @type {number}
   */
  this.creationTime = creationTime;
  /**
   * Type of the signature.
   * @type {!e2e.openpgp.packet.Signature.SignatureType}
   */
  this.signatureType = signatureType;
  /**
   * Public key algorithm used in this signature.
   * @type {!e2e.signer.Algorithm}
   */
  this.pubKeyAlgorithm = pubKeyAlgorithm;
  /**
   * Hash algorithm used in this signature.
   * @type {!e2e.hash.Algorithm}
   */
  this.hashAlgorithm = hashAlgorithm;
  /**
   * Signature data.
   * @type {!e2e.signer.signature.Signature}
   */
  this.signature = signature;
  /**
   * Left Two Bytes of hash.
   * @type {!e2e.ByteArray}
   */
  this.leftTwoBytes = leftTwoBytes;
};
goog.inherits(e2e.openpgp.packet.Signature,
              e2e.openpgp.packet.Packet);


/** @inheritDoc */
e2e.openpgp.packet.Signature.prototype.tag = 2;


/** @inheritDoc */
e2e.openpgp.packet.Signature.prototype.serializePacketBody = function() {
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
    case e2e.signer.Algorithm.RSA_SIGN:
      goog.array.extend(serialized,
          e2e.openpgp.Mpi.serialize(sig['s']));
      break;
    case e2e.signer.Algorithm.ECDSA:
    case e2e.signer.Algorithm.DSA:
      goog.array.extend(serialized,
          e2e.openpgp.Mpi.serialize(sig['r']),
          e2e.openpgp.Mpi.serialize(sig['s']));
      break;
    default:
      throw new e2e.openpgp.error.UnsupportedError(
          'Unsupported algorithm for signature verification.');
  }
  return serialized;
};


/**
 * @return {!e2e.ByteArray} The serialized subpackets.
 */
e2e.openpgp.packet.Signature.prototype.serializeHashedSubpackets = function() {
  return e2e.openpgp.packet.Signature.serializeSubpackets(
      this.hashedSubpackets);
};


/**
 * @return {!e2e.ByteArray} The serialized subpackets.
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
  e2e.openpgp.packet.Signature.console_.info(
      'Signature packet Ver ', version);
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
    e2e.openpgp.packet.Signature.console_.info(
        '  Sig type ', signatureType);
    e2e.openpgp.packet.Signature.console_.info(
        '  Pub alg ', pubKeyAlgorithm);
    e2e.openpgp.packet.Signature.console_.info(
        '  Hash alg ', hashAlgorithm);
    e2e.openpgp.packet.Signature.console_.info(
        '  Issuer ID ', signerKeyId);
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
    e2e.openpgp.packet.Signature.console_.info(
        '  Sig type ', signatureType);
    e2e.openpgp.packet.Signature.console_.info(
        '  Pub alg ', pubKeyAlgorithm);
    e2e.openpgp.packet.Signature.console_.info(
        '  Hash alg ', hashAlgorithm);
    var hashedSubpacketLength = e2e.byteArrayToWord(
        data.splice(0, 2));
    e2e.openpgp.packet.Signature.console_.info(
        '  Hashed subpackets');
    var hashedSubpackets = e2e.openpgp.packet.SignatureSub.parse(
        data.splice(0, hashedSubpacketLength));
    e2e.openpgp.packet.Signature.console_.info(
        '  Unhashed subpackets');
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
    case e2e.signer.Algorithm.RSA_SIGN:
      signature['s'] = e2e.openpgp.Mpi.parse(data);
      break;
    case e2e.signer.Algorithm.DSA:
    case e2e.signer.Algorithm.ECDSA:
      signature['r'] = e2e.openpgp.Mpi.parse(data);
      signature['s'] = e2e.openpgp.Mpi.parse(data);
      break;
    default:  // Unsupported signature algorithm.
      e2e.openpgp.packet.Signature.console_.warn(
          'Unsupported Signature Algorithm', pubKeyAlgorithm);
      return null;
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
 * @return {!e2e.openpgp.KeyId} signer key ID
 */
e2e.openpgp.packet.Signature.prototype.getSignerKeyId = function() {
  if (this.version == 0x03 || this.version == 0x02) {
    return this.signerKeyId;
  }
  if (this.version == 0x04) {
    if (this.attributes.hasOwnProperty('ISSUER')) {
      return /** @type {!e2e.openpgp.KeyId} */ (this.attributes['ISSUER']);
    }
    if (this.untrustedAttributes.hasOwnProperty('ISSUER')) {
      // GnuPG puts Key ID in unhashed subpacket.
      return /** @type {!e2e.openpgp.KeyId} */ (
          this.untrustedAttributes['ISSUER']);
    }
  }
  return e2e.openpgp.constants.EMPTY_KEY_ID;
};


/**
 * Creates OnePassSignature packet with data consistent with this packet.
 * @param {boolean=} opt_nested Should the OnePassSignature be nested
 *     (false by default).
 * @return {!e2e.openpgp.packet.OnePassSignature} created signature packet
 */
e2e.openpgp.packet.Signature.prototype.constructOnePassSignaturePacket =
    function(opt_nested) {
  return new e2e.openpgp.packet.OnePassSignature(
      3,  // Only version 3 packets exist according to RFC 4880.
      this.signatureType,
      e2e.openpgp.constants.getId(this.hashAlgorithm),
      e2e.openpgp.constants.getId(this.pubKeyAlgorithm),
      this.getSignerKeyId(),
      Boolean(opt_nested));
};


/**
 * Verifies that a key pair actually signed the specified data.
 * @param {!e2e.ByteArray|!Uint8Array} data The signed data.
 * @param {!e2e.signer.Signer} signer Signer with the public key that
 *     signed the data.
 * @param {string=} opt_hashAlgo message digest algorithm declared in the
 *     message.
 * @return {!e2e.async.Result<boolean>} True if the signature correctly
 *     verifies.
 */
e2e.openpgp.packet.Signature.prototype.verify = function(data, signer,
    opt_hashAlgo) {
  if (this.pubKeyAlgorithm != signer.algorithm) {
    return e2e.async.Result.toResult(false);
  }

  // Hash algorithm declared in signature may differ from the one used
  // when instantiating the signer. Use the one declared in signature
  // (if it's allowed).
  var allowedAlgo = e2e.openpgp.SignatureDigestAlgorithm[this.hashAlgorithm];
  if (!allowedAlgo) {
    return e2e.async.Result.toError(new e2e.openpgp.error.UnsupportedError(
        'Specified hash algorithm is not allowed for signatures.'));
  }
  if (allowedAlgo !== signer.getHashAlgorithm()) {
    signer.setHash(e2e.hash.factory.require(allowedAlgo));
  }

  if (goog.isDef(opt_hashAlgo) && opt_hashAlgo !== signer.getHashAlgorithm()) {
    // Hash algorithm mismatch.
    return e2e.async.Result.toResult(false);
  }
  if (this.version == 0x03) {
    return e2e.openpgp.packet.Signature.getSignatureScheme_(signer).verify(
        goog.array.concat(
            data,
            [this.signatureType],
            e2e.dwordArrayToByteArray([this.creationTime])),
        this.signature);
  } else if (this.version == 0x04) {
    try {
      return e2e.openpgp.packet.Signature.getSignatureScheme_(signer).verify(
          e2e.openpgp.packet.Signature.getDataToHash(
              data,
              this.signatureType,
              this.pubKeyAlgorithm,
              this.hashAlgorithm,
              this.hashedSubpackets),
          this.signature).addCallback(function(signatureVerified) {
        if (signatureVerified &&
            this.attributes.SIGNATURE_EXPIRATION_TIME &&
            this.attributes.SIGNATURE_EXPIRATION_TIME <
                Math.floor(new Date().getTime() / 1e3)) {
          throw new e2e.openpgp.error.SignatureExpiredError(
              'Signature expired.');
        }
        return signatureVerified;
      }, this);
    } catch (e) {
      return e2e.async.Result.toError(e);
    }
  } else {
    return e2e.async.Result.toError(new e2e.openpgp.error.UnsupportedError(
        'Verification for this signature version is not implemented.'));
  }
};


/**
 * Returns true iff signature type is of one the types provided for User ID /
 *     public key packet certification.
 * @return {boolean} True if the it's a certification signature, false otherwise
 */
e2e.openpgp.packet.Signature.prototype.isCertificationSignature = function() {
  var certificationTypes = [
    e2e.openpgp.packet.Signature.SignatureType.GENERIC_USER_ID,
    e2e.openpgp.packet.Signature.SignatureType.PERSONA_USER_ID,
    e2e.openpgp.packet.Signature.SignatureType.CASUAL_USER_ID,
    e2e.openpgp.packet.Signature.SignatureType.POSITIVE_USER_ID
  ];
  return goog.array.contains(certificationTypes, this.signatureType);
};


/**
 * Signs the data and creates a signature packet.
 * @param {!e2e.openpgp.packet.SecretKeyInterface} key Key to sign with.
 * @param {!e2e.ByteArray} data Data to sign.
 * @param {!e2e.openpgp.packet.Signature.SignatureType} signatureType
 * @param {!Object.<string, number|!e2e.ByteArray>} attributes
 *     The signature attributes. The SIGNATURE_CREATION_TIME attribute must
 *     always be present within it.
 * @param {Object.<string, number|!e2e.ByteArray>=}
 *     opt_untrustedAttributes The signature untrusted attributes.
 * @return {!e2e.async.Result.<!e2e.openpgp.packet.Signature>} Signature packet.
 */
e2e.openpgp.packet.Signature.construct = function(
    key, data, signatureType, attributes, opt_untrustedAttributes) {
  // Described in RFC4880 section 5.2.4.
  // 5.2.3.4 - SIGNATURE_CREATION_TIME must be present as a hashed attribute.
  if (!attributes.hasOwnProperty('SIGNATURE_CREATION_TIME')) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Missing required SIGNATURE_CREATION_TIME attribute.');
  }

  var hashedSubpackets = e2e.openpgp.packet.SignatureSub.construct(attributes);

  var unhashedSubpackets = opt_untrustedAttributes ?
      e2e.openpgp.packet.SignatureSub.construct(opt_untrustedAttributes) :
      [];
  var signer = /** @type {!e2e.signer.Signer} */ (key.cipher);
  var algorithm =  /** @type {!e2e.signer.Algorithm} */ (signer.algorithm);
  goog.asserts.assert(algorithm in e2e.signer.Algorithm);

  var plaintext = e2e.openpgp.packet.Signature.getDataToHash(
      data,
      signatureType,
      algorithm,
      signer.getHashAlgorithm(),
      hashedSubpackets);
  var resultSig;
  var scheme = e2e.openpgp.packet.Signature.getSignatureScheme_(signer);
  return scheme.sign(plaintext).addCallback(function(signature) {
    return new e2e.openpgp.packet.Signature(
        4, // version
        signatureType,
        algorithm,
        signer.getHashAlgorithm(),
        signature,
        signature['hashValue'].slice(0, 2),
        hashedSubpackets,
        unhashedSubpackets);
  });
};


/**
 * Returns the data that has to be hashed for the signature algorithm.
 * @param {!e2e.ByteArray|!Uint8Array} data The data that was signed.
 * @param {!e2e.openpgp.packet.Signature.SignatureType} signatureType
 *     The signature type.
 * @param {!e2e.signer.Algorithm} pubKeyAlgorithm The public key
 *     algorithm.
 * @param {!e2e.hash.Algorithm} hashAlgorithm The hash algorithm.
 * @param {!Array.<!e2e.openpgp.packet.SignatureSub>} subpackets
 *     The hashed subpackets of the signature.
 * @return {!e2e.ByteArray} The data to hash.
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
 * @param {!Array.<!e2e.openpgp.packet.SignatureSub>} subpackets
 * @return {!e2e.ByteArray} The serialized subpackets.
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


/**
 * Type of revocation reasons RFC 4880 Section 5.2.3.23.
 * @enum {number}
 */
e2e.openpgp.packet.Signature.RevocationReason = {
  'UNSPECIFIED': 0x00,
  'KEY_SUPERSEDED': 0x01,
  'KEY_COMPROMISED': 0x02,
  'KEY_RETIRED': 0x03,
  'USER_ID_INVALID': 0x04
};


/**
 * Returns a signature scheme for a given Signer.
 * @param  {e2e.signer.Signer} signer
 * @return {!e2e.scheme.SignatureScheme|!e2e.signer.Signer}
 * @private
 */
e2e.openpgp.packet.Signature.getSignatureScheme_ = function(signer) {
  // KeyProviderCipher implements a scheme remotely, return it directly.
  if (signer instanceof e2e.openpgp.KeyProviderCipher) {
    return signer;
  }
  switch (signer.algorithm) {
    case e2e.cipher.Algorithm.RSA:
    case e2e.signer.Algorithm.RSA_SIGN:
      return new e2e.scheme.Rsassa(signer);
      break;
    case e2e.signer.Algorithm.ECDSA:
      return new e2e.scheme.Ecdsa(signer);
      break;
    case e2e.signer.Algorithm.DSA:
      return signer;
      break;
  }
  throw new e2e.openpgp.error.InvalidArgumentsError('Unsupported signer.');
};


/**
 * @private {e2e.debug.Console}
 */
e2e.openpgp.packet.Signature.console_ =
    e2e.debug.Console.getConsole('e2e.openpgp.packet.Signature');
