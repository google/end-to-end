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
 * @fileoverview Base class for transferable OpenPGP key blocks.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.block.TransferableKey');

goog.require('e2e.openpgp.block.Block');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.packet.PublicSubkey');
goog.require('e2e.openpgp.packet.SecretSubkey');
goog.require('e2e.openpgp.packet.Signature');
goog.require('e2e.openpgp.packet.Trust');
goog.require('e2e.openpgp.packet.UserAttribute');
goog.require('e2e.openpgp.packet.UserId');
goog.require('goog.array');


/**
 * Representation of a transferable key block. According to the OpenPGP RFC
 * (RFC 4880) Section 11.1/2, a transferable key block is represented as:
 *  - One Public-Key or Secret-Key packet
 *  - Zero or more revocation signatures
 *  - One or more User ID packets
 *  - After each User ID packet, zero or more Signature packets
 *    (certifications)
 *  - Zero or more User Attribute packets
 *  - After each User Attribute packet, zero or more Signature packets
 *    (certifications)
 *  - Zero or more Subkey packets
 *  - After each Subkey packet, one Signature packet, plus optionally a
 *    revocation
 * @param {function(new:e2e.openpgp.packet.Key, number, number,
 *     !e2e.cipher.Cipher, e2e.ByteArray)} keyPacketClass The
 *     class of key packet to parse.
 * @constructor
 * @extends {e2e.openpgp.block.Block}
 */
e2e.openpgp.block.TransferableKey = function(keyPacketClass) {
  /**
   * The class of key packet to extract.
   * @type {function(new:e2e.openpgp.packet.Key,
   *     number, number, !e2e.cipher.Cipher, e2e.ByteArray)}
   */
  this.keyPacketClass = keyPacketClass;
  /**
   * Main key, public or private, for this block.
   * @type {e2e.openpgp.packet.Key}
   */
  this.keyPacket = null;
  /**
   * List of user IDs in this block.
   * @type {!Array.<e2e.openpgp.packet.UserId>}
   */
  this.userIds = [];
  /**
   * List of subkeys on this block.
   * @type {!Array.<e2e.openpgp.packet.Key>}
   */
  this.subKeys = [];
  /**
   * List of user attributes in this block.
   * @type {!Array.<e2e.openpgp.packet.UserAttribute>}
   */
  this.userAttributes = [];
  goog.base(this);
};
goog.inherits(e2e.openpgp.block.TransferableKey,
    e2e.openpgp.block.Block);


/**
 * @return {!Array.<string>} The user ids for this key block.
 */
e2e.openpgp.block.TransferableKey.prototype.getUserIds = function() {
  return goog.array.map(this.userIds, function(uid) {return uid.userId;});
};


/** @inheritDoc */
e2e.openpgp.block.TransferableKey.prototype.parse = function(packets) {
  var packet = packets[0];
  if (packet instanceof this.keyPacketClass) {
    this.keyPacket = packet;
    this.packets.push(packets.shift());
  } else {
    throw new e2e.openpgp.error.ParseError(
        'Invalid block. Missing primary key packet.');
  }
  packet = packets[0];
  while (packet instanceof e2e.openpgp.packet.Signature) {
    this.keyPacket.addRevocation(packet);
    this.packets.push(packets.shift());
    packet = packets[0];
  }
  while (packet instanceof e2e.openpgp.packet.UserId) {
    var userId = packet;
    this.userIds.push(packet);
    this.packets.push(packets.shift());
    packet = packets[0];
    while (packet instanceof e2e.openpgp.packet.Signature) {
      userId.addCertification(packet);
      this.packets.push(packets.shift());
      while (packets[0] instanceof e2e.openpgp.packet.Trust) {
        packets.shift();
      }
      packet = packets[0];
    }
  }
  if (this.userIds.length < 1) {
    throw new Error('Invalid block. Missing User ID.');
  }
  while (packet instanceof e2e.openpgp.packet.UserAttribute) {
    var userAttribute = packet;
    this.userAttributes.push(packet);
    this.packets.push(packets.shift());
    packet = packets[0];
    while (packet instanceof e2e.openpgp.packet.Signature) {
      userAttribute.addCertification(packet);
      this.packets.push(packets.shift());
      packet = packets[0];
    }
  }
  while (packet instanceof e2e.openpgp.packet.PublicSubkey ||
        packet instanceof e2e.openpgp.packet.SecretSubkey) {
    var subKey = packet;
    this.subKeys.push(packet);
    this.packets.push(packets.shift());
    packet = packets[0];
    // RFC4880 requires a signature for subkeys, however some clients, such as
    // PGP 8.0.3, do not include signatures on secretsubkeys.
    // Some keys apparently have more than one signature per subkey.
    while (packet instanceof e2e.openpgp.packet.Signature &&
          packet.signatureType ==
           e2e.openpgp.packet.Signature.SignatureType.SUBKEY) {
      subKey.addCertification(packet);
      this.packets.push(packets.shift());
      while (packets[0] instanceof e2e.openpgp.packet.Trust) {
        packets.shift();
      }
      packet = packets[0];
      while (
          packet instanceof e2e.openpgp.packet.Signature &&
          packet.signatureType ==
           e2e.openpgp.packet.Signature.SignatureType.SUBKEY_REVOCATION) {
        subKey.addRevocation(packet);
        this.packets.push(packets.shift());
        packet = packets[0];
      }
    }
  }

  return packets;
};


