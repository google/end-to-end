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
 * @fileoverview Methods for parsing blocks, messages and packets.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.parse');

goog.require('e2e.debug.Console');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.packet.factory');
goog.require('goog.array');


/**
 * Defines the packet's length size from the first 2 bits of the tag.
 * @type {!Array.<number>}
 * @const
 * @private
 */
e2e.openpgp.parse.LBITS_TO_PACKET_LENGTH_SIZE_ = [1, 2, 4];


/**
 * Value that instructs old format packets to consume all packet body.
 * @type {number}
 * @const
 * @private
 */
e2e.openpgp.parse.CONSUME_ALL_PACKET_BODY_ = 3;


/**
 * Calculates the body of an old packet format (RFC 4880 Section 4.2.1).
 * Note it will consume the required bytes from the data, so that multiple
 * calls with the same data parse sequential packets.
 * Will throw a ParseError if the packet is invalid.
 * @param {number} lbits The 2 last bits of the packet tag.
 * @param {!(e2e.ByteArray|e2e.openpgp.ByteStream)} data The data of
 *     the packet.
 * @return {!Array.<number>} The body of the packet.
 * @private
 */
e2e.openpgp.parse.getBodyOldFormatPacket_ = function(lbits, data) {
  var packetLength;
  if (lbits == e2e.openpgp.parse.CONSUME_ALL_PACKET_BODY_) {
    // This means all data available is part of the packet.
    packetLength = data.length;
  } else {
    var packetLengthSize =
        e2e.openpgp.parse.LBITS_TO_PACKET_LENGTH_SIZE_[lbits];
    var packetLengthBytes = data.splice(0, packetLengthSize).reverse();
    packetLength = goog.array.reduce(packetLengthBytes, function(r, v, exp) {
      return r + (v * Math.pow(0x100, exp));
    }, 0);
  }

  if (data.length < packetLength) {
    throw new e2e.openpgp.error.ParseError(
        'invalid packet length old format');
  }
  return data.splice(0, packetLength);
};


/**
 * The mask to use to figure out whether the packet is old format or new format.
 * @type {number}
 * @const
 * @private
 */
e2e.openpgp.parse.PACKET_FORMAT_MASK_ = 0x40;


/**
 * Returns whether a packet tag is old format (RFC 4880 Section 4.2).
 * @param {number} ptag The first byte of the packet.
 * @return {boolean} Whether the ptag is old format.
 * @private
 */
e2e.openpgp.parse.isOldFormatPacket_ = function(ptag) {
  return !(ptag & e2e.openpgp.parse.PACKET_FORMAT_MASK_);
};


/**
 * Minimum value for a two bytes packet length.
 * @type {number}
 * @const
 */
e2e.openpgp.parse.TWO_BYTE_LENGTH_MIN = 192;


/**
 * Minimum value for a partial body length.
 * @type {number}
 * @const
 * @private
 */
e2e.openpgp.parse.PARTIAL_BODY_LENGTH_MIN_ = 224;


/**
 * Mask to extract the length of a partial body length.
 * @type {number}
 * @const
 * @private
 */
e2e.openpgp.parse.PARTIAL_BODY_LENGTH_MASK_ = 0x1F;


/**
 * Value for a five bytes packet length.
 * @type {number}
 * @const
 */
e2e.openpgp.parse.FIVE_BYTE_LENGTH_VAL = 255;


/**
 * Parses the body out of a packet with new format (RFC 4880 Section 4.2.2).
 * Note it will consume the required bytes from the data, so that multiple
 * calls with the same data parse sequential packets.
 * Throws a {@see e2e.openpgp.error.ParseError} if the packet is invalid.
 * @param {!(e2e.ByteArray|e2e.openpgp.ByteStream)} data The data to
 *     parse.
 * @return {!Array.<number>} The body of the packet.
 * @private
 */
