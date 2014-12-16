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
 * @fileoverview Symmetrically Encrypted Data packet.
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.openpgp.packet.SymmetricallyEncrypted');
goog.provide('e2e.openpgp.packet.SymmetricallyEncryptedIntegrity');

goog.require('e2e');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.factory');
goog.require('e2e.ciphermode.Cfb');
goog.require('e2e.hash.Sha1');
goog.require('e2e.openpgp.InsecureSymmetricAlgorithm');
goog.require('e2e.openpgp.Ocfb');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.constants.Type');
goog.require('e2e.openpgp.error.DecryptError');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.packet.EncryptedData');
goog.require('e2e.openpgp.packet.factory');
goog.require('e2e.random');
goog.require('goog.array');



/**
 * Representation of a Symmetrically Encrypted Data Packet (Tag 9).
 * As defined in RFC 4880 Section 5.7.
 * @param {!e2e.ByteArray} encryptedData The encrypted data.
 * @extends {e2e.openpgp.packet.EncryptedData}
 * @constructor
 */
e2e.openpgp.packet.SymmetricallyEncrypted = function(
    encryptedData) {
  goog.base(this, encryptedData);
};
goog.inherits(e2e.openpgp.packet.SymmetricallyEncrypted,
    e2e.openpgp.packet.EncryptedData);


/** @inheritDoc */
e2e.openpgp.packet.SymmetricallyEncrypted.prototype.tag = 9;


/** @inheritDoc */
e2e.openpgp.packet.SymmetricallyEncrypted.prototype.decrypt =
    function(algorithm, keyObj) {
  if (!e2e.openpgp.InsecureSymmetricAlgorithm.hasOwnProperty(algorithm)) {
    throw new e2e.openpgp.error.UnsupportedError(
        'Only legacy ciphers can be encrypted without integrity protection.');
  }
  var cipher = /** @type {e2e.cipher.SymmetricCipher} */ (
      e2e.openpgp.constants.getInstance(
          e2e.openpgp.constants.Type.SYMMETRIC_KEY, algorithm, keyObj));
  var ocfbCipher = new e2e.openpgp.Ocfb(cipher, true);
  this.data = /** @type {!e2e.ByteArray} */ (
      e2e.async.Result.getValue(ocfbCipher.decrypt(this.encryptedData, [])));
};


/** @inheritDoc */
e2e.openpgp.packet.SymmetricallyEncrypted.prototype.serializePacketBody =
    function() {
  return this.encryptedData;
};


/**
 * Parses and extracts the data from the body.
 * Throws a {@code e2e.openpgp.error.ParseError} if malformed.
 * @param {!e2e.ByteArray} body The data to parse.
 * @return {e2e.openpgp.packet.SymmetricallyEncrypted} packet.
 */
e2e.openpgp.packet.SymmetricallyEncrypted.parse =
    function(body) {
  return new e2e.openpgp.packet.SymmetricallyEncrypted(body);
};

e2e.openpgp.packet.factory.add(
    e2e.openpgp.packet.SymmetricallyEncrypted);



/**
 * Representation of a Sym. Encrypted Integrity Protected Data Packet (Tag 18).
 * As defined in RFC 4880 Section 5.13.
 * @param {!e2e.ByteArray} encryptedData The encrypted data.
 * @extends {e2e.openpgp.packet.SymmetricallyEncrypted}
 * @constructor
 */
e2e.openpgp.packet.SymmetricallyEncryptedIntegrity = function(
    encryptedData) {
  goog.base(this, encryptedData);
};
goog.inherits(e2e.openpgp.packet.SymmetricallyEncryptedIntegrity,
    e2e.openpgp.packet.SymmetricallyEncrypted);


/** @inheritDoc */
e2e.openpgp.packet.SymmetricallyEncryptedIntegrity.prototype.tag = 18;


