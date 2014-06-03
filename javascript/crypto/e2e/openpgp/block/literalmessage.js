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
 * @fileoverview Literal Message Blocks contain a single literal data packet.
 */

goog.provide('e2e.openpgp.block.LiteralMessage');

goog.require('e2e.openpgp.block.Message');


/**
 * Representation of a literal message block.
 * @param {Array.<e2e.openpgp.packet.Signature>=} opt_signatures
 * @constructor
 * @extends {e2e.openpgp.block.Message}
 */
e2e.openpgp.block.LiteralMessage = function(opt_signatures) {
  goog.base(this, opt_signatures);
};
goog.inherits(e2e.openpgp.block.LiteralMessage,
    e2e.openpgp.block.Message);


/** @inheritDoc */
e2e.openpgp.block.LiteralMessage.prototype.getData = function() {
  return /** @type {e2e.openpgp.packet.LiteralData} */ (this.packets[0]);
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
    return /** @type {e2e.ByteArray} */ ([]);
  }
  return this.packets[0].data;
};


/** @inheritDoc */
e2e.openpgp.block.LiteralMessage.prototype.parse = function(packets) {
  this.packets = [packets.shift()];
  return packets;
};
