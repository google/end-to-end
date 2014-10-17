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
 * @fileoverview Base class for OpenPGP packets. Provides serialization of
 * packets and initialization.
 * An OpenPGP packet is the common data structure in the standard. They consist
 * of the type and length. Depending on the type, other parsers are called which
 * extract the meaningful data out of them.
 * You would usually call this class to parse data into a Packet, and you can
 * use instances of a Packet class to serialize them back to strings.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.packet');
goog.provide('e2e.openpgp.packet.Packet');

goog.require('e2e');
goog.require('goog.array');



/**
 * Abstract base class for all Packets.
 * @constructor
 */
e2e.openpgp.packet.Packet = function() {};


/**
 * Parser for this specific Packet. Should be implemented by subclasses.
 * @param {!e2e.ByteArray} data
 * @return {T} The parsed packet.
 * @template T
 */
e2e.openpgp.packet.Packet.parse = goog.abstractMethod;


/**
 * Tag of the packet (the tag specifies what type of packet it is).
 * @type {number}
 */
e2e.openpgp.packet.Packet.prototype.tag;


/**
 * Serializer for this specific Packet.
 * @see #toString
 * @return {!e2e.ByteArray} The ByteArray representation of this packet.
 */
e2e.openpgp.packet.Packet.prototype.serializePacketBody =
    goog.abstractMethod;


/**
 * Defines the maximum packet size.
 * @type {number}
 * @const
 */
e2e.openpgp.packet.MAXIMUM_PACKET_SIZE = 0xFFFFFFFF;


/**
 * Serializes all packets by calling {@link #serializePacketBody} and appends
 * the length as a 'new format' packet as defined in RFC 4880 Section 4.2.2.3.
 * We only support packets of up to 0xFFFFFFFF, longer packets will throw an
 * exception.
 * @return {!e2e.ByteArray} The PGP RFC 4880 packet serialization.
 */
e2e.openpgp.packet.Packet.prototype.serialize = function() {
  // The first bit is always one, the second one specifies this is new format.
  var ptag = parseInt('11000000', 2) | this.tag;
  var packet = this.serializePacketBody();
  var length = '';
  if (packet.length > e2e.openpgp.packet.MAXIMUM_PACKET_SIZE) {
    // We are required to use partial body lengths in this case.
    return [];  // TODO(adhintz) Throw an unimplemented error in this case?
  }
  // We always use five octet lengths since they will work in most cases.
  return goog.array.concat(
      ptag,
      0xFF,
      e2e.dwordArrayToByteArray([packet.length]),
      packet);
};
