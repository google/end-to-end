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
 * @fileoverview Base class for OpenPGP blocks. Provides serialization of
 * blocks and initialization.
 * OpenPGP blocks are defined in RFC 4880 Section 11 and define the sequential
 * composition of packets that form a message, a key or a detached signature.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.block.Block');

goog.require('e2e.openpgp.block.Armorable');



/**
 * Representation of a collection of packets that have a specific meaning.
 * @constructor
 * @implements {e2e.openpgp.block.Armorable}
 */
e2e.openpgp.block.Block = function() {
  /**
   * @type {!Array.<!e2e.openpgp.packet.Packet>}
   */
  this.packets = [];
};


/**
 * Parses a block out of a series of packets.
 * @param {!Array.<!e2e.openpgp.packet.Packet>} packets The list of packets
 *     that hold the block information.
 * @return {!Array.<!e2e.openpgp.packet.Packet>} Any extra packets left over
 *     after parsing this block.
 */
e2e.openpgp.block.Block.prototype.parse = goog.abstractMethod;


/** @override */
e2e.openpgp.block.Block.prototype.serialize = goog.abstractMethod;


/** @override */
e2e.openpgp.block.Block.prototype.getArmorBody = function() {
  return this.serialize();
};


/** @override */
e2e.openpgp.block.Block.prototype.getArmorSignatures = function() {
  return [];
};


/**
 * Sets the charset used in the block.
 * @private {string}
 */
e2e.openpgp.block.Block.prototype.charset_ = 'utf-8';


/**
 * @param {string|undefined} charset The charset to use in the block.
 */
e2e.openpgp.block.Block.prototype.setCharset = function(charset) {
  if (charset) {
    this.charset_ = charset;
  }
};


/**
 * @return {string} The charset for the block.
 */
e2e.openpgp.block.Block.prototype.getCharset = function() {
  return this.charset_;
};


/** @override */
e2e.openpgp.block.Block.prototype.header = '';
