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
 * @fileoverview Compressed Data packet (Tag 8).
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.openpgp.packet.Compressed');

goog.require('e2e.async.Result');
goog.require('e2e.compression.Algorithm');
goog.require('e2e.compression.factory');
goog.require('e2e.openpgp.constants');
goog.require('e2e.openpgp.constants.Type');
goog.require('e2e.openpgp.packet.Data');
goog.require('e2e.openpgp.packet.factory');
goog.require('goog.array');



/**
 * Representation of a Compressed Data packet.
 * @param {e2e.compression.Algorithm} algorithm The compression
 *     algorithm.
 * @param {!e2e.ByteArray} compressedData The compressed data.
 * @extends {e2e.openpgp.packet.Data}
 * @constructor
 */
e2e.openpgp.packet.Compressed = function(algorithm, compressedData) {
  goog.base(this);
  /**
   * The data compression algorithm.
   * @type {e2e.compression.Algorithm}
   * @protected
   */
  this.algorithm = algorithm;
  /**
   * The compressed data.
   * @type {!e2e.ByteArray}
   * @protected
   */
  this.compressedData = compressedData;
  /** @inheritDoc */
  this.data = [];
};
goog.inherits(e2e.openpgp.packet.Compressed,
    e2e.openpgp.packet.Data);


/** @inheritDoc */
e2e.openpgp.packet.Compressed.prototype.tag = 8;


/**
 * Decompresses the compressedData and populates this.data.
 */
e2e.openpgp.packet.Compressed.prototype.decompress = function() {
  var compress = e2e.compression.factory.require(this.algorithm);
  this.data = /** @type {!e2e.ByteArray} */ (
      e2e.async.Result.getValue(compress.decompress(this.compressedData)));
};


/**
 * Makes a compressed packet starting with uncompressed data, typically a
 * serialized literal data packet.
 * @param {!e2e.ByteArray} data The data to compress.
 * @return {e2e.openpgp.packet.Compressed} packet.
 */
e2e.openpgp.packet.Compressed.construct = function(data) {
  // TODO(adhintz) Add optional parameter specifying the compression algorithm.
  var algorithm = e2e.compression.factory.require(
      e2e.compression.Algorithm.ZLIB);
  var compressedData = /** @type {!e2e.ByteArray} */ (
      e2e.async.Result.getValue(algorithm.compress(data)));
  return new e2e.openpgp.packet.Compressed(algorithm.algorithm,
      compressedData);
};


/** @inheritDoc */
e2e.openpgp.packet.Compressed.prototype.serializePacketBody = function() {
  var id = e2e.openpgp.constants.getId(this.algorithm);
  return goog.array.concat(id, this.compressedData);
};


/**
 * Parses and extracts the data from the body.
 * Throws a {@code e2e.openpgp.error.ParseError} if malformed.
 * @param {!e2e.ByteArray} body The data to parse.
 * @return {e2e.openpgp.packet.Compressed} packet.
 */
e2e.openpgp.packet.Compressed.parse = function(body) {
  var algorithm = /** @type {e2e.compression.Algorithm} */ (
      e2e.openpgp.constants.getAlgorithm(
          e2e.openpgp.constants.Type.COMPRESSION,
          body.shift()));
  return new e2e.openpgp.packet.Compressed(algorithm, body);
};


e2e.openpgp.packet.factory.add(e2e.openpgp.packet.Compressed);
