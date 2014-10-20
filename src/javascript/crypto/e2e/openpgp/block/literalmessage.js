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
 * @fileoverview Literal Message Blocks contain a single literal data packet.
 */

goog.provide('e2e.openpgp.block.LiteralMessage');

goog.require('e2e');
goog.require('e2e.openpgp.block.Message');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.packet.LiteralData');
goog.require('goog.array');



/**
 * Representation of a literal message block.
 * @param {Array.<!e2e.openpgp.packet.Signature>=} opt_signatures
 * @constructor
 * @extends {e2e.openpgp.block.Message}
 */
e2e.openpgp.block.LiteralMessage = function(opt_signatures) {
  goog.base(this, opt_signatures);
};
goog.inherits(e2e.openpgp.block.LiteralMessage,
    e2e.openpgp.block.Message);


/**
 * The literal data packet.
 * @private {e2e.openpgp.packet.LiteralData}
 */
e2e.openpgp.block.LiteralMessage.prototype.literalData_ = null;


/**
 * @return {!e2e.ByteArray} The data encoded in the message.
 */
e2e.openpgp.block.LiteralMessage.prototype.getData = function() {
  return this.literalData_.data;
};


/**
 * @return {number} The timestamp of the message.
 */
e2e.openpgp.block.LiteralMessage.prototype.getTimestamp = function() {
  return this.literalData_.timestamp;
};


/**
 * @return {string} The filename of the message.
 */
e2e.openpgp.block.LiteralMessage.prototype.getFilename = function() {
  return e2e.byteArrayToString(
      this.literalData_.filename, this.getCharset());
};


/** @override */
e2e.openpgp.block.LiteralMessage.prototype.serializeMessage = function() {
  return goog.array.flatten(goog.array.map(this.packets, function(packet) {
    return packet.serialize();
  }));
};


/** @override */
e2e.openpgp.block.LiteralMessage.prototype.getBytesToSign = function() {
  // When signing a literal message, we actually sign first literal data
  // packet body.
  if (this.packets.length == 0) {
    return /** @type {!e2e.ByteArray} */ ([]);
  }
  return this.literalData_.data;
};


/** @override */
e2e.openpgp.block.LiteralMessage.prototype.getLiteralMessage = function() {
  return this;
};


/** @override */
e2e.openpgp.block.LiteralMessage.prototype.parse = function(packets) {
  var packet = packets.shift();
  if (!(packet instanceof e2e.openpgp.packet.LiteralData)) {
    throw new e2e.openpgp.error.ParseError(
        'Literal block should contain LiteralData packet.');
  }
  this.literalData_ = packet;
  this.packets = [packet];
  return packets;
};


/**
 * Creates a literal message from a text contents
 * @param  {string|!e2e.ByteArray} plaintext
 * @param  {string=} opt_filename File name to use in LiteralData packet
 * @return {!e2e.openpgp.block.LiteralMessage} Created message.
 */
e2e.openpgp.block.LiteralMessage.construct = function(plaintext, opt_filename) {
  if (typeof plaintext == 'string') {
    plaintext = e2e.stringToByteArray(plaintext);
  }
  var literal = new e2e.openpgp.packet.LiteralData(
      e2e.openpgp.packet.LiteralData.Format.TEXT,
      e2e.stringToByteArray(
      goog.isDefAndNotNull(opt_filename) ? opt_filename : ''), // file name
      Math.floor(new Date().getTime() / 1000), // time in seconds since 1970
      plaintext);
  var message = new e2e.openpgp.block.LiteralMessage();
  message.parse([literal]);
  return message;
};