/**
 * Chooses a key packet for the specified use.
 * @param {e2e.openpgp.packet.Key.Usage} use The use of the key.
 * @param {function(new:T, ...)} type The constructor of the key to get.
 * @param {boolean} preferSubkey If true, subkey with a capability is preferred
 *     to main key packet.
 * @return {T} A key packet of the specified type.
 * @template T
 * @protected
 */
e2e.openpgp.block.TransferableKey.prototype.getKeyTo =
    function(use, type, preferSubkey) {
  if (!preferSubkey) {
    if (this.keyPacket.can(use) && this.keyPacket instanceof type) {
      return this.keyPacket;
    }
  }
  return goog.array.find(
    this.subKeys.concat(this.keyPacket), function(key) {
      return key.can(use) && key instanceof type;
    });
};


/**
 * Chooses a key packet for encryption.
 * @return {e2e.openpgp.packet.PublicKey}
 */
e2e.openpgp.block.TransferableKey.prototype.getKeyToEncrypt =
    goog.abstractMethod;


/**
 * Chooses a key packet for signing.
 * @return {e2e.openpgp.packet.SecretKey}
 */
e2e.openpgp.block.TransferableKey.prototype.getKeyToSign =
    goog.abstractMethod;


/**
 * Returns a key or one of the subkeys of a given key ID.
 * @param {e2e.ByteArray} keyId Key ID to find the key by.
 * @return {?e2e.openpgp.packet.Key} Found key
 */
e2e.openpgp.block.TransferableKey.prototype.getKeyById = function(keyId) {
  if (this.keyPacket.keyId && goog.array.equals(this.keyPacket.keyId, keyId)) {
    return this.keyPacket;
  }
  return goog.array.find(this.subKeys, function(key) {
    return Boolean(key.keyId) && goog.array.equals(
      /** @type e2e.ByteArray */ (key.keyId), keyId);
  });
};


/**
 * Checks if a key or one of the subkeys has a given key ID.
 * @param {e2e.ByteArray} keyId Key ID to find the key by.
 * @return {boolean} If true, this TransferableKey has a key with given ID.
 */
e2e.openpgp.block.TransferableKey.prototype.hasKeyById = function(keyId) {
  if (this.keyPacket.keyId && goog.array.equals(this.keyPacket.keyId, keyId)) {
    return true;
  }
  return goog.array.some(this.subKeys, function(key) {
    return Boolean(key.keyId) && goog.array.equals(
      /** @type e2e.ByteArray */ (key.keyId), keyId);
  });
};


/** @inheritDoc */
e2e.openpgp.block.TransferableKey.prototype.serialize = function() {
  return goog.array.flatten(goog.array.map(
      [this.keyPacket].concat(this.userIds).concat(this.subKeys),
      function(packet) {
        return packet.serialize();
      }));
};
