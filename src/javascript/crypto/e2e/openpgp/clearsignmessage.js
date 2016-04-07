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
 * @fileoverview Class to provide operations on OpenPGP clear sign messages
 * @author koto@google.com (Krzysztof Kotowicz)
 */

goog.provide('e2e.openpgp.ClearSignMessage');

goog.require('e2e');
goog.require('e2e.openpgp.block.Armorable');
goog.require('e2e.openpgp.block.LiteralMessage');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.packet.Signature');
goog.require('e2e.openpgp.parse');
goog.require('goog.string');



/**
 * Representation of a clearsign message.
 * @param {string} body The body
 * @param {!e2e.ByteArray} signatureBytes The serialized signature
 * @param {string=} opt_hash Hash algorithm declared in the message
 * @constructor
 * @implements {e2e.openpgp.block.Armorable}
 */
e2e.openpgp.ClearSignMessage = function(body, signatureBytes, opt_hash) {
  this.literal_ = e2e.openpgp.block.LiteralMessage.construct(body);
  var parsed = e2e.openpgp.parse.parseSerializedPacket(signatureBytes);
  if (! (parsed instanceof e2e.openpgp.packet.Signature)) {
    throw new e2e.openpgp.error.ParseError(
        'No signature present in clearsigned message.');
  }
  this.literal_.addSignature(
      /** @type {!e2e.openpgp.packet.Signature} */ (parsed));
  if (opt_hash && (parsed.hashAlgorithm != opt_hash)) {
    throw new e2e.openpgp.error.ParseError('Digest algorithms mismatch.');
  }
};


/** @override */
e2e.openpgp.ClearSignMessage.prototype.header = 'SIGNED MESSAGE';


/**
 * Canonicalizes data by converting all line endings to CR+LF and removing
 * trailing whitespace.
 * @param {string} data The text to canonicalize.
 * @return {string} The canonicalized text.
 */
e2e.openpgp.ClearSignMessage.canonicalize = function(data) {
  var normalized = data.replace(/[\x20\x09]*(\r\n|\r|\n)/g, '\r\n');

  // removes trailing newline
  if (goog.string.endsWith(normalized, '\r\n')) {
    normalized = goog.string.removeAt(normalized, normalized.length - 2, 2);
  }

  return normalized;
};


/**
 * @type {!e2e.openpgp.block.LiteralMessage} Literal message equivalent of a
 *     clearsign message.
 * @private
 */
e2e.openpgp.ClearSignMessage.prototype.literal_;


/**
 * Creates a new cleartext message, signed using the specified key.
 * @param  {string} plaintext Message to sign.
 * @param  {!e2e.openpgp.packet.SecretKeyInterface} key Signer key.
 *   Will throw {e2e.openpgp.error.InvalidArgumentsError} if the key has no
 *   signing capability.
 * @return {!e2e.async.Result.<!e2e.openpgp.ClearSignMessage>} Created message.
 */
e2e.openpgp.ClearSignMessage.construct = function(plaintext, key) {
  plaintext = e2e.openpgp.ClearSignMessage.canonicalize(plaintext);
  var message = e2e.openpgp.block.LiteralMessage.construct(plaintext);
  var sigRes = message.sign(
      key, e2e.openpgp.packet.Signature.SignatureType.TEXT);
  return sigRes.addCallback(
      function() {
        return new e2e.openpgp.ClearSignMessage(plaintext,
            message.signatures[0].serialize(),
            message.signatures[0].hashAlgorithm);
      });
};


/**
 * Returns a LiteralMessage equivalent of a clearsign message with a signature.
 * @return {!e2e.openpgp.block.LiteralMessage}
 */
e2e.openpgp.ClearSignMessage.prototype.toLiteralMessage = function() {
  return this.literal_;
};


/**
 * Returns signature packet.
 * @return {!e2e.openpgp.packet.Signature}
 */
e2e.openpgp.ClearSignMessage.prototype.getSignature = function() {
  return /** @type {!e2e.openpgp.packet.Signature} */ (
      this.literal_.signatures[0]);
};


/** @override */
e2e.openpgp.ClearSignMessage.prototype.getArmorSignatures = function() {
  return this.literal_.signatures;
};


/** @override */
e2e.openpgp.ClearSignMessage.prototype.getArmorBody = function() {
  return this.literal_.getData();
};


/** @override */
e2e.openpgp.ClearSignMessage.prototype.serialize = function() {
  return this.literal_.serialize();
};