/** @inheritDoc */
e2e.openpgp.packet.SymmetricallyEncryptedIntegrity.prototype.decrypt =
    function(algorithm, keyObj) {
  var cipher = /** @type {e2e.cipher.SymmetricCipher} */ (
      e2e.cipher.factory.require(algorithm, keyObj));
  var iv = goog.array.repeat(0, cipher.blockSize);
  var cfbCipher = new e2e.ciphermode.Cfb(cipher);
  var plaintext = /** @type {!e2e.ByteArray} */ (
      e2e.async.Result.getValue(cfbCipher.decrypt(this.encryptedData, iv)));
  // MDC is at end of packet. It's 2 bytes of header and 20 bytes of hash.
  var mdc = plaintext.splice(-20, 20);
  var sha1 = new e2e.hash.Sha1();
  var mdcCalculated = sha1.hash(plaintext);
  var mdcHeader = plaintext.splice(-2, 2);
  var prefix = plaintext.splice(0, cipher.blockSize + 2);
  if (!e2e.compareByteArray(mdc, mdcCalculated)) {
    throw new e2e.openpgp.error.DecryptError(
        'Modification Detection Code has incorrect value.');
  }
  this.data = plaintext;
};


/**
 * Makes a Symmetrically Encrypted Integrity-protected packet containing the
 * specified plaintext packet. Does the encryption and creates the MDC.
 * @param {!e2e.ByteArray} innerPacket The unencrypted inner packet.
 * @param {!e2e.cipher.SymmetricCipher} cipher The cipher to use for encryption.
 * @return {e2e.openpgp.packet.SymmetricallyEncryptedIntegrity}
 */
e2e.openpgp.packet.SymmetricallyEncryptedIntegrity.construct = function(
    innerPacket, cipher) {
  var prefix = e2e.random.getRandomBytes(cipher.blockSize);
  return e2e.openpgp.packet.SymmetricallyEncryptedIntegrity
      .constructWithPrefix_(innerPacket, cipher, prefix);
};


/**
 * Makes a Symmetrically Encrypted Integrity-protected packet containing the
 * specified plaintext packet. Does the encryption and creates the MDC.
 * @param {!e2e.ByteArray} innerPacket The unencrypted inner packet.
 * @param {!e2e.cipher.SymmetricCipher} cipher The cipher to use for encryption.
 * @param {!e2e.ByteArray} prefix The random prefix.
 * @return {e2e.openpgp.packet.SymmetricallyEncryptedIntegrity}
 * @private
 */
e2e.openpgp.packet.SymmetricallyEncryptedIntegrity.constructWithPrefix_ =
    function(innerPacket, cipher, prefix) {
  var plaintext = goog.array.concat(prefix,
      prefix[prefix.length - 2],  // Last two bytes of prefix are repeated.
      prefix[prefix.length - 1],
      innerPacket,
      [0xD3, 0x14]);  // MDC header
  var sha1 = new e2e.hash.Sha1();
  var mdcCalculated = sha1.hash(plaintext);
  goog.array.extend(plaintext, mdcCalculated);
  var iv = goog.array.repeat(0, cipher.blockSize);
  var cfbCipher = new e2e.ciphermode.Cfb(cipher);
  var ciphertext = /** @type {!e2e.ByteArray} */ (
      e2e.async.Result.getValue(cfbCipher.encrypt(plaintext, iv)));
  var packet = new e2e.openpgp.packet.SymmetricallyEncryptedIntegrity(
      ciphertext);
  return packet;
};


/** @inheritDoc */
e2e.openpgp.packet.SymmetricallyEncryptedIntegrity.prototype.
    serializePacketBody = function() {
  // SEIP has a prefix byte of version 1.
  return goog.array.concat(1, this.encryptedData);
};


/**
 * Parses and extracts the data from the body.
 * Throws a {@code e2e.openpgp.error.ParseError} if malformed.
 * @param {!e2e.ByteArray} body The data to parse.
 * @return {e2e.openpgp.packet.SymmetricallyEncryptedIntegrity} packet.
 */
e2e.openpgp.packet.SymmetricallyEncryptedIntegrity.parse =
    function(body) {
  var version = body.shift();
  if (version != 1) {
    throw new e2e.openpgp.error.ParseError('Invalid tag18 version.');
  }
  return new e2e.openpgp.packet.SymmetricallyEncryptedIntegrity(body);
};

e2e.openpgp.packet.factory.add(
    e2e.openpgp.packet.SymmetricallyEncryptedIntegrity);
