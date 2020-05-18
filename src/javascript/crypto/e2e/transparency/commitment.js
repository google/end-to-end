/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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
 * @fileoverview Functions to verify cryptographic committments as part of KT.
 */

goog.provide('e2e.transparency.commitment');

goog.require('e2e');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('goog.crypt.Hmac');
goog.require('goog.crypt.Sha256');

/**
 * Fixed public key used for Key Transparency commitment.
 *
 * Key Transparency tracks "commitments" to public keys so that keys and email
 * addresses are not revealed in the KT logs.  The commitment data is an HMAC
 * with a fixed public key so commitment = HMAC(known_key, "Key Transparency
 * Committment" || nonce || message).
 *
 * This is the fixed public key.
 *
 * @see {@link
 * https://github.com/google/keytransparency/blob/master/core/crypto/commitments/commitments.go}
 *
 * @private
 * @const {!e2e.ByteArray}
 */
var FIXED_KEY = [
  0x19, 0x6e, 0x7e, 0x52, 0x84, 0xa7, 0xef, 0x93, 0x0e, 0xcb, 0x9a, 0x19, 0x78,
  0x74, 0x97, 0x55
];

/**
 * Prefix used for the Key Transparency commitment scheme as described above.
 *
 * @private
 * @const {!e2e.ByteArray}
 */
var COMMITMENT_PREFIX = e2e.stringToByteArray('Key Transparency Commitment');

/**
 * Verifies a Key Transparency commitment to a piece of data for a particular
 * user ID and app ID.
 *
 * Key Transparency records not public keys and user IDs but a cryptographic
 * commitment to them, so that the public KT logs do not contain user IDs.  Key
 * Transparency commitments include a user ID, an application ID, a nonce, and
 * the public key being claimed for the user ID and application ID.
 *
 * See
 * https://github.com/google/keytransparency/blob/master/core/crypto/commitments/commitments.go.
 *
 * @param {string} userId User ID being claimed for the commitment.
 * @param {!e2e.ByteArray} nonce Nonce used to generate the commitment.
 * @param {!e2e.ByteArray} pubKey Claimed public key to be verified.
 * @param {!e2e.ByteArray} commitment Commitment claim to be verified.
 * @return {boolean} True if the commitment string matches the (userId, appId,
 *     nonce, pubkey) provided and false otherwise.
 */
e2e.transparency.commitment.matches = function(
    userId, nonce, pubKey, commitment) {
  return e2e.compareByteArray(
      e2e.transparency.commitment.createCommitment_(userId, nonce, pubKey),
      commitment);
};

/**
 * Constructs a Key Transparency committment for the given user ID, application
 * ID, nonce, and user's public key.
 *
 * @private
 * @param {string} userId User ID to use in the commitment.
 * @param {!e2e.ByteArray} nonce Random array of 16 bytes.
 * @param {!e2e.ByteArray} pubKey Public key to commit to.
 * @return {!e2e.ByteArray}
 */
e2e.transparency.commitment.createCommitment_ = function(
    userId, nonce, pubKey) {
  var mac = new goog.crypt.Hmac(new goog.crypt.Sha256(), FIXED_KEY);
  mac.update(COMMITMENT_PREFIX);
  mac.update(nonce);
  mac.update(e2e.transparency.commitment.encodeWithLength_(userId));
  mac.update(pubKey);
  return mac.digest();
};

/**
 * Encodes a string into a byte array that begins with a big-endian encoding of
 * the string's length.  Throws an e2e.error.InvalidArgumentsError if the
 * string's length in bytes is over 2^32.
 *
 * @private
 * @param {string} x
 * @throws {!e2e.error.InvalidArgumentsError}
 * @return {!e2e.ByteArray}
 */
e2e.transparency.commitment.encodeWithLength_ = function(x) {
  var stringAsBytes = e2e.stringToByteArray(x);
  if (!e2e.isUint32(stringAsBytes.length)) {
    // The string is too long for the length to fit in a uint32.
    throw new e2e.error.InvalidArgumentsError(
        'String is too long to encode its length in 4 bytes');
  }
  // Using dwordArrayToByteArray([x]) instead of numberToByteArray(x) guarantees
  // that lengthPrefix will always be 4 bytes long.
  var lengthPrefix = e2e.dwordArrayToByteArray([stringAsBytes.length]);
  return lengthPrefix.concat(stringAsBytes);
};
