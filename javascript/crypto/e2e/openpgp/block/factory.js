// Copyright 2012 Google Inc. All Rights Reserved.
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
 * @fileoverview Generates blocks from a list of packets.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.block.factory');

goog.require('e2e.openpgp.asciiArmor');
goog.require('e2e.openpgp.block.Compressed');
goog.require('e2e.openpgp.block.EncryptedMessage');
goog.require('e2e.openpgp.block.LiteralMessage');
goog.require('e2e.openpgp.block.TransferablePublicKey');
goog.require('e2e.openpgp.block.TransferableSecretKey');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.packet.Data');
goog.require('e2e.openpgp.packet.EncryptedData');
goog.require('e2e.openpgp.packet.EncryptedSessionKey');
goog.require('e2e.openpgp.packet.LiteralData');
goog.require('e2e.openpgp.packet.Marker');
goog.require('e2e.openpgp.packet.OnePassSignature');
goog.require('e2e.openpgp.packet.PublicKey');
goog.require('e2e.openpgp.packet.SecretKey');
goog.require('e2e.openpgp.packet.Signature');
goog.require('e2e.openpgp.parse');


/**
 * Parses a single block out of an array of packets. Consumes packets parsed.
 * RFC 4880 Section 11.3.
 * @param {!Array.<e2e.openpgp.packet.Packet>} packets Packets to extract.
 * @return {e2e.openpgp.block.Block} The first block extracted.
 */
e2e.openpgp.block.factory.parseBlock = function(packets) {
  /**
   * @type {!e2e.openpgp.block.Block}
   */
  var block;
  if (packets.length < 1) {
    return null;
  }
  var signatures = [], onepass = [];
  while (packets[0] instanceof e2e.openpgp.packet.Marker) {
    packets.shift();
  }
  var firstPacket = packets[0];
  while (firstPacket instanceof e2e.openpgp.packet.Signature ||
         firstPacket instanceof e2e.openpgp.packet.OnePassSignature) {
    if (firstPacket instanceof e2e.openpgp.packet.OnePassSignature) {
      onepass.push(packets[0]);
    }
    signatures.push(packets.shift());
    firstPacket = packets[0];
  }
  if (
    firstPacket instanceof e2e.openpgp.packet.Data ||
    firstPacket instanceof e2e.openpgp.packet.EncryptedSessionKey) {
    if (firstPacket instanceof e2e.openpgp.packet.EncryptedData ||
       firstPacket instanceof e2e.openpgp.packet.EncryptedSessionKey) {
      block = new e2e.openpgp.block.EncryptedMessage(signatures);
      block.parse(packets);
    } else if (firstPacket instanceof e2e.openpgp.packet.LiteralData) {
      block = new e2e.openpgp.block.LiteralMessage(signatures);
      block.parse(packets);
    } else if (firstPacket instanceof e2e.openpgp.packet.Compressed) {
      block = new e2e.openpgp.block.Compressed(signatures);
      block.parse(packets);
    }
    block.consumeOnePassSignatures(onepass, packets);
  } else if (
    firstPacket instanceof e2e.openpgp.packet.EncryptedSessionKey) {
    block = new e2e.openpgp.block.EncryptedMessage(signatures);
    block.parse(packets);
  } else if (firstPacket instanceof e2e.openpgp.packet.SecretKey) {
    block = new e2e.openpgp.block.TransferableSecretKey();
    block.parse(packets);
  } else if (firstPacket instanceof e2e.openpgp.packet.PublicKey) {
    block = new e2e.openpgp.block.TransferablePublicKey();
    block.parse(packets);
  }
  if (!block) {
    throw new Error('No valid block.');
  }

  return block;
};

/**
 * Parses a single block out of ASCII Armor text.
 * @param {string} ascii ASCII armored text to parse into a block.
 * @return {e2e.openpgp.block.Block} The block extracted.
 */
e2e.openpgp.block.factory.parseAscii = function(ascii) {
  var data = e2e.openpgp.asciiArmor.parse(ascii).data;
  return e2e.openpgp.block.factory.parseByteArray(data);
};

/**
 * Parses a single block out of a ByteArray.
 * @param {e2e.ByteArray} data ByteArray to parse into a block.
 * @return {e2e.openpgp.block.Block} The block extracted.
 */
e2e.openpgp.block.factory.parseByteArray = function(data) {
  var packets = [];
  while (data.length) {
    packets.push(e2e.openpgp.parse.parseSerializedPacket(data));
  }
  return e2e.openpgp.block.factory.parseBlock(packets);
};

/**
 * Parses a multiple blocks out of ASCII Armor text.
 * @param {string} ascii ASCII armored text to parse into a block.
 * @return {Array.<e2e.openpgp.block.Block>} The blocks extracted.
 */
e2e.openpgp.block.factory.parseAsciiMulti = function(ascii) {
  var data = e2e.openpgp.asciiArmor.parse(ascii).data;
  return e2e.openpgp.block.factory.parseByteArrayMulti(data);
};

/**
 * Parses a multiple blocks out of a ByteArray.
 * @param {e2e.ByteArray} data ByteArray to parse into a block.
 * @return {Array.<e2e.openpgp.block.Block>} The blocks extracted.
 */
e2e.openpgp.block.factory.parseByteArrayMulti = function(data) {
  var packets = [];
  while (data.length) {
    packets.push(e2e.openpgp.parse.parseSerializedPacket(data));
  }
  var blocks = [];
  while (packets.length) {
    goog.array.extend(blocks,
        e2e.openpgp.block.factory.parseBlock(packets));
  }
  return blocks;
};

