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
 * @fileoverview Generates blocks from a list of packets.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.block.factory');

goog.require('e2e.openpgp.ByteStream');
goog.require('e2e.openpgp.asciiArmor');
goog.require('e2e.openpgp.block.Compressed');
goog.require('e2e.openpgp.block.EncryptedMessage');
goog.require('e2e.openpgp.block.LiteralMessage');
goog.require('e2e.openpgp.block.TransferableKey');
goog.require('e2e.openpgp.block.TransferablePublicKey');
goog.require('e2e.openpgp.block.TransferableSecretKey');
goog.require('e2e.openpgp.packet.Compressed');
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
 * @return {?e2e.openpgp.block.Block} The first block extracted or null.
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
  if (firstPacket instanceof e2e.openpgp.packet.Data ||
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
  var data = e2e.openpgp.asciiArmor.parse(ascii);
  return e2e.openpgp.block.factory.parseByteArray(
      data.data, data.charset);
};


/**
 * Parses a single block out of a ByteArray.
 * @param {!e2e.ByteArray} data ByteArray to parse into a block.
 * @param {string=} opt_charset The charset used to encode strings.
 * @return {e2e.openpgp.block.Block} The block extracted.
 */
e2e.openpgp.block.factory.parseByteArray = function(data, opt_charset) {
  var packets = e2e.openpgp.block.factory.byteArrayToPackets(data);
  var block = e2e.openpgp.block.factory.parseBlock(packets);
  if (block) {
    block.setCharset(opt_charset);
  }
  return block;
};


/**
 * Parses a multiple blocks out of ASCII Armor text.
 * @param {string} ascii ASCII armored text to parse into a block.
 * @return {!Array.<!e2e.openpgp.block.Block>} The blocks extracted.
 */
e2e.openpgp.block.factory.parseAsciiMulti = function(ascii) {
  var data = e2e.openpgp.asciiArmor.parse(ascii);
  return e2e.openpgp.block.factory.parseByteArrayMulti(
      data.data, data.charset);
};


/**
 * Parses a multiple blocks out of a ByteArray.
 * @param {!e2e.ByteArray} data ByteArray to parse into a block.
 * @param {string=} opt_charset The charset used to encode strings.
 * @return {!Array.<!e2e.openpgp.block.Block>} The blocks extracted.
 */
e2e.openpgp.block.factory.parseByteArrayMulti = function(data, opt_charset) {
  var packets = e2e.openpgp.block.factory.byteArrayToPackets(data);
  var blocks = [];
  while (packets.length) {
    var block = e2e.openpgp.block.factory.parseBlock(packets);
    if (block) {
      block.setCharset(opt_charset);
      blocks.push(block);
    }
  }
  return blocks;
};


/**
 * Parses packets out of a ByteArray. Does not modify the ByteArray.
 * @param {!e2e.ByteArray} data ByteArray to parse into packets.
 * @return {!Array.<!e2e.openpgp.packet.Packet>} The packets extracted.
 */
e2e.openpgp.block.factory.byteArrayToPackets = function(data) {
  var packets = [];
  var byteStream = new e2e.openpgp.ByteStream(data);
  while (byteStream.length) {
    var packet = e2e.openpgp.parse.parseSerializedPacket(byteStream);
    if (packet) {
      packets.push(packet);
    }
  }
  return packets;
};


/**
 * Extract key blocks from passed blocks array and returns Keys object. Keys
 *     serialization will not be included in the results, as this function
 *     should be called to display the results in the UI, where serialization
 *     is not needed.
 * @param  {!Array.<!e2e.openpgp.block.Block>} blocks Blocks to extract keys
 *     from.
 * @return {!e2e.openpgp.Keys} Extracted Keys.
 */
e2e.openpgp.block.factory.extractKeys = function(blocks) {
  /** @type {!e2e.openpgp.Keys} */
  var keys = [];
  for (var b = 0; b < blocks.length; b++) {
    if (blocks[b] instanceof e2e.openpgp.block.TransferableKey) {
      blocks[b].processSignatures();
      keys.push(blocks[b].toKeyObject(true));
    }
  }
  return keys;
};
