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
 * @fileoverview User Attribute packet stub.
 */

goog.provide('e2e.openpgp.packet.UserAttribute');

goog.require('e2e');
goog.require('e2e.openpgp.packet.UserId');
goog.require('e2e.openpgp.packet.factory');
goog.require('goog.array');



/**
 * User Attribute Packet (Tag 17) defined in RFC 4880 section 5.12. Data inside
 *     the packet is not parsed.
 * @constructor
 * @extends {e2e.openpgp.packet.UserId}
 * @param {!e2e.ByteArray} data Attribute data.
 */
e2e.openpgp.packet.UserAttribute = function(data) {

  /**
   * @type {!e2e.ByteArray}
   */
  this.data = data;
  goog.base(this, '');
};
goog.inherits(e2e.openpgp.packet.UserAttribute,
              e2e.openpgp.packet.UserId);


/** @inheritDoc */
e2e.openpgp.packet.UserAttribute.prototype.tag = 17;


/**
 * Gets a byte array representing the User attribute data to create the
 *     signature over. This is intended for signatures of type 0x10 through
 *     0x13. See RFC 4880 5.2.4 for details.
 * @return {!e2e.ByteArray} The bytes to sign.
 * @protected
 */
e2e.openpgp.packet.UserAttribute.prototype.getBytesToSign = function() {
  return goog.array.flatten(
      0xD1,
      e2e.dwordArrayToByteArray([this.data.length]),
      this.data
  );
};


/**
 * @param {!e2e.ByteArray} data data to parse
 * @return {e2e.openpgp.packet.UserAttribute}
 */
e2e.openpgp.packet.UserAttribute.parse = function(data) {
  //TODO: implement subpacket parsing
  var body = data;
  data = [];
  return new e2e.openpgp.packet.UserAttribute(body);
};


e2e.openpgp.packet.factory.add(e2e.openpgp.packet.UserAttribute);
