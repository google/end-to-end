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
 * @fileoverview Generates packets from a ByteArray.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.packet.factory');

goog.require('e2e.openpgp.error.ParseError');


/**
 * Dictionary of parsers for specific Packet types. The keys are the packet
 * tags.
 * @type {!Object.<number,
 *     function(!e2e.ByteArray):!e2e.openpgp.packet.Packet>}
 * @private
 */
e2e.openpgp.packet.factory.parsers_ = {};


/**
 * Registers a Packet as the default parser for a tag.
 * @param {function(new:e2e.openpgp.packet.Packet, ...)} packet The
 *     constructor of the packet.
 */
e2e.openpgp.packet.factory.add = function(packet) {
  e2e.openpgp.packet.factory.parsers_[packet.prototype.tag] =
      packet.parse;
};


/**
 * Parses a packet of the given tag and returns it.
 * Throws a {@code e2e.openpgp.error.ParseError} for nonexistent packets.
 * @param {number} tag The tag to generate a packet for.
 * @param {!e2e.ByteArray} body The body of the packet.
 * @return {!e2e.openpgp.packet.Packet} The packet.
 */
e2e.openpgp.packet.factory.parse = function(tag, body) {
  if (e2e.openpgp.packet.factory.parsers_.hasOwnProperty(tag)) {
    return e2e.openpgp.packet.factory.parsers_[tag](body);
  }
  throw new e2e.openpgp.error.ParseError(
      'Can not parse packet with tag ' + tag + '.');
};
