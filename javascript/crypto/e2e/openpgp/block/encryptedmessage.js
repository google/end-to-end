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
 * @fileoverview Encrypted Message block.
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.openpgp.block.EncryptedMessage');

goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.factory');
goog.require('e2e.openpgp.block.Message');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.packet.Compressed');
goog.require('e2e.openpgp.packet.EncryptedData');
goog.require('e2e.openpgp.packet.EncryptedSessionKey');
goog.require('e2e.openpgp.packet.PKEncryptedSessionKey');
goog.require('e2e.openpgp.packet.SymmetricKey');
goog.require('e2e.openpgp.packet.SymmetricallyEncryptedIntegrity');
goog.require('e2e.random');


/**
 * Representation of an Encrypted Message block. According to RFC 4880
 * Section 11.3, this block is represented as:
 *  - Optional repeated Encrypted Session Key (ESK) packets -- either public
 *      or symmetric.
 *  - One Encrypted Data block. Can be either a Symmetrically Encrypted Data
 *      Packet or a Symmetrically Encrypted Integrity Protected Data Packet.
 * @param {Array.<e2e.openpgp.packet.EncryptedSessionKey>=} opt_eskPackets
 *     List of Encrypted Session Key (ESK) packets in this block.
 * @param {e2e.openpgp.packet.EncryptedData=} opt_encryptedData
 *     Packet for the encrypted data block.
 * @param {Array.<e2e.openpgp.packet.Signature>=} opt_signatures
 * @extends {e2e.openpgp.block.Message}
 * @constructor
 */
e2e.openpgp.block.EncryptedMessage = function(opt_eskPackets,
    opt_encryptedData, opt_signatures) {
  /**
   * List of Encrypted Session Key (ESK) packets in this block.
   * @type {Array.<e2e.openpgp.packet.EncryptedSessionKey>}
   */
  this.eskPackets = opt_eskPackets || null;
  /**
   * Packet for the encrypted data block.
   * NOTE: The contents for this packet are another OpenPGP message.
   * @type {e2e.openpgp.packet.EncryptedData}
 */
  this.encryptedData = opt_encryptedData || null;
  goog.base(this, opt_signatures);
};
goog.inherits(e2e.openpgp.block.EncryptedMessage,
    e2e.openpgp.block.Message);


/** @inheritDoc */
e2e.openpgp.block.EncryptedMessage.prototype.parse =
    function(packets) {
  var eskPackets = [];
  while (packets[0] instanceof
         e2e.openpgp.packet.EncryptedSessionKey) {
    eskPackets.push(packets.shift());
  }
  if (packets[0] instanceof
         e2e.openpgp.packet.EncryptedData) {
    var encryptedData = packets.shift();
  } else {
    throw new e2e.openpgp.error.ParseError(
        'Invalid EncryptedMessage. Missing encrypted data block.');
  }

  this.eskPackets = eskPackets;
  this.encryptedData = /** @type {e2e.openpgp.packet.EncryptedData} */
      (encryptedData);
  return packets;
};


/** @inheritDoc */
e2e.openpgp.block.EncryptedMessage.prototype.serializeMessage = function() {
  var result = [];
  goog.array.forEach(this.eskPackets, function(eskPacket) {
    goog.array.extend(result, eskPacket.serialize());
  });
  goog.array.extend(result, this.encryptedData.serialize());
  return result;
};


/**
 * Makes an EncryptedMessage containing data. Encrypts the data for
 * the public keys passed in.
 * @param {e2e.openpgp.packet.LiteralData} literalPacket
 *   Data to encrypt.
 * @param {Array.<e2e.openpgp.packet.Key>} opt_publicKeys
 *   Keys to encrypt to.
 * @param {Array.<e2e.ByteArray>} opt_passphrases Symmetrically encrypt
 *  session key with each of these passphrases.
 * @param {e2e.openpgp.packet.SecretKey=} opt_signatureKey The signing key.
 * @return {e2e.async.Result.<e2e.openpgp.block.EncryptedMessage>}
 */
e2e.openpgp.block.EncryptedMessage.construct = function(
    literalPacket, opt_publicKeys, opt_passphrases, opt_signatureKey) {
  var cipher = e2e.cipher.factory.require(
      e2e.cipher.Algorithm.AES256);
  var sessionKey = e2e.random.getRandomBytes(cipher.keySize);
  cipher.setKey({key: sessionKey});
  var byteArrayToCompress;
  if (opt_signatureKey) {
    // This block will wrap LiteralData into OnePassSignature + LiteralData +
    // Signature sequence. That sequence will be later compressed and encrypted.
    // This allows e.g. GnuPG to verify the signature.
    var messageToSign = new e2e.openpgp.block.LiteralMessage();
    messageToSign.parse([literalPacket]);
    messageToSign.signWithOnePass(opt_signatureKey);
    // We're not using e2e.openpgp.block.Message.serialize() as it uses
    // serializeMessage() which only serializes packet body.
    byteArrayToCompress = messageToSign.serialize();
  } else {
    byteArrayToCompress = literalPacket.serialize();
  }

  var compressedPacket = e2e.openpgp.packet.Compressed.construct(
      byteArrayToCompress);

  var encryptedData =
    e2e.openpgp.packet.SymmetricallyEncryptedIntegrity.construct(
        compressedPacket.serialize(),
        cipher);

  var encryptedSessions = [];
  var passphrases = opt_passphrases || [];
  goog.array.forEach(passphrases, function(passphrase) {
    var packet = e2e.openpgp.packet.SymmetricKey.construct(
        passphrase, sessionKey);
    encryptedSessions.push(packet);
  });

  var publicKeys = opt_publicKeys || [];
  var pending = publicKeys.slice();
  var blockResult = new e2e.async.Result;
  goog.array.forEach(publicKeys, function(publicKey) {
    var packetResult = e2e.openpgp.packet.PKEncryptedSessionKey.construct(
        publicKey, sessionKey);
    packetResult.addCallback(function(packet) {
      encryptedSessions.push(packet);
      pending.splice(pending.indexOf(publicKey), 1);
      if (pending.length == 0) {
        blockResult.callback();
      }
    });
  });
  if (publicKeys.length == 0) {
    blockResult.callback();
  }

  blockResult.addCallback(function() {
    var block = new e2e.openpgp.block.EncryptedMessage(
      encryptedSessions,
      encryptedData);
    return block;
  });
  return blockResult;
};


/** @inheritDoc */
e2e.openpgp.block.EncryptedMessage.prototype.header = 'MESSAGE';
