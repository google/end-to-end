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

goog.require('e2e.async.Result');
goog.require('e2e.debug.Console');
goog.require('e2e.openpgp.ByteStream');
goog.require('e2e.openpgp.asciiArmor');
goog.require('e2e.openpgp.block.Compressed');
goog.require('e2e.openpgp.block.EncryptedMessage');
goog.require('e2e.openpgp.block.LiteralMessage');
goog.require('e2e.openpgp.block.TransferablePublicKey');
goog.require('e2e.openpgp.block.TransferableSecretKey');
goog.require('e2e.openpgp.packet.Compressed');
goog.require('e2e.openpgp.packet.Data');
goog.require('e2e.openpgp.packet.EncryptedData');
goog.require('e2e.openpgp.packet.EncryptedSessionKey');
goog.require('e2e.openpgp.packet.LiteralData');
goog.require('e2e.openpgp.packet.Marker');
goog.require('e2e.openpgp.packet.OnePassSignature');
goog.require('e2e.openpgp.packet.PrivateUse');
goog.require('e2e.openpgp.packet.PublicKey');
goog.require('e2e.openpgp.packet.SecretKey');
goog.require('e2e.openpgp.packet.Signature');
goog.require('e2e.openpgp.parse');
goog.require('goog.async.DeferredList');


/**
 * Parses a single block out of an array of packets. Consumes packets parsed.
 * RFC 4880 Section 11.1, 11.2, 11.3.
 * @param {!Array.<!e2e.openpgp.packet.Packet>} packets Packets to extract.
 * @return {?e2e.openpgp.block.Block} The first block extracted or null.
 * @deprecated Use parseGeneric() which returns either a message or
 * a complete keyring, or the more specific parseMessage() and
 * parseAllTransferableKeys() methods.
 */
e2e.openpgp.block.factory.parseBlock = function(packets) {
  if (packets.length < 1) {
    return null;
  }
  var firstPacket = packets[0];
  if (e2e.openpgp.block.factory.isMessageStart_(firstPacket)) {
    return e2e.openpgp.block.factory.parseMessage(packets);
  } else if (e2e.openpgp.block.factory.isTransferableKeyStart_(firstPacket)) {
    return e2e.openpgp.block.factory.parseTransferableKey(packets);
  } else {
    e2e.openpgp.block.factory.console_.warn(
        'Unexpected packet while parsing block', firstPacket);
    throw new Error('Not a valid block.');
  }
};


/**
 * Parses a single block out of ASCII Armor text.
 * @param {string} ascii ASCII armored text to parse into a block.
 * @return {e2e.openpgp.block.Block} The block extracted.
 * @deprecated Use parseAsciiGeneric() which returns either
 * a message or the complete keyring from this text, or the more
 * specific parseAsciiMessage() and parseAsciiAllTransferableKeys()
 * methods.
 */
e2e.openpgp.block.factory.parseAscii = function(ascii) {
  var data = e2e.openpgp.asciiArmor.parse(ascii);
  return e2e.openpgp.block.factory.parseByteArray(
      data.data, data.charset);
};


/**
 * Parses multiple blocks out of ASCII Armor text.
 * @param {string} ascii ASCII armored text to parse into a block.
 * @return {!Array.<!e2e.openpgp.block.Block>} The blocks extracted.
 * @deprecated Use parseAsciiGeneric() which returns either
 * a message or the complete keyring from this text, or the more
 * specific parseAsciiMessage() and parseAsciiAllTransferableKeys()
 * methods.
 */
e2e.openpgp.block.factory.parseAsciiMulti = function(ascii) {
  var data = e2e.openpgp.asciiArmor.parse(ascii);
  return e2e.openpgp.block.factory.parseByteArrayMulti(
      data.data, data.charset);
};


/**
 * Parses multiple blocks out of a ByteArray.
 * @param {!e2e.ByteArray} data ByteArray to parse into a block.
 * @param {string=} opt_charset The charset used to encode strings.
 * @return {!Array.<!e2e.openpgp.block.Block>} The blocks extracted.
 * @deprecated Use parseByteArrayGeneric() which returns either
 * a message, or the complete keyring from this data, or the more
 * specific parseByteArrayMessage() and parseByteArrayAllTransferableKeys()
 * methods.
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
 * Parses a single block out of a ByteArray.
 * @param {!e2e.ByteArray} data ByteArray to parse into a block.
 * @param {string=} opt_charset The charset used to encode strings.
 * @return {e2e.openpgp.block.Block} The block extracted.
 * @deprecated Use parseByteArrayGeneric() which returns either
 * a message, or the complete keyring from this data, or the more
 * specific parseByteArrayMessage() and parseByteArrayAllTransferableKeys()
 * methods.
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
 * Parses a message or keyring from ASCII Armor text. If you already
 * know the type of data you expect, please use parseAsciiMessage()
 * or parseAsciiAllTransferableKeys() instead.
 * @param {string} ascii ASCII armored text to parse.
 * @return
 *    {e2e.openpgp.block.Message|Array.<!e2e.openpgp.block.TransferableKey>}
 * a message, or all the keys in this armor text, or null.
 */
