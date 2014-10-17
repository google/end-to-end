/**
 * @license
 * Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Trust packet. Not currently used, and ignored when imported.
 */

goog.provide('e2e.openpgp.packet.Trust');

goog.require('e2e.openpgp.packet.Packet');
goog.require('e2e.openpgp.packet.factory');



/**
 * @constructor
 * @extends {e2e.openpgp.packet.Packet}
 */
e2e.openpgp.packet.Trust = function() {
  goog.base(this);
};
goog.inherits(e2e.openpgp.packet.Trust,
              e2e.openpgp.packet.Packet);


/** @inheritDoc */
e2e.openpgp.packet.Trust.prototype.tag = 12;


/** @override */
e2e.openpgp.packet.Trust.prototype.serializePacketBody = function() {
  return [];
};


/**
 * @param {!e2e.ByteArray} body
 * @return {e2e.openpgp.packet.Trust}
 */
e2e.openpgp.packet.Trust.parse = function(body) {
  return new e2e.openpgp.packet.Trust;
};


e2e.openpgp.packet.factory.add(e2e.openpgp.packet.Trust);
