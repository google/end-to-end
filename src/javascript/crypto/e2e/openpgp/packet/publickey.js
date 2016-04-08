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
 * @fileoverview Represents a public key packet.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.packet.PublicKey');

goog.require('e2e');
goog.require('e2e.algorithm.KeyLocations');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.factory');
goog.require('e2e.debug.Console');
goog.require('e2e.hash.Md5');
goog.require('e2e.hash.Sha1');
goog.require('e2e.openpgp.Mpi');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.constants.Type');
goog.require('e2e.openpgp.error.SerializationError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.packet.Key');
goog.require('e2e.openpgp.packet.factory');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.factory');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * A Public Key Packet (Tag 6) RFC 4880 Section 5.5.1.1.
 * @param {number} version The version of the key. Should be 0x04.
 * @param {number} timestamp The creation time of the key.
 * @param {!e2e.cipher.Cipher|!e2e.signer.Signer} cipher
 *     An instance of the cipher used.
 * @param {!e2e.openpgp.KeyFingerprint=} opt_fingerprint The fingerprint of the
 *     key.
 * @param {!e2e.openpgp.KeyId=} opt_keyId The key ID of the key. Should be
 *     passed in for v3 keys, but not for v4 keys.
 * @extends {e2e.openpgp.packet.Key}
 * @constructor
 */
e2e.openpgp.packet.PublicKey = function(
    version, timestamp, cipher, opt_fingerprint, opt_keyId) {
  goog.base(this, version, timestamp, cipher, opt_fingerprint, opt_keyId);
};
goog.inherits(e2e.openpgp.packet.PublicKey,
              e2e.openpgp.packet.Key);


/**
 * The prefix to use to calculate a fingerprint.
 * @type {number}
 * @const
 */
e2e.openpgp.packet.PublicKey.FINGERPRINT_PREFIX = 0x99;


/** @inheritDoc */
e2e.openpgp.packet.PublicKey.prototype.tag = 6;


/** @inheritDoc */
e2e.openpgp.packet.PublicKey.prototype.serializePacketBody =
    function() {
  var cipherId = e2e.openpgp.constants.getId(this.cipher.algorithm);
  var keyObj = this.cipher.getKey();
  var keyData;
  switch (this.cipher.algorithm) {
    case e2e.cipher.Algorithm.RSA:
    case e2e.cipher.Algorithm.RSA_ENCRYPT:
    case e2e.signer.Algorithm.RSA_SIGN:
      keyData = goog.array.flatten(
          e2e.openpgp.Mpi.serialize(keyObj['n']),
          e2e.openpgp.Mpi.serialize(keyObj['e']));
      break;
    case e2e.signer.Algorithm.DSA:
      keyData = goog.array.flatten(
          e2e.openpgp.Mpi.serialize(keyObj['p']),
          e2e.openpgp.Mpi.serialize(keyObj['q']),
          e2e.openpgp.Mpi.serialize(keyObj['g']),
          e2e.openpgp.Mpi.serialize(keyObj['y']));
      break;
    case e2e.cipher.Algorithm.ELGAMAL:
      keyData = goog.array.flatten(
          e2e.openpgp.Mpi.serialize(keyObj['p']),
          e2e.openpgp.Mpi.serialize(keyObj['g']),
          e2e.openpgp.Mpi.serialize(keyObj['y']));
      break;
    case e2e.signer.Algorithm.ECDSA:
      keyData = goog.array.flatten(
          keyObj['curve'],
          e2e.openpgp.Mpi.serialize(keyObj['pubKey']));
      break;
    case e2e.cipher.Algorithm.ECDH:
      keyData = goog.array.flatten(
          // Curve is in serialized MPI format. Its first byte is its length.
          keyObj['curve'],
          e2e.openpgp.Mpi.serialize(keyObj['pubKey']),
          // kdfInfo is in serialized MPI format. Its first byte is its length.
          keyObj['kdfInfo']);
      break;
    default:
      throw new e2e.openpgp.error.SerializationError('Unknown algorithm.');
  }
  if (this.version == 4) {
    return goog.array.flatten(
        this.version,
        e2e.dwordArrayToByteArray([this.timestamp]),
        cipherId,
        keyData);
  } else if (this.version == 3 || this.version == 2) {
    return goog.array.flatten(
        this.version,
        e2e.dwordArrayToByteArray([this.timestamp]),
        0, 0, // TODO(adhintz) days until expiration
        cipherId,
        keyData);
  } else {
    throw new e2e.openpgp.error.SerializationError('Unknown version.');
  }
};


