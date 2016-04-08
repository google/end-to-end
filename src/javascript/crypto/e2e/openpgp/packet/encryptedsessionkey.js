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
 * @fileoverview Representation of Encrypted Session Key packets.
 */

goog.provide('e2e.openpgp.packet.EncryptedSessionKey');

goog.require('e2e.async.Result');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.packet.Packet');



/**
 * Represents encrypted session key packets (Tag 1 and 3) as specified in
 * RFC 4880 Section 5.1 and Section 5.3.
 * @param {number} version The version of the key packet.
 * @param {e2e.cipher.Algorithm} algorithm The public key algorithm.
 * @param {e2e.cipher.ciphertext.CipherText} encryptedKey Encrypted
 *     session key.
 * @extends {e2e.openpgp.packet.Packet}
 * @constructor
 */
e2e.openpgp.packet.EncryptedSessionKey = function(
    version, algorithm, encryptedKey) {
  this.version = version;
  this.algorithm = algorithm;
  this.encryptedKey = encryptedKey;
  /**
   * keyObj containing the symmetric session key.
   * @type {e2e.cipher.key.SymmetricKey|undefined}
   */
  this.sessionKey;
  /**
   * Symmetric encryption algorithm used to encrypt the following
   * Symmetrically Encrypted Data Packet. Used with this.sessionKey.
   * @type {!e2e.cipher.Algorithm|undefined}
   */
  this.symmetricAlgorithm;
};
goog.inherits(e2e.openpgp.packet.EncryptedSessionKey,
    e2e.openpgp.packet.Packet);


/**
 * Creates a cipher decrypting the session key encrpted in this packet.
 * @param {!e2e.cipher.key.Key} key The key to decrypt the session key.
 * @return {!e2e.cipher.Cipher} Cipher
 */
e2e.openpgp.packet.EncryptedSessionKey.prototype.createCipher =
    goog.abstractMethod;


/**
 * Decrypts the encrypted session key.
 * @param {!e2e.cipher.key.Key} key The key to decrypt the session key.
 * @return {!e2e.async.Result.<boolean>} True if decryption succeeded.
 */
e2e.openpgp.packet.EncryptedSessionKey.prototype.decryptSessionKey =
    function(key) {
  return e2e.async.Result.toResult(key)
      .addCallback(this.createCipher, this)
      .addCallback(this.decryptSessionKeyWithCipher, this);
};


/**
 * Decrypts the encrypted session key.
 * @param {!e2e.cipher.Cipher} cipher The cipher decrypting the session key.
 * @return {!e2e.async.Result.<boolean>} True if decryption succeeded.
 */
e2e.openpgp.packet.EncryptedSessionKey.prototype.decryptSessionKeyWithCipher =
    goog.abstractMethod;


/**
 * Obtains the decrypted session keyObj if available.
 * Throws {@code Error} if the session key does not exist. This happens if
 *     decryptSessionKey() has not yet been called.
 * @return {e2e.cipher.key.Key} The decrypted session key as a keyObj.
 */
e2e.openpgp.packet.EncryptedSessionKey.prototype.getSessionKey =
    function() {
  if (this.sessionKey) {
    return this.sessionKey;
  }
  throw new Error('Invalid session key.');
};


/**
 * Ensures that the cipher can be applied to the symmetric key decryption for
 * this packet.
 * @param  {!e2e.cipher.Cipher} cipher The cipher.
 * @return {!e2e.cipher.Cipher} The cipher.
 * @protected
 */
e2e.openpgp.packet.EncryptedSessionKey.prototype.validateCipher = function(
    cipher) {
  // Algoritm mismatch.
  if (cipher.algorithm !== this.algorithm) {
    throw new e2e.openpgp.error.InvalidArgumentsError(
        'Invalid cipher during SKESK packet decryption.');
  }
  return cipher;
};
