/**
 * @license
 * Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Basic functions common to all openpgp.
 */

goog.provide('e2e.openpgp');
goog.provide('e2e.openpgp.InsecureSymmetricAlgorithm');
goog.provide('e2e.openpgp.SignatureDigestAlgorithm');

goog.require('e2e');
goog.require('goog.array');


/**
 * List of hash algorithms allowed for OpenPGP signatures. Notable exceptions
 * are MD5 (deprecated) and RIPEMD (unsupported).
 * @enum {string}
 */
e2e.openpgp.SignatureDigestAlgorithm = {
  'SHA1': 'SHA1',
  'SHA256': 'SHA256',
  'SHA384': 'SHA384',
  'SHA512': 'SHA512',
  'SHA224': 'SHA224'
};


/**
 * List of symmetric algorithms allowed for symmetrically encrypted packets
 * without a modification detection code. I.e., Tag 9 packets.
 *
 * This mitigates the impact of downgrade attacks that strip integrity
 * protection: If a user never encrypts a packet using a weak cipher algorithm,
 * they will never produce the necessary data to carry out such an attack.
 *
 * (These are the only ciphers for which GnuPG, by default, emits a plain
 * Tag 9 packet under its present default settings.)
 * @enum {string}
 */
e2e.openpgp.InsecureSymmetricAlgorithm = {
  'CAST5': 'CAST5',
  'IDEA': 'IDEA',
  'TRIPLE_DES': 'TRIPLE_DES',
  'BLOWFISH': 'BLOWFISH'
};


/**
 * Calculates a numeric checksum of the data as specificed in RFC 4880
 * Section 5.5.3. This checksum is used in private key data.
 * @param {!e2e.ByteArray} data The input data.
 * @return {!e2e.ByteArray}
 */
e2e.openpgp.calculateNumericChecksum = function(data) {
  var sum = 0;
  goog.array.forEach(
      data,
      function(elem) {
        sum += elem;
      });
  sum = sum % e2e.openpgp.CHECKSUM_MOD;
  return e2e.wordToByteArray(sum);
};


/**
 * The checksum modulus used for checksum as specified in RFC 4880 Sec 5.5.3.
 * @const {number}
 */
e2e.openpgp.CHECKSUM_MOD = 65536;