/** @override */
e2e.openpgp.packet.PublicKey.prototype.getPublicKeyPacket = function() {
  return this;
};


/**
 * Extracts a Public Key Packet from the body, and returns a PublicKey.
 * @param {!e2e.ByteArray} body The body from where to extract the data.
 * @return {!e2e.openpgp.packet.PublicKey} The generated packet.
 */
e2e.openpgp.packet.PublicKey.parse = function(body) {
  var fingerprintCopy = body.slice();
  var version = body.shift();
  if (version != 4 && version != 3 && version != 2) {
    throw new e2e.openpgp.error.UnsupportedError(
        'Deprecated key packet version.');
  }
  e2e.openpgp.packet.PublicKey.console_.info(
      '  Ver', version);
  var timestamp = e2e.byteArrayToDwordArray(body.splice(0, 4))[0];
  if (version == 3 || version == 2) {
    var daysUntilExpiration = e2e.byteArrayToWord(body.splice(0, 2));
  }
  var cipherId = body.shift();
  var cipherAlgorithm = e2e.openpgp.constants.getAlgorithm(
      e2e.openpgp.constants.Type.PUBLIC_KEY, cipherId);
  e2e.openpgp.packet.PublicKey.console_.info(
      '  Pub alg', cipherAlgorithm);
  var cipher;
  var keyData = {};
  keyData.loc = e2e.algorithm.KeyLocations.JAVASCRIPT;
  // TODO(user): Clean up these types, add loc fields when b/16299258 is fixed.
  switch (cipherAlgorithm) {
    case e2e.cipher.Algorithm.RSA:
    case e2e.cipher.Algorithm.RSA_ENCRYPT:
    case e2e.signer.Algorithm.RSA_SIGN:
      var n = e2e.openpgp.Mpi.parse(body);
      var e = e2e.openpgp.Mpi.parse(body);
      keyData = /** @type {!e2e.cipher.key.Rsa} */({
        'n': goog.array.clone(n),
        'e': goog.array.clone(e)});
      if (cipherAlgorithm == e2e.signer.Algorithm.RSA_SIGN) {
        cipher = e2e.signer.factory.require(
            /** @type {!e2e.signer.Algorithm} */ (cipherAlgorithm), keyData);
      } else {
        cipher = e2e.cipher.factory.require(
            /** @type {!e2e.cipher.Algorithm} */ (cipherAlgorithm), keyData);
      }
      break;
    case e2e.cipher.Algorithm.ELGAMAL:
      var p = e2e.openpgp.Mpi.parse(body);
      var g = e2e.openpgp.Mpi.parse(body);
      var y = e2e.openpgp.Mpi.parse(body);
      keyData = /** @type {!e2e.cipher.key.ElGamal} */(
          {'p': goog.array.clone(p),
            'g': goog.array.clone(g),
            'y': goog.array.clone(y)});
      cipher = e2e.cipher.factory.require(cipherAlgorithm, keyData);
      break;
    case e2e.signer.Algorithm.DSA:
      var p = e2e.openpgp.Mpi.parse(body);
      var q = e2e.openpgp.Mpi.parse(body);
      var g = e2e.openpgp.Mpi.parse(body);
      var y = e2e.openpgp.Mpi.parse(body);
      keyData = /** @type {!e2e.signer.key.Dsa} */(
          {'p': goog.array.clone(p),
            'q': goog.array.clone(q),
            'g': goog.array.clone(g),
            'y': goog.array.clone(y)});
      cipher = e2e.signer.factory.require(cipherAlgorithm, keyData);
      break;
    case e2e.signer.Algorithm.ECDSA:
      var curveSize = body.shift();
      var curve = body.splice(0, curveSize);
      var pubKey = e2e.openpgp.Mpi.parse(body);
      keyData = /** @type {!e2e.signer.key.Ecdsa} */(
          {'curve': goog.array.concat(curveSize, curve),
            'pubKey': goog.array.clone(pubKey)});
      cipher = e2e.signer.factory.require(cipherAlgorithm, keyData);
      break;
    case e2e.cipher.Algorithm.ECDH:
      var curveSize = body.shift();
      var curve = body.splice(0, curveSize);
      var pubKey = e2e.openpgp.Mpi.parse(body);
      var kdfInfo = body.splice(0, 4);
      keyData = /** @type {!e2e.cipher.key.Ecdh} */(
          {'curve': goog.array.concat(curveSize, curve),
            'kdfInfo': goog.array.clone(kdfInfo),
            'pubKey': goog.array.clone(pubKey)});
      // Cannot require() here as we need the fingerprint calculation first.
      cipher = null;  // Set to avoid compile warning.
      break;
    default:
      throw new e2e.openpgp.error.UnsupportedError('Unknown algorithm');
  }

  var fingerprint;
  var keyId = undefined;
  // Algorithm to calculate v4 fingerprints per RFC 4880 Section 12.2.
  // fingerprintCopy contains: version + timestamp + algorithm + key data.
  // body.length is the left over data for the next packets, so it is not
  // included in the fingerprinted data.
  if (version == 4) {
    fingerprintCopy.splice(-body.length, body.length);
    fingerprint = e2e.openpgp.packet.PublicKey.calculateFingerprint(
        fingerprintCopy);
    if (cipherAlgorithm == e2e.cipher.Algorithm.ECDH) {
      keyData['fingerprint'] = fingerprint;
      cipher = e2e.cipher.factory.require(
          /** @type {e2e.cipher.Algorithm} */ (cipherAlgorithm),
          keyData);
    }
  } else {
    // We threw an exception earlier if it wasn't 2, 3, or 4
    goog.asserts.assert(version == 3 || version == 2);

    // For a V3 key, the eight-octet Key ID consists of the low 64 bits of
    // the public modulus of the RSA key.
    keyId = /** @type {!e2e.openpgp.KeyId} */ (keyData['n'].slice(-8));

    // The fingerprint of a V3 key is formed by hashing the body (but not
    // the two-octet length) of the MPIs that form the key material (public
    // modulus n, followed by exponent e) with MD5.
    var md5 = new e2e.hash.Md5();
    fingerprint = /** @type {!e2e.openpgp.KeyFingerprint} */ (md5.hash(
        goog.array.concat(keyData['n'], keyData['e'])));
  }
  e2e.openpgp.packet.PublicKey.console_.info(
      '  Fingerprint', fingerprint);
  return new e2e.openpgp.packet.PublicKey(version, timestamp,
                                          goog.asserts.assertObject(cipher),
                                          fingerprint, keyId);
};


/**
 * Calculates the v4 fingerprints per RFC 4880 Section 12.2.
 * @param {!e2e.ByteArray} pubKey The public key, which contains
 *     version + timestamp + algorithm + key data.
 * @return {!e2e.openpgp.KeyFingerprint}
 */
e2e.openpgp.packet.PublicKey.calculateFingerprint = function(pubKey) {
  var fingerprintData = goog.array.concat(
      e2e.openpgp.packet.PublicKey.FINGERPRINT_PREFIX,
      pubKey.length >>> 8,
      pubKey.length % 256,
      pubKey);
  var sha1 = new e2e.hash.Sha1();
  return /** @type {!e2e.openpgp.KeyFingerprint} */ (
      sha1.hash(fingerprintData));
};


/**
 * @type {!e2e.debug.Console}
 * @private
 */
e2e.openpgp.packet.PublicKey.console_ =
    e2e.debug.Console.getConsole('e2e.openpgp.packet.PublicKey');

e2e.openpgp.packet.factory.add(e2e.openpgp.packet.PublicKey);