e2e.openpgp.block.factory.parseAsciiGeneric = function(ascii) {
  var data = e2e.openpgp.asciiArmor.parse(ascii);
  return e2e.openpgp.block.factory.parseByteArrayGeneric(
      data.data, data.charset);
};


/**
 * Parses a message or keyring out of a ByteArray. If you already
 * know the type of data you expect, please use parseByteArrayMessage()
 * or parseByteArrayAllTransferableKeys() instead.
 * @param {!e2e.ByteArray} data ByteArray to parse into a message or keyring.
 * @param {string=} opt_charset The charset used to encode strings.
 * @return
 *     {e2e.openpgp.block.Message|Array.<!e2e.openpgp.block.TransferableKey>}
 * a message, or all the keys in this bytearray, or null.
 */
e2e.openpgp.block.factory.parseByteArrayGeneric = function(data, opt_charset) {
  var packets = e2e.openpgp.block.factory.byteArrayToPackets(data);
  var block = e2e.openpgp.block.factory.parseGeneric(packets);
  if (block) {
    block.setCharset(opt_charset);
  }
  return block;
};


/**
 * Parses a message or keyring out of a packet sequence. Consumes
 * all the packets, or throws an error if there are packets left
 * after processing.
 * RFC 4880 Section 11.1, 11.2, 11.3.
 * @param {!Array.<!e2e.openpgp.packet.Packet>} packets packet sequence.
 * @return
 *     {e2e.openpgp.block.Message|Array.<!e2e.openpgp.block.TransferableKey>}
 * the message, or keyring, or null if there was no data.
 */
e2e.openpgp.block.factory.parseGeneric = function(packets) {
  if (packets.length < 1) {
    return null;
  }
  var firstPacket = packets[0];
  if (e2e.openpgp.block.factory.isMessageStart_(firstPacket)) {
    return e2e.openpgp.block.factory.parseMessage(packets);
  } else if (e2e.openpgp.block.factory.isTransferableKeyStart_(firstPacket)) {
    return e2e.openpgp.block.factory.parseAllTransferableKeys(packets);
  } else {
    e2e.openpgp.block.factory.console_.warn(
        'Unexpected packet while parsing block', firstPacket);
    throw new Error('Not a valid block.');
  }
};


/**
 * Parses a message block out of an array of packets. Consumes
 * packets parsed, and ensures there are no trailing packets.
 * RFC 4880 Section 11.3.
 * @param {!Array.<!e2e.openpgp.packet.Packet>} packets Packets to extract.
 * @return {e2e.openpgp.block.Message} The first message extracted or null.
 */
e2e.openpgp.block.factory.parseMessage = function(packets) {
  /**
   * @type {!e2e.openpgp.block.Message}
   */
  var block;
  if (packets.length < 1) {
    return null;
  }
  var signatures = [], onepass = [];
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
  }
  if (!block) {
    e2e.openpgp.block.factory.console_.warn(
        'Unexpected packet in message block', firstPacket);
    throw new Error('Not a valid message block.');
  }
  if (packets.length > 0) {
    throw new Error('Unexpected packets following message block.');
  }
  return block;
};


/**
 * Parses a message from ASCII Armor text.
 * @param {string} ascii ASCII armored text to parse.
 * @return {e2e.openpgp.block.Message} message, or null.
 */
e2e.openpgp.block.factory.parseAsciiMessage = function(ascii) {
  var data = e2e.openpgp.asciiArmor.parse(ascii);
  return e2e.openpgp.block.factory.parseByteArrayMessage(
      data.data, data.charset);
};


/**
 * Parses a single message block out of a ByteArray.
 * @param {!e2e.ByteArray} data ByteArray to parse into a message.
 * @param {string=} opt_charset The charset used to encode strings.
 * @return {e2e.openpgp.block.Message} The message extracted, or null
 * if the data is empty.
 */
