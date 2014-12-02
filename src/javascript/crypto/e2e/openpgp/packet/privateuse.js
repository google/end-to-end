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
 * @fileoverview Private Use packets.
 */

goog.provide('e2e.openpgp.packet.PrivateUse');
goog.provide('e2e.openpgp.packet.PrivateUse60');
goog.provide('e2e.openpgp.packet.PrivateUse61');
goog.provide('e2e.openpgp.packet.PrivateUse62');
goog.provide('e2e.openpgp.packet.PrivateUse63');

goog.require('e2e.openpgp.packet.Packet');
goog.require('e2e.openpgp.packet.factory');



/**
 * Base class for private-use packets.
 * @param {!e2e.ByteArray} data uninterpreted contents of packet.
 * @constructor
 * @extends {e2e.openpgp.packet.Packet}
 */
e2e.openpgp.packet.PrivateUse = function(data) {
  goog.base(this);
  /**
   * Uninterpreted contents of packet
   * @type {!e2e.ByteArray}
   */
  this.data = data;
};
goog.inherits(e2e.openpgp.packet.PrivateUse,
              e2e.openpgp.packet.Packet);


/** @inheritDoc */
e2e.openpgp.packet.PrivateUse.prototype.serializePacketBody = function() {
  return this.data;
};



/**
 * Private Use Packet (Tag 60) defined in RFC 4880 section 13.10.
 * @param {!e2e.ByteArray} data uninterpreted content of packet.
 * @constructor
 * @extends {e2e.openpgp.packet.PrivateUse}
 */
e2e.openpgp.packet.PrivateUse60 = function(data) {
  goog.base(this, data);
};
goog.inherits(e2e.openpgp.packet.PrivateUse60,
              e2e.openpgp.packet.PrivateUse);


/** @inheritDoc */
e2e.openpgp.packet.PrivateUse60.parse = function(data) {
  return new e2e.openpgp.packet.PrivateUse60(data);
};


/** @inheritDoc */
e2e.openpgp.packet.PrivateUse60.prototype.tag = 60;



/**
 * Private Use Packet (Tag 61) defined in RFC 4880 section 13.10.
 * @param {!e2e.ByteArray} data uninterpreted content of packet.
 * @constructor
 * @extends {e2e.openpgp.packet.PrivateUse}
 */
e2e.openpgp.packet.PrivateUse61 = function(data) {
  goog.base(this, data);
};
goog.inherits(e2e.openpgp.packet.PrivateUse61,
              e2e.openpgp.packet.PrivateUse);


/** @inheritDoc */
e2e.openpgp.packet.PrivateUse61.parse = function(data) {
  return new e2e.openpgp.packet.PrivateUse61(data);
};


/** @inheritDoc */
e2e.openpgp.packet.PrivateUse61.prototype.tag = 61;



/**
 * Private Use Packet (Tag 62) defined in RFC 4880 section 13.10.
 * @param {!e2e.ByteArray} data uninterpreted content of packet.
 * @constructor
 * @extends {e2e.openpgp.packet.PrivateUse}
 */
e2e.openpgp.packet.PrivateUse62 = function(data) {
  goog.base(this, data);
};
goog.inherits(e2e.openpgp.packet.PrivateUse62,
              e2e.openpgp.packet.PrivateUse);


/** @inheritDoc */
e2e.openpgp.packet.PrivateUse62.parse = function(data) {
  return new e2e.openpgp.packet.PrivateUse62(data);
};


/** @inheritDoc */
e2e.openpgp.packet.PrivateUse62.prototype.tag = 62;



/**
 * Private Use Packet (Tag 63) defined in RFC 4880 section 13.10.
 * @param {!e2e.ByteArray} data uninterpreted content of packet.
 * @constructor
 * @extends {e2e.openpgp.packet.PrivateUse}
 */
e2e.openpgp.packet.PrivateUse63 = function(data) {
  goog.base(this, data);
};
goog.inherits(e2e.openpgp.packet.PrivateUse63,
              e2e.openpgp.packet.PrivateUse);


/** @inheritDoc */
e2e.openpgp.packet.PrivateUse63.parse = function(data) {
  return new e2e.openpgp.packet.PrivateUse63(data);
};


/** @inheritDoc */
e2e.openpgp.packet.PrivateUse63.prototype.tag = 63;


e2e.openpgp.packet.factory.add(e2e.openpgp.packet.PrivateUse60);
e2e.openpgp.packet.factory.add(e2e.openpgp.packet.PrivateUse61);
e2e.openpgp.packet.factory.add(e2e.openpgp.packet.PrivateUse62);
e2e.openpgp.packet.factory.add(e2e.openpgp.packet.PrivateUse63);
