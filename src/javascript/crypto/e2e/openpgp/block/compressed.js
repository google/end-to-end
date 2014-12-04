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
 * @fileoverview Compressed Message Blocks contain another block.
 */

goog.provide('e2e.openpgp.block.Compressed');

goog.require('e2e.openpgp.block.Message');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.packet.Compressed');



/**
 * Representation of a compressed message block.
 * @param {Array.<!e2e.openpgp.packet.Signature>=} opt_signatures
 * @constructor
 * @extends {e2e.openpgp.block.Message}
 */
e2e.openpgp.block.Compressed = function(opt_signatures) {
  goog.base(this, opt_signatures);
};
goog.inherits(e2e.openpgp.block.Compressed,
    e2e.openpgp.block.Message);


/**
 * Maximum nesting level of compressed blocks - see CVE-2013-4402
 * @const {number}
 */
e2e.openpgp.block.Compressed.prototype.MAX_COMPRESSION_NESTING_LEVEL = 20;


/** @override */
e2e.openpgp.block.Compressed.prototype.serializeMessage = function() {
  return this.compressedPacket_.compressedData;
};


/**
 * Extracts a Message from the compressed data.
 * @return {!e2e.openpgp.block.Message}
 * TODO(user) gpg accepts compressed keyrings, add additional
 * methods as needed.
 */
e2e.openpgp.block.Compressed.prototype.getMessage = function() {
  this.compressedPacket_.decompress();
  var data = this.compressedPacket_.data;
  // TODO(user): Can this be refactored to avoid the circular dependency?
  /** @suppress {missingRequire} We assume the factory is already present. */
  var message = e2e.openpgp.block.factory.parseByteArrayMessage(data);
  if (!message) {
    throw new e2e.openpgp.error.ParseError('Empty compressed block.');
  }
  return message;
};


/** @override */
e2e.openpgp.block.Compressed.prototype.getLiteralMessage = function() {
  var msgBlock = this, currentLevel = 0;
  while (msgBlock instanceof e2e.openpgp.block.Compressed) {
    if (currentLevel >= this.MAX_COMPRESSION_NESTING_LEVEL) {
      throw new e2e.openpgp.error.ParseError(
          'input data with too deeply nested packets');
    }
    msgBlock = msgBlock.getMessage();
    currentLevel++;
  }
  return msgBlock.getLiteralMessage();
};


/** @override */
e2e.openpgp.block.Compressed.prototype.parse = function(packets) {
  if (packets[0] instanceof e2e.openpgp.packet.Compressed) {
    this.compressedPacket_ = packets.shift();
  }
  return packets;
};
