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
 * @fileoverview Represents a literal data packet, which is used to represent
 * plaintext data.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.packet.LiteralData');

goog.require('e2e');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.packet.Data');
goog.require('e2e.openpgp.packet.factory');
goog.require('goog.array');
goog.require('goog.structs');



/**
 * A LiteralData (Tag 11) RFC 4880 Section 5.9.
 * @param {!e2e.openpgp.packet.LiteralData.Format} format Data format.
 * @param {!e2e.ByteArray} filename File name in UTF-8 of length no more
 *     than 255 bytes.
 * @param {number} timestamp File or message creation unix epoch timestamp.
 * @param {!e2e.ByteArray} data An array with the data to store in the
 *     packet.
 * @extends {e2e.openpgp.packet.Data}
 * @constructor
 */
e2e.openpgp.packet.LiteralData = function(
    format, filename, timestamp, data) {
  goog.base(this);

  /**
   * Defines what type of content is contained in data.
   * @see #Format
   * @type {!e2e.openpgp.packet.LiteralData.Format}
   */
  this.format = format;

  /**
   * The filename, if available of the data represented in the packet.
   * @type {!e2e.ByteArray}
   */
  this.filename = filename.slice(
      0, e2e.openpgp.packet.LiteralData.MAX_FILENAME_LENGTH);

  /**
   * UNIX epoch timestamp.
   * @type {number}
   */
  this.timestamp = timestamp;

  /** @inheritDoc */
  this.data = data;
};
goog.inherits(e2e.openpgp.packet.LiteralData,
              e2e.openpgp.packet.Data);


/**
 * Maximum length of a file name.
 * @type {number}
 * @const
 */
e2e.openpgp.packet.LiteralData.MAX_FILENAME_LENGTH = 0xFF;


/** @inheritDoc */
e2e.openpgp.packet.LiteralData.prototype.tag = 11;


/** @inheritDoc */
e2e.openpgp.packet.LiteralData.prototype.serializePacketBody = function() {
  return goog.array.concat(
      e2e.stringToByteArray(this.format),
      this.filename.length,
      this.filename,
      e2e.dwordArrayToByteArray([this.timestamp]),
      this.data
  );
};


/**
 * Different types of Data Formats.
 * @enum {string}
 */
e2e.openpgp.packet.LiteralData.Format = {
  BINARY: 'b',
  TEXT: 't',
  UTF8: 'u'
};


/**
 * Parses and extracts the data from the body. It will consume all data from the
 * array.
 * Throws a {@code e2e.openpgp.error.ParseError} if malformed.
 * @param {!e2e.ByteArray} body The data to parse.
 * @return {e2e.openpgp.packet.LiteralData} A Literal Data Packet.
 */
e2e.openpgp.packet.LiteralData.parse = function(body) {
  var format_chr = e2e.byteArrayToString([body.shift()]);
  var fileNameLength = body.shift();
  var fileName = body.splice(0, fileNameLength);
  if (fileName.length != fileNameLength || body.length < 4) {
    throw new e2e.openpgp.error.ParseError('Malformed Literal Data Packet');
  }
  var timestamp = e2e.byteArrayToDwordArray(body.splice(0, 4))[0];
  var data = body.splice(0);
  var format;
  if (goog.structs.contains(
      e2e.openpgp.packet.LiteralData.Format, format_chr)) {
    format = /** @type {e2e.openpgp.packet.LiteralData.Format} */
        (format_chr);
  } else {
    throw new e2e.openpgp.error.ParseError('Invalid Data Format.');
  }
  return new e2e.openpgp.packet.LiteralData(format,
      fileName,
      timestamp,
      data);
};


e2e.openpgp.packet.factory.add(
    e2e.openpgp.packet.LiteralData);
