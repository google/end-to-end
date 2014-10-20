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
 * @fileoverview Encrypted Data packet. Parent class for
 *   Symmetrically Encrypted Data Packet (Tag 9) and
 *   Symmetrically Encrypted Integrity Protected Data Packet (Tag 18).
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.openpgp.packet.EncryptedData');

goog.require('e2e.openpgp.packet.Data');



/**
 * Representation of an Encrypted Data Packet.
 * @param {!e2e.ByteArray} encryptedData The encrypted data.
 * @extends {e2e.openpgp.packet.Data}
 * @constructor
 */
e2e.openpgp.packet.EncryptedData = function(
    encryptedData) {
  goog.base(this);

  /**
   * The encrypted data.
   * @type {!e2e.ByteArray}
   * @protected
   */
  this.encryptedData = encryptedData;

  /** @inheritDoc */
  this.data = [];
};
goog.inherits(e2e.openpgp.packet.EncryptedData,
    e2e.openpgp.packet.Data);


/**
 * Decrypts the encryptedData and populates this.data.
 * @param {e2e.cipher.Algorithm} algorithm The encryption algorithm.
 * @param {e2e.cipher.key.Key=} opt_keyObj The key object
 *     to decrypt the data.
 */
e2e.openpgp.packet.EncryptedData.prototype.decrypt =
    goog.abstractMethod;
