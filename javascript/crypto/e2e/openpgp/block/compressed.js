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
 * @fileoverview Compressed Message Blocks contain another block.
 */

goog.provide('e2e.openpgp.block.Compressed');

goog.require('e2e.openpgp.block.Message');
goog.require('e2e.openpgp.packet.Compressed');


/**
 * Representation of a compressed message block.
 * @param {Array.<e2e.openpgp.packet.Signature>=} opt_signatures
 * @constructor
 * @extends {e2e.openpgp.block.Message}
 */
e2e.openpgp.block.Compressed = function(opt_signatures) {
  goog.base(this, opt_signatures);
};
goog.inherits(e2e.openpgp.block.Compressed,
    e2e.openpgp.block.Message);


/** @inheritDoc */
e2e.openpgp.block.Compressed.prototype.getData = function() {
  return this.compressedPacket_;
};


/** @override */
e2e.openpgp.block.Compressed.prototype.serializeMessage = function() {
  return this.compressedPacket_.compressedData;
};


/**
 * Extracts a block from the compressed data.
 * @return {e2e.openpgp.block.Block}
 */
e2e.openpgp.block.Compressed.prototype.getBlock = function() {
  this.compressedPacket_.decompress();
  var data = this.compressedPacket_.data;
  var decryptedBlock = e2e.openpgp.block.factory.parseByteArrayMulti(data);
  if (decryptedBlock.length != 1) {
    throw new e2e.openpgp.error.ParseError('Invalid compressed block.');
  }
  return decryptedBlock[0];
};


/** @override */
e2e.openpgp.block.Compressed.prototype.parse = function(packets) {
  if (packets[0] instanceof e2e.openpgp.packet.Compressed) {
    this.compressedPacket_ = packets.shift();
  }
  return packets;
};