e2e.openpgp.block.factory.parseByteArrayMessage = function(data, opt_charset) {
  var packets = e2e.openpgp.block.factory.byteArrayToPackets(data);
  var block = e2e.openpgp.block.factory.parseMessage(packets);
  if (block) {
    block.setCharset(opt_charset);
  }
  return block;
};


/**
 * Parses a single key block out of an array of packets. Consumes
 * packets parsed.
 * RFC 4880 Section 11.1, 11.2.
 * @param {!Array.<e2e.openpgp.packet.Packet>} packets Packets to extract.
 * @return {e2e.openpgp.block.TransferableKey} The first key block
 * extracted or null.
 */
e2e.openpgp.block.factory.parseTransferableKey = function(packets) {
  if (packets.length < 1) {
    return null;
  }
  var block;
  var firstPacket = packets[0];
  if (firstPacket instanceof e2e.openpgp.packet.SecretKey) {
    block = new e2e.openpgp.block.TransferableSecretKey();
    block.parse(packets);
  } else if (firstPacket instanceof e2e.openpgp.packet.PublicKey) {
    block = new e2e.openpgp.block.TransferablePublicKey();
    block.parse(packets);
  } else {
    e2e.openpgp.block.factory.console_.warn(
        'Unexpected packet in key block', firstPacket);
    throw new Error('Not a valid key block.');
  }
  return block;
};


/**
 * Parses a single key block out of a ByteArray.
 * @param {!e2e.ByteArray} data ByteArray to parse into a key block.
 * @param {string=} opt_charset The charset used to encode strings.
 * @return {e2e.openpgp.block.TransferableKey} The first key block
 * extracted, or null.
 */
e2e.openpgp.block.factory.parseByteArrayTransferableKey = function(
    data, opt_charset) {
  var packets = e2e.openpgp.block.factory.byteArrayToPackets(data);
  var block = e2e.openpgp.block.factory.parseTransferableKey(packets);
  if (block) {
    block.setCharset(opt_charset);
  }
  return block;
};


/**
 * Parses all key blocks out of a ByteArray.
 * @param {!e2e.ByteArray} data ByteArray to parse into transferable keys.
 * @param {boolean=} opt_skiponerror true to skip over keys with errors,
 *     and defaults to false.
 * @param {string=} opt_charset The charset used to encode strings.
 * @return {!Array.<!e2e.openpgp.block.TransferableKey>} The extracted keys.
 */
e2e.openpgp.block.factory.parseByteArrayAllTransferableKeys = function(
    data, opt_skiponerror, opt_charset) {
  // This code runs in two phases.
  // Phase 1:
  //   Convert the bytearray into an array of packets. Certain types
  //   of errors occur here (eg: key packets with small key-lengths.)
  //   Such packets are dropped if requested.
  // Phase 2:
  //   Scan the resultant array of packets and collect them into key
  //   blocks. Other categories of errors (eg: invalid key block
  //   sequences) may occur here. If requested, this phase will
  //   discard packets on such errors until it sees the start of a new
  //   key block.
  // Note:
  //   Key blocks may collect user ids and signatures that are
  //   invalid, and should never be used until all signatures are
  //   processed.
  var packets = e2e.openpgp.block.factory.byteArrayToPackets(
      data, opt_skiponerror);
  return e2e.openpgp.block.factory.parseAllTransferableKeys(
      packets, opt_skiponerror, opt_charset);
};


/**
 * Parses all key blocks out of a list of packets. Consumes packets parsed.
 * @param {!Array.<e2e.openpgp.packet.Packet>} packets Packets to parse.
 * @param {boolean=} opt_skiponerror true to skip over keys with errors,
 *     and defaults to false.
 * @param {string=} opt_charset The charset used to encode strings.
 * @return {!Array.<!e2e.openpgp.block.TransferableKey>} The extracted keys.
 */
e2e.openpgp.block.factory.parseAllTransferableKeys = function(
    packets, opt_skiponerror, opt_charset) {
  var blocks = [];
  while (packets.length) {
    try {
      var block = e2e.openpgp.block.factory.parseTransferableKey(packets);
      if (block) {
        block.setCharset(opt_charset);
        blocks.push(block);
      }
    } catch (e) {
      if (opt_skiponerror) {
        // discards packets up to the next keyblock
        e2e.openpgp.block.factory.skipToNextKey_(packets);
      } else {
        throw e;
      }
    }
  }
  return blocks;
};


/**
 * Parses a complete keyring from ASCII Armor text.
 * @param {string} ascii ASCII armored text to parse.
 * @param {boolean=} opt_skiponerror true to skip over keys with errors,
 *     and defaults to false.
 * @return {!Array.<!e2e.openpgp.block.TransferableKey>} The extracted keys.
 */
