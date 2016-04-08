/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
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

goog.provide('e2e.openpgp.block.Armorable');



/**
 * The interface representing OpenPGP blocks that can be ASCII-armored.
 * This will include common OpenPGP blocks and a Clearsign message.
 * @interface
 */
e2e.openpgp.block.Armorable = function() {};


/**
 * Text to use in the ASCII Armor message header for this type of block.
 * @type {string}
 */
e2e.openpgp.block.Armorable.prototype.header;


/**
 * Returns the block signatures to include in the separate section of the
 * ASCII armor. Only useful in clearsign messages.
 * @return {!Array.<!e2e.openpgp.packet.Signature|
 *                !e2e.openpgp.packet.OnePassSignature>}
 */
e2e.openpgp.block.Armorable.prototype.getArmorSignatures = goog.abstractMethod;


/**
 * Returns the armorable block body. This is different than {@link #serialize}
 * for clearsign messages.
 * @return {!e2e.ByteArray}
 */
e2e.openpgp.block.Armorable.prototype.getArmorBody = goog.abstractMethod;


/**
 * Serializes the block to a byte array.
 * @return {!e2e.ByteArray} The serialization of the block.
 */
e2e.openpgp.block.Armorable.prototype.serialize = goog.abstractMethod;
