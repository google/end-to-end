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
 *
 * @fileoverview TransferablePublicKey block.
 *
 */

goog.provide('e2e.openpgp.block.TransferablePublicKey');

goog.require('e2e.openpgp.block.TransferableKey');
goog.require('e2e.openpgp.packet.Key');
goog.require('e2e.openpgp.packet.PublicKey');



/**
 * Transferable Public Key Block.
 * @constructor
 * @extends {e2e.openpgp.block.TransferableKey}
 */
e2e.openpgp.block.TransferablePublicKey = function() {
  goog.base(this, e2e.openpgp.packet.PublicKey);
};
goog.inherits(e2e.openpgp.block.TransferablePublicKey,
    e2e.openpgp.block.TransferableKey);


/** @override */
e2e.openpgp.block.TransferablePublicKey.prototype.SERIALIZE_IN_KEY_OBJECT =
    true;


/** @override */
e2e.openpgp.block.TransferablePublicKey.prototype.getKeyToEncrypt =
    function() {
  return this.getKeyTo(
      e2e.openpgp.packet.Key.Usage.ENCRYPT,
      e2e.openpgp.packet.PublicKey);
};


/** @inheritDoc */
e2e.openpgp.block.TransferablePublicKey.prototype.header =
    'PUBLIC KEY BLOCK';
