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
 * @fileoverview Signature Subpackets.
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.openpgp.packet.SignatureSub');

goog.require('e2e');
goog.require('e2e.debug.Console');
goog.require('e2e.openpgp.parse');
goog.require('goog.array');
goog.require('goog.structs.Map');



/**
 * Signature Subpackets as defined in RFC 4880, section 5.2.3.1.
 * @param {!e2e.openpgp.packet.SignatureSub.Type} type Subpacket type.
 * @param {boolean} critical True if interpretation of this type is critical.
 * @param {!e2e.ByteArray} body Unparsed data for this subpacket.
 * @param {!e2e.ByteArray=} opt_packetLengthBytes The encoded length of
 *     the packet length.
 * @constructor
 */
e2e.openpgp.packet.SignatureSub = function(
    type, critical, body, opt_packetLengthBytes) {
  this.type = type;
  this.critical = critical;
  this.body = body;
  this.packetLengthBytes = opt_packetLengthBytes || this.getLength_();
};


/**
 * Calculates the encoded length of the signature subpacket.
 * @return {!e2e.ByteArray}
 * @private
 */
e2e.openpgp.packet.SignatureSub.prototype.getLength_ = function() {
  // Always use the 4 byte length.
  return goog.array.flatten(
      e2e.openpgp.parse.FIVE_BYTE_LENGTH_VAL,
      e2e.dwordArrayToByteArray([this.body.length + 1]));
};


/**
 * @return {!e2e.ByteArray}
 */
e2e.openpgp.packet.SignatureSub.prototype.serialize = function() {
  var ptag = (Number(this.critical) << 7) | this.type;
  return goog.array.flatten(
      this.packetLengthBytes,
      ptag,
      this.body);
};


/**
 * @param {!Object.<string, !e2e.ByteArray>} attributes
 * @return {!Array.<!e2e.openpgp.packet.SignatureSub>}
 */
e2e.openpgp.packet.SignatureSub.construct = function(attributes) {
  var packets = [];
  var map = new goog.structs.Map(e2e.openpgp.packet.SignatureSub.Type);
  goog.array.forEach(
      map.getKeys(),
      function(typeName) {
        if (attributes.hasOwnProperty(typeName)) {
          var type = map.get(typeName);
          packets.push(
              new e2e.openpgp.packet.SignatureSub(
                  type, true, attributes[typeName]));
        }
      });
  return packets;
};


/**
 * Parses data and returns all of the parsed subpackets.
 * @param {!e2e.ByteArray} data Data for subpackets.
 * @return {!Array.<!e2e.openpgp.packet.SignatureSub>} Parsed subpackets.
 */
e2e.openpgp.packet.SignatureSub.parse = function(data) {
  var packets = [];
  var attributes = {};
  while (data.length > 0) {
    // This format is similar to e2e.openpgp.parse.getBodyNewFormatPacket_
    // with the exception of partial body lengths.
    var packetLengthBytes, packetLength;
    var firstByte = data.shift();
    if (firstByte < e2e.openpgp.parse.TWO_BYTE_LENGTH_MIN) {
      // One byte length packet size.
      packetLength = firstByte;
      packetLengthBytes = [firstByte];
    } else if (firstByte < e2e.openpgp.parse.FIVE_BYTE_LENGTH_VAL) {
      // Two bytes length packet size.
      var secondByte = data.shift();
      packetLength = (
          (firstByte - e2e.openpgp.parse.TWO_BYTE_LENGTH_MIN) << 8) +
          (secondByte + e2e.openpgp.parse.TWO_BYTE_LENGTH_MIN);
      packetLengthBytes = [firstByte, secondByte];
    } else if (firstByte == e2e.openpgp.parse.FIVE_BYTE_LENGTH_VAL) {
      // Five bytes length packet size.
      packetLengthBytes = data.splice(0, 4);
      packetLength = e2e.byteArrayToDwordArray(
          packetLengthBytes)[0];
      packetLengthBytes.unshift(
          e2e.openpgp.parse.FIVE_BYTE_LENGTH_VAL);
    }

    var type = data.shift();
    var critical = Boolean(type & 0x80);
    type = /** @type {e2e.openpgp.packet.SignatureSub.Type} */ (
        type & 0x7F);
    var body = data.splice(0, packetLength - 1);
    e2e.openpgp.packet.SignatureSub.console_.info(
        '    Sub', type, ' (' + body.length + ') bytes', body);

    packets.push(new e2e.openpgp.packet.SignatureSub(type, critical, body,
                                                     packetLengthBytes));
  }

  return packets;
};


/**
 * Parses the subpacket and populates the attributes object with the data.
 * @param {!Object.<string, number|!e2e.ByteArray>} attributes Attributes
 *   record object to populate.
 * @param {!e2e.openpgp.packet.SignatureSub} subpacket Subpacket to parse.
 * @param {boolean} hashed True If subpacket is in hashed section of signature.
 */
