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
 * @fileoverview Utility functions for parsing that wrap constants and objects.
 * @author evn@google.com (Eduardo Vela)
 */


goog.provide('e2e.openpgp.constants');
goog.provide('e2e.openpgp.constants.Algorithm');
goog.provide('e2e.openpgp.constants.Type');

goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.factory');
goog.require('e2e.compression.Algorithm');
goog.require('e2e.compression.factory');
goog.require('e2e.hash.Algorithm');
goog.require('e2e.hash.factory');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.factory');
goog.require('goog.object');


/**
 * Type of constant (cipher, hash, etc..).
 * @enum {string}
 */
e2e.openpgp.constants.Type = {
  'PUBLIC_KEY': 'PUBLIC_KEY',
  'SYMMETRIC_KEY': 'SYMMETRIC_KEY',
  'COMPRESSION': 'COMPRESSION',
  'HASH': 'HASH',
  'SIGNER': 'SIGNER'
};


/**
 * Generic term of an "Algorithm" as it's commonly used in this module.
 * @typedef {e2e.cipher.Algorithm|e2e.hash.Algorithm|
 *     e2e.compression.Algorithm|e2e.signer.Algorithm}
 */
e2e.openpgp.constants.Algorithm;


/**
 * Empty key ID.
 * @type {!e2e.ByteArray}
 * @const
 */
e2e.openpgp.constants.EMPTY_KEY_ID = [0, 0, 0, 0, 0, 0, 0, 0];


/**
 * The list of all constants divided by type.
 * @type {Object.<e2e.openpgp.constants.Type,
 *     Object.<e2e.openpgp.constants.Algorithm, number>>}
 */
e2e.openpgp.constants.NAME_TO_ID = {};

e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.PUBLIC_KEY] = {};
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SYMMETRIC_KEY] = {};
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.COMPRESSION] = {};
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.HASH] = {};
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SIGNER] = {};
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.PUBLIC_KEY][
    e2e.cipher.Algorithm.RSA] = 1;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.PUBLIC_KEY][
    e2e.cipher.Algorithm.ELGAMAL] = 16;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.PUBLIC_KEY][
    e2e.cipher.Algorithm.ECDH] = 18;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SYMMETRIC_KEY][
    e2e.cipher.Algorithm.PLAINTEXT] = 0;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SYMMETRIC_KEY][
    e2e.cipher.Algorithm.IDEA] = 1;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SYMMETRIC_KEY][
    e2e.cipher.Algorithm.TRIPLE_DES] = 2;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SYMMETRIC_KEY][
    e2e.cipher.Algorithm.CAST5] = 3;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SYMMETRIC_KEY][
    e2e.cipher.Algorithm.BLOWFISH] = 4;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SYMMETRIC_KEY][
    e2e.cipher.Algorithm.AES128] = 7;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SYMMETRIC_KEY][
    e2e.cipher.Algorithm.AES192] = 8;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SYMMETRIC_KEY][
    e2e.cipher.Algorithm.AES256] = 9;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SYMMETRIC_KEY][
    e2e.cipher.Algorithm.TWOFISH] = 10;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.COMPRESSION][
    e2e.compression.Algorithm.UNCOMPRESSED] = 0;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.COMPRESSION][
    e2e.compression.Algorithm.ZIP] = 1;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.COMPRESSION][
    e2e.compression.Algorithm.ZLIB] = 2;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.COMPRESSION][
    e2e.compression.Algorithm.BZIP2] = 3;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.HASH][
    e2e.hash.Algorithm.MD5] = 1;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.HASH][
    e2e.hash.Algorithm.SHA1] = 2;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.HASH][
    e2e.hash.Algorithm.RIPEMD] = 3;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.HASH][
    e2e.hash.Algorithm.SHA256] = 8;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.HASH][
    e2e.hash.Algorithm.SHA384] = 9;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.HASH][
    e2e.hash.Algorithm.SHA512] = 10;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.HASH][
    e2e.hash.Algorithm.SHA224] = 11;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SIGNER][
    e2e.signer.Algorithm.RSA] = 1;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SIGNER][
    e2e.signer.Algorithm.DSA] = 17;
e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SIGNER][
    e2e.signer.Algorithm.ECDSA] = 19;


/**
 * Maps all algorithms names to an ID by expanding NAME_TO_ID.
 * @type {Object.<e2e.openpgp.constants.Algorithm, number>}
 * @private
 */
e2e.openpgp.constants.NAME_TO_ID_ALL_ = {};
goog.object.extend(e2e.openpgp.constants.NAME_TO_ID_ALL_,
                   e2e.openpgp.constants.NAME_TO_ID[
                       e2e.openpgp.constants.Type.PUBLIC_KEY],
                   e2e.openpgp.constants.NAME_TO_ID[
                       e2e.openpgp.constants.Type.SYMMETRIC_KEY],
                   e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.COMPRESSION],
                   e2e.openpgp.constants.NAME_TO_ID[
                       e2e.openpgp.constants.Type.HASH],
                   e2e.openpgp.constants.NAME_TO_ID[
                       e2e.openpgp.constants.Type.SIGNER]);


