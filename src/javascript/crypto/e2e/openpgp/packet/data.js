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
 * @fileoverview Packet to represent a message data packet or a literal data
 * packet.
 */

goog.provide('e2e.openpgp.packet.Data');

goog.require('e2e.openpgp.packet.Packet');



/**
 * @constructor
 * @extends {e2e.openpgp.packet.Packet}
 */
e2e.openpgp.packet.Data = function() {
  goog.base(this);
};
goog.inherits(e2e.openpgp.packet.Data,
              e2e.openpgp.packet.Packet);


/**
 * The unencrypted data contained in the packet.
 * @type {!e2e.ByteArray}
 */
e2e.openpgp.packet.Data.prototype.data;