e2e.openpgp.block.factory.parseAsciiAllTransferableKeys = function(
    ascii, opt_skiponerror) {
  var data = e2e.openpgp.asciiArmor.parse(ascii);
  return e2e.openpgp.block.factory.parseByteArrayAllTransferableKeys(
      data.data, opt_skiponerror, data.charset);
};


/**
 * Parses packets out of a ByteArray, while skipping any
 * private-use packets. Does not modify the ByteArray.
 * @param {!e2e.ByteArray} data ByteArray to parse into packets.
 * @param {boolean=} opt_skiponerror true to skip packets with errors,
 *     and defaults to false.
 * @return {!Array.<!e2e.openpgp.packet.Packet>} The packets extracted.
 */
e2e.openpgp.block.factory.byteArrayToPackets = function(data, opt_skiponerror) {
  var packets = [];
  var byteStream = new e2e.openpgp.ByteStream(data);
  while (byteStream.length) {
    try {
      var packet = e2e.openpgp.parse.parseSerializedPacket(byteStream);
      if (packet &&
          !(packet instanceof e2e.openpgp.packet.PrivateUse) &&
          !(packet instanceof e2e.openpgp.packet.Marker)) {
        packets.push(packet);
      }
    } catch (e) {
      if (opt_skiponerror) {
        e2e.openpgp.block.factory.console_.warn(
            'Skipping packet', e);
      }
      else {
        throw e;
      }
    }
  }
  return packets;
};


/**
 * Extract key blocks from passed transferable key array and returns
 *     Keys object. Keys serialization will not be included in the
 *     results, as this function should be called to display the
 *     results in the UI, where serialization is not needed.
 * @param {!Array.<!e2e.openpgp.block.TransferableKey>} blocks Blocks
 *     to extract keys from.
 * @param {boolean=} opt_skiponerror true to skip keys with errors,
 *     and defaults to false.
 * @return {!e2e.async.Result<!e2e.openpgp.Keys>} Extracted Keys.
 */
e2e.openpgp.block.factory.extractKeys = function(blocks, opt_skiponerror) {
  /** @type {!e2e.async.Result<!e2e.openpgp.Keys>} */
  var result = new e2e.async.Result();
  goog.async.DeferredList.gatherResults(blocks.map(function(block) {
    return block.processSignatures().addCallbacks(function() {
      return block.toKeyObject(true);
    }, function(e) {
      if (opt_skiponerror) {
        e2e.openpgp.block.factory.console_.warn('Discarding key', e.message);
        return null;  // Converts the errback into a callback(null)
      } else {
        throw e;
      }
    });
  })).addCallback(function(keys) {
    result.callback(keys.filter(goog.isDefAndNotNull));
  }).addErrback(result.errback, result);
  return result;
};


/**
 * Discard packets until we see something that looks like the
 * start of a key block.
 * @param {!Array.<!e2e.openpgp.packet.Packet>} packets
 * @private
 */
e2e.openpgp.block.factory.skipToNextKey_ = function(packets) {
  while (packets.length) {
    var firstPacket = packets[0];
    if (e2e.openpgp.block.factory.isTransferableKeyStart_(firstPacket)) {
      return;
    }
    e2e.openpgp.block.factory.console_.info(
        'Discarding packet', firstPacket);
    packets.shift();
  }
};


/**
 * @param {!e2e.openpgp.packet.Packet} packet
 * @return {boolean} true if this packet could be the start of
 * a transferable key.
 * @private
 */
e2e.openpgp.block.factory.isTransferableKeyStart_ = function(packet) {
  return (packet instanceof e2e.openpgp.packet.SecretKey) ||
      (packet instanceof e2e.openpgp.packet.PublicKey);
};


/**
 * @param {!e2e.openpgp.packet.Packet} packet
 * @return {boolean} true if this packet could be the start of
 * a message block.
 * @private
 */
e2e.openpgp.block.factory.isMessageStart_ = function(packet) {
  return (packet instanceof e2e.openpgp.packet.Signature) ||
      (packet instanceof e2e.openpgp.packet.OnePassSignature) ||
      (packet instanceof e2e.openpgp.packet.Data) ||
      (packet instanceof e2e.openpgp.packet.EncryptedSessionKey);
};


/**
 * @private {!e2e.debug.Console}
 */
e2e.openpgp.block.factory.console_ = e2e.debug.Console.getConsole(
    'e2e.openpgp.block.factory');