e2e.openpgp.packet.SignatureSub.populateAttribute = function(
    attributes, subpacket, hashed) {
  // TODO(adhintz) Checks for which subpackets are fine for unhashed and
  //   different signature types.
  switch (subpacket.type) {
    case e2e.openpgp.packet.SignatureSub.Type.SIGNATURE_CREATION_TIME:
      attributes.SIGNATURE_CREATION_TIME =
          e2e.byteArrayToDwordArray(subpacket.body)[0];
      break;
    case e2e.openpgp.packet.SignatureSub.Type.SIGNATURE_EXPIRATION_TIME:
      attributes.SIGNATURE_EXPIRATION_TIME =
          e2e.byteArrayToDwordArray(subpacket.body)[0];
      break;
    case e2e.openpgp.packet.SignatureSub.Type.REGULAR_EXPRESSION:
      attributes.REGULAR_EXPRESSION = e2e.byteArrayToString(subpacket.body);
      break;
    case e2e.openpgp.packet.SignatureSub.Type.KEY_EXPIRATION_TIME:
      attributes.KEY_EXPIRATION_TIME =
          e2e.byteArrayToDwordArray(subpacket.body)[0];
      break;
    case e2e.openpgp.packet.SignatureSub.Type.
        PREFERRED_SYMMETRIC_ALGORITHMS:
      attributes.PREFERRED_SYMMETRIC_ALGORITHMS = subpacket.body;
      break;
    case e2e.openpgp.packet.SignatureSub.Type.ISSUER:
      attributes.ISSUER = subpacket.body;
      break;
    case e2e.openpgp.packet.SignatureSub.Type.PREFERRED_HASH_ALGORITHMS:
      attributes.PREFERRED_HASH_ALGORITHMS = subpacket.body;
      break;
    case e2e.openpgp.packet.SignatureSub.Type.
        PREFERRED_COMPRESSION_ALGORITHMS:
      attributes.PREFERRED_COMPRESSION_ALGORITHMS = subpacket.body;
      break;
    case e2e.openpgp.packet.SignatureSub.Type.KEY_SERVER_PREFERENCES:
      attributes.KEY_SERVER_PREFERENCES = subpacket.body[0];
      break;
    case e2e.openpgp.packet.SignatureSub.Type.PRIMARY_USER_ID:
      attributes.PRIMARY_USER_ID = e2e.byteArrayToString(subpacket.body);
      break;
    case e2e.openpgp.packet.SignatureSub.Type.KEY_FLAGS:
      if (subpacket.body.length == 0) {
        attributes.KEY_FLAGS = 0;
      } else {
        // RFC 4880 section 5.2.3.21.
        attributes.KEY_FLAGS = subpacket.body[0];
        attributes.KEY_FLAG_CERTIFY = attributes.KEY_FLAGS &
            e2e.openpgp.packet.SignatureSub.KeyFlags.CERTIFY;
        attributes.KEY_FLAG_SIGN = attributes.KEY_FLAGS &
            e2e.openpgp.packet.SignatureSub.KeyFlags.SIGN;
        attributes.KEY_FLAG_ENCRYPT_COMMUNICATION = attributes.KEY_FLAGS &
            e2e.openpgp.packet.SignatureSub.KeyFlags.ENCRYPT_COMMUNICATION;
        attributes.KEY_FLAG_ENCRYPT_STORAGE = attributes.KEY_FLAGS &
            e2e.openpgp.packet.SignatureSub.KeyFlags.ENCRYPT_STORAGE;
        attributes.KEY_FLAG_SPLIT = attributes.KEY_FLAGS &
            e2e.openpgp.packet.SignatureSub.KeyFlags.SPLIT;
        attributes.KEY_FLAG_AUTHENTICATION = attributes.KEY_FLAGS &
            e2e.openpgp.packet.SignatureSub.KeyFlags.AUTHENTICATION;
        attributes.KEY_FLAG_SHARED = attributes.KEY_FLAGS &
            e2e.openpgp.packet.SignatureSub.KeyFlags.SHARED;
      }
      break;
    case e2e.openpgp.packet.SignatureSub.Type.REVOCATION_REASON:
      attributes.REVOCATION_REASON = subpacket.body[0];
      attributes.REVOCATION_REASON_TEXT = e2e.byteArrayToString(
          goog.array.slice(subpacket.body, 1));
      break;
    case e2e.openpgp.packet.SignatureSub.Type.FEATURES:
      if (subpacket.body.length == 0) {
        attributes.FEATURES = 0;
      } else {
        attributes.FEATURES = subpacket.body[0];  // MDC is 0x01
      }
      break;
    case e2e.openpgp.packet.SignatureSub.Type.EMBEDDED_SIGNATURE:
      attributes.EMBEDDED_SIGNATURE = subpacket.body;
      break;
    default:
      if (subpacket.critical) {
        // TODO(adhintz): Treat the signature as invalid instead of throwing.
        throw new Error(
            'Critical signature subpacket not recognized: ' + subpacket.type);
      }
  }
};


/**
 * Type of signature subpacket.
 * @enum {number}
 */
e2e.openpgp.packet.SignatureSub.Type = {
  'SIGNATURE_CREATION_TIME': 2,
  'SIGNATURE_EXPIRATION_TIME': 3,
  'REGULAR_EXPRESSION': 6,
  'KEY_EXPIRATION_TIME': 9,
  'PREFERRED_SYMMETRIC_ALGORITHMS': 11,
  'ISSUER': 16,
  'PREFERRED_HASH_ALGORITHMS': 21,
  'PREFERRED_COMPRESSION_ALGORITHMS': 22,
  'KEY_SERVER_PREFERENCES': 23,
  'PRIMARY_USER_ID': 25,
  'KEY_FLAGS': 27,
  'REVOCATION_REASON': 29,
  'FEATURES': 30,
  'EMBEDDED_SIGNATURE': 32
};


/**
 * Key flags values. See RFC 4880 section 5.2.3.21.
 * @enum {number}
 */
e2e.openpgp.packet.SignatureSub.KeyFlags = {
  'CERTIFY': 0x01,
  'SIGN': 0x02,
  'ENCRYPT_COMMUNICATION': 0x04,
  'ENCRYPT_STORAGE': 0x08,
  'SPLIT': 0x10,
  'AUTHENTICATION': 0x20,
  'SHARED': 0x80
};


/**
 * @private {e2e.debug.Console}
 */
e2e.openpgp.packet.SignatureSub.console_ =
    e2e.debug.Console.getConsole('e2e.openpgp.packet.SignatureSub');