e2e.openpgp.parse.getBodyNewFormatPacket_ = function(data) {
  var body = [];
  var incompletePacket = true;
  var packetLength;

  while (incompletePacket) {
    incompletePacket = false;
    var firstByte = data.shift();

    if (firstByte < e2e.openpgp.parse.TWO_BYTE_LENGTH_MIN) {
      // One byte length packet size.
      packetLength = firstByte;
    } else if (firstByte < e2e.openpgp.parse.PARTIAL_BODY_LENGTH_MIN_) {
      // Two bytes length packet size.
      var secondByte = data.shift();
      packetLength = (
          (firstByte - e2e.openpgp.parse.TWO_BYTE_LENGTH_MIN) << 8) +
          (secondByte + e2e.openpgp.parse.TWO_BYTE_LENGTH_MIN);
    } else if (firstByte == e2e.openpgp.parse.FIVE_BYTE_LENGTH_VAL) {
      // Five bytes length packet size.
      var packetLengthBytes = data.splice(0, 4).reverse();
      packetLength = goog.array.reduce(packetLengthBytes, function(r, b, exp) {
        return r + (b * Math.pow(0x100, exp));
      }, 0);
    } else {
      // Partial body length.
      incompletePacket = true;
      packetLength = Math.pow(
          2, firstByte & e2e.openpgp.parse.PARTIAL_BODY_LENGTH_MASK_);
    }

    if (packetLength <= data.length) {
      goog.array.extend(body, data.splice(0, packetLength));
    } else {
      throw new e2e.openpgp.error.ParseError(
          'invalid packet length new format');
    }
  }
  return body;
};


/**
 * Mask to extract the ptag bit to see if it's a valid packet.
 * @type {number}
 * @const
 * @private
 */
e2e.openpgp.parse.P_TAG_TEST_MASK_ = 0x80;


/**
 * Mask to extract the value out of a packet's tag.
 * @type {number}
 * @const
 * @private
 */
e2e.openpgp.parse.P_TAG_VALUE_MASK_ = 0x3F;


/**
 * Number of bits to shift from the tag in old packets.
 * @type {number}
 * @const
 * @private
 */
e2e.openpgp.parse.P_TAG_OLD_PACKET_SHIFT_ = 2;


/**
 * Parses a packet and calls the specific subpacket class if available.
 * Specified in RFC 4880 Section 4.
 * Throws a {@code e2e.openpgp.error.ParseError} if the packet is invalid.
 * @param {!(e2e.ByteArray|e2e.openpgp.ByteStream)} data
 *     The data to parse as a packet.
 * @return {e2e.openpgp.packet.Packet} The packet generated.
 */
e2e.openpgp.parse.parseSerializedPacket = function(data) {
  var ptype, body;
  var ptag = data.shift();
  if ((ptag & e2e.openpgp.parse.P_TAG_TEST_MASK_) == 0) {
    throw new e2e.openpgp.error.ParseError('invalid packet tag bit');
  }
  ptype = ptag & e2e.openpgp.parse.P_TAG_VALUE_MASK_;
  if (e2e.openpgp.parse.isOldFormatPacket_(ptag)) {
    // Strip the last few bits of the tag (which represent length).
    body = e2e.openpgp.parse.getBodyOldFormatPacket_(
        ptype & (1 << e2e.openpgp.parse.P_TAG_OLD_PACKET_SHIFT_) - 1, data);
    ptype = ptype >>> e2e.openpgp.parse.P_TAG_OLD_PACKET_SHIFT_;
    e2e.openpgp.parse.console_.info(
        'Old: (tag ' + ptype + ') (' + body.length + ' bytes)');
  } else {
    body = e2e.openpgp.parse.getBodyNewFormatPacket_(data);
    e2e.openpgp.parse.console_.info(
        'New: (tag ' + ptype + ') (' + body.length + ' bytes)');
  }
  // Call the specific parser depending on the tag.
  return e2e.openpgp.packet.factory.parse(ptype, body);
};


/**
 * @private {!e2e.debug.Console}
 */
e2e.openpgp.parse.console_ = e2e.debug.Console.getConsole(
    'e2e.openpgp.parse');