/**
 * Does reverse mapping (id to Algorithm) for each constant type.
 * @type {Object.<e2e.openpgp.constants.Type,
 *     Object.<number, e2e.openpgp.constants.Algorithm>>}
 */
e2e.openpgp.constants.ID_TO_NAME = {};

e2e.openpgp.constants.ID_TO_NAME[
    e2e.openpgp.constants.Type.PUBLIC_KEY] = goog.object.transpose(
    e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.PUBLIC_KEY]);
// RSA is special in that it has algorithm ids 1, 2 and 3 registered.
e2e.openpgp.constants.ID_TO_NAME[
    e2e.openpgp.constants.Type.PUBLIC_KEY][2] =
    e2e.cipher.Algorithm.RSA;
e2e.openpgp.constants.ID_TO_NAME[
    e2e.openpgp.constants.Type.PUBLIC_KEY][3] =
    e2e.cipher.Algorithm.RSA;
e2e.openpgp.constants.ID_TO_NAME[
    e2e.openpgp.constants.Type.SYMMETRIC_KEY] = goog.object.transpose(
    e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SYMMETRIC_KEY]);
e2e.openpgp.constants.ID_TO_NAME[
    e2e.openpgp.constants.Type.COMPRESSION] = goog.object.transpose(
    e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.COMPRESSION]);
e2e.openpgp.constants.ID_TO_NAME[
    e2e.openpgp.constants.Type.HASH] = goog.object.transpose(
    e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.HASH]);
e2e.openpgp.constants.ID_TO_NAME[
    e2e.openpgp.constants.Type.SIGNER] = goog.object.transpose(
    e2e.openpgp.constants.NAME_TO_ID[
    e2e.openpgp.constants.Type.SIGNER]);


/**
 * Symmetric cipher used to encrypt messages.
 * @type {e2e.cipher.Algorithm}
 */
e2e.openpgp.constants.DEFAULT_SYMMETRIC_CIPHER = e2e.cipher.Algorithm.AES256;


/**
 * Returns the ID of a given object or throws an exception if invalid.
 * @param {e2e.openpgp.constants.Algorithm} algorithm The requested
 *     algorithm.
 * @return {number} The numeric id of the requested object.
 */
e2e.openpgp.constants.getId = function(algorithm) {
  return e2e.openpgp.constants.NAME_TO_ID_ALL_[algorithm];
};


/**
 * Finds the name of the algorithm.
 * @param {e2e.openpgp.constants.Type} type The type of constant to get.
 * @param {number} id The id to get the name of.
 * @return {e2e.openpgp.constants.Algorithm} The algorithm requested.
 */
e2e.openpgp.constants.getAlgorithm = function(type, id) {
  if (e2e.openpgp.constants.ID_TO_NAME.hasOwnProperty(type)) {
    var i2n = e2e.openpgp.constants.ID_TO_NAME[type];
    if (i2n.hasOwnProperty(id)) {
      return i2n[id];
    }
  }
  // A PublicKey in PGP may be either a cipher or a signer.
  if (type == e2e.openpgp.constants.Type.PUBLIC_KEY) {
    var i2n = e2e.openpgp.constants.ID_TO_NAME[
        e2e.openpgp.constants.Type.SIGNER];
    if (i2n.hasOwnProperty(id)) {
      return i2n[id];
    }
  }
  throw new e2e.openpgp.error.UnsupportedError(
      'Unsupported id: ' + id);
};


/**
 * Returns an instance of the requested object.
 * @param {e2e.openpgp.constants.Type} type Type of object to get.
 * @param {number|e2e.openpgp.constants.Algorithm} id The numeric id or
 *     Algorithm of the object to get.
 * @param {e2e.cipher.key.Key=} opt_key The key to use for ciphers.
 * @return {!e2e.hash.Hash|e2e.cipher.Cipher|
 *     e2e.compression.Compression|e2e.signer.Signer} An
 *     instance of the requested algorithm.
 */
e2e.openpgp.constants.getInstance = function(type, id, opt_key) {
  var algorithm;
  if (typeof id == 'number') {
    algorithm = e2e.openpgp.constants.getAlgorithm(type, id);
  } else {
    algorithm = id;
  }
  switch (type) {
    case e2e.openpgp.constants.Type.PUBLIC_KEY:
    case e2e.openpgp.constants.Type.SYMMETRIC_KEY:
      algorithm = /** @type {e2e.cipher.Algorithm} */ (algorithm);
      return e2e.cipher.factory.require(algorithm, opt_key);
      break;
    case e2e.openpgp.constants.Type.COMPRESSION:
      algorithm = /** @type {e2e.compression.Algorithm} */ (algorithm);
      return e2e.compression.factory.require(algorithm);
      break;
    case e2e.openpgp.constants.Type.HASH:
      algorithm = /** @type {e2e.hash.Algorithm} */ (algorithm);
      return e2e.hash.factory.require(algorithm);
    case e2e.openpgp.constants.Type.SIGNER:
      algorithm = /** @type {e2e.signer.Algorithm} */ (algorithm);
      return e2e.signer.factory.require(algorithm);
      break;
  }
  throw new e2e.openpgp.error.UnsupportedError(
      'Unsupported algorithm: ' + algorithm);
};
