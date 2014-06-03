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
 * @fileoverview Symmetric-Key Encrypted Session Key packet.
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.openpgp.packet.SymmetricKey');

goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.factory');
goog.require('e2e.ciphermode.CFB');
goog.require('e2e.hash.Algorithm');
goog.require('e2e.hash.factory');
goog.require('e2e.openpgp.IteratedS2K');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.constants.Type');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.packet.EncryptedSessionKey');
goog.require('e2e.openpgp.packet.factory');
goog.require('e2e.random');
goog.require('goog.array');


/**
 * Representation of a Symmetric-Key Encrypted Session-Key Packet (Tag 3).
 * As defined in RFC 4880 Section 5.3.
 * @param {number} version The Encrypted Session Key Packet version.
 * @param {e2e.cipher.Algorithm} algorithm The symmetric key algorithm.
 * @param {e2e.ByteArray} encryptedKey The encrypted key.
 * @param {e2e.openpgp.S2K} s2k The string-to-key object.
 * @constructor
 * @extends {e2e.openpgp.packet.EncryptedSessionKey}
 */
e2e.openpgp.packet.SymmetricKey = function(
    version, algorithm, encryptedKey, s2k) {
  goog.base(this, version, algorithm, encryptedKey);
  /**
   * String-to-key object to use with passphrase.
   * @type {e2e.openpgp.S2K}
   * @private
   */
  this.s2k_ = s2k;
};
goog.inherits(
    e2e.openpgp.packet.SymmetricKey,
    e2e.openpgp.packet.EncryptedSessionKey);


/** @inheritDoc */
e2e.openpgp.packet.SymmetricKey.prototype.decryptSessionKey =
    function(key) {
  // Note that the key argument here is actually the passphrase, before s2k.
  var passphrase = key['passphrase'];
  // Make a cipher just to see the key length that we want.
  var cipher = e2e.cipher.factory.require(this.algorithm);
  key = {'key': this.s2k_.getKey(passphrase, cipher.keySize)};
  if (this.encryptedKey.length > 0) {
    cipher = e2e.cipher.factory.require(this.algorithm, key);
    var iv = goog.array.repeat(0, cipher.blockSize);
    var cfbCipher = new e2e.ciphermode.CFB(cipher);
    return cfbCipher.decrypt(
        /** @type e2e.ByteArray */(this.encryptedKey), iv).addCallback(
        function(decoded) {
          try {
            this.symmetricAlgorithm =
                /** @type {e2e.cipher.Algorithm} */ (
                e2e.openpgp.constants.getAlgorithm(
                  e2e.openpgp.constants.Type.SYMMETRIC_KEY,
                  decoded.shift()));
          } catch (e) {
            if (e instanceof e2e.openpgp.error.UnsupportedError) {
              // We have invalid algorithm, therefore decryption failed.
              return false;
            } else {
              throw e;
            }
          }
          this.sessionKey = {'key': decoded};
          return true;
    }, this);
  } else { // No ESK, so just use the s2k for the session key.
    this.symmetricAlgorithm = this.algorithm;
    this.sessionKey = key; // already a keyObj
    return e2e.async.Result.toResult(true);
  }
};


/** @inheritDoc */
e2e.openpgp.packet.SymmetricKey.prototype.tag = 3;


/** @inheritDoc */
e2e.openpgp.packet.SymmetricKey.prototype.serializePacketBody = function() {
  return goog.array.concat(
      this.version,
      e2e.openpgp.constants.getId(this.algorithm),
      this.s2k_.serialize(),
      this.encryptedKey);
};


/**
 * Constructs an SymmetricKey packet from an unencrypted session key.
 * @param {e2e.ByteArray} passphrase Symmetrically encrypt session key
 *   with this passphrase.
 * @param {e2e.ByteArray} sessionKey Unencrypted session key.
 * @return {e2e.openpgp.packet.SymmetricKey}
 */
e2e.openpgp.packet.SymmetricKey.construct =
    function(passphrase, sessionKey) {
  var hash = e2e.hash.factory.require(
      e2e.hash.Algorithm.SHA1);
  var s2k = new e2e.openpgp.IteratedS2K(hash,
      e2e.random.getRandomBytes(8),  // salt
      96);  // The default encodedCount for GnuPG is 96 (decodes to 65536).
  var cipher = e2e.cipher.factory.require(
      e2e.cipher.Algorithm.AES256);
  cipher.setKey({'key': s2k.getKey(passphrase, cipher.keySize)});
  var cfbCipher = new e2e.ciphermode.CFB(cipher);
  var unencryptedKeyData = goog.array.concat(
      e2e.openpgp.constants.getId(e2e.cipher.Algorithm.AES256),
      sessionKey);
  var result = cfbCipher.encrypt(unencryptedKeyData,
      goog.array.repeat(0, cipher.blockSize));  // IV
  var encryptedKey = /** @type e2e.ByteArray */(
      e2e.async.Result.getValue(result));
  var packet = new e2e.openpgp.packet.SymmetricKey(
      4, //version
      e2e.cipher.Algorithm.AES256,
      encryptedKey,
      s2k);
  return packet;
};


/** @inheritDoc */
e2e.openpgp.packet.SymmetricKey.parse = function(body) {
  var version = body.shift();
  if (version != 4) {
    throw new e2e.openpgp.error.ParseError(
        'Unknown SKESK packet version.');
  }
  var algorithmId = body.shift();
  var algorithm = /** @type e2e.cipher.Algorithm.<string> */ (
      e2e.openpgp.constants.getAlgorithm(
          e2e.openpgp.constants.Type.SYMMETRIC_KEY, algorithmId));
  var s2k = e2e.openpgp.S2K.parse(body);
  // Any bytes left in body are the encryptedKey. Possibly empty.
  return new e2e.openpgp.packet.SymmetricKey(
      version, algorithm, body, s2k);
};


e2e.openpgp.packet.factory.add(e2e.openpgp.packet.SymmetricKey);
