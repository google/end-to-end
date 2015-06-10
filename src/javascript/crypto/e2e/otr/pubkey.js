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
 * @fileoverview Defines the PUBKEY type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.pubkey.Pubkey');

goog.require('e2e.error.UnsupportedError');
goog.require('e2e.otr');
goog.require('e2e.otr.Serializable');
goog.require('e2e.otr.Storable');
goog.require('e2e.otr.constants.PubkeyType');
goog.require('e2e.otr.error.ParseError');


goog.scope(function() {

var constants = e2e.otr.constants;

var PUBKEY_TYPE_VALUES = Object.keys(e2e.otr.constants.PubkeyType).map(
    function(key) {
      return e2e.otr.shortToNum(e2e.otr.constants.PubkeyType[key]);
    });



/**
 * An OTRv3 PUBKEY.
 * @constructor
 * @implements {e2e.otr.Serializable}
 * @extends {e2e.otr.Storable}
 */
e2e.otr.pubkey.Pubkey = function() {
  //TODO(rcc): Remove when closure compiler issue #104 (@abstract) is resolved.
  assert(this.constructor != e2e.otr.pubkey.Pubkey);

  assert(goog.isDefAndNotNull(this.constructor.PUBKEY_TYPE));
  assert(PUBKEY_TYPE_VALUES.indexOf(
      e2e.otr.shortToNum(this.constructor.PUBKEY_TYPE)) != -1);

  e2e.otr.implements(e2e.otr.pubkey.Pubkey, e2e.otr.Serializable);
};
goog.inherits(e2e.otr.pubkey.Pubkey, e2e.otr.Storable);


/**
 * Specifies the type of the public key.
 * @type {!e2e.otr.Short}
 */
e2e.otr.pubkey.Pubkey.PUBKEY_TYPE;


/**
 * Serializes the public key.
 * @final
 * @return {!Uint8Array} The serialized key.
 */
e2e.otr.pubkey.Pubkey.prototype.serialize = function() {
  return e2e.otr.concat([this.constructor.PUBKEY_TYPE, this.serializePubkey()]);
};


/**
 * Serializes the public key data.
 * @return {!Uint8Array} The serialized key data.
 */
e2e.otr.pubkey.Pubkey.prototype.serializePubkey = goog.abstractMethod;


/**
 * Deconstructs PUBKEY into component data.
 * @return {!e2e.otr.PublicKeyAny} The object containing the component data.
 */
e2e.otr.pubkey.Pubkey.prototype.deconstruct = goog.abstractMethod;


/**
 * Object that keeps track of key types available.
 * @private
 * @type {!Object.<number, function(!Uint8Array):!e2e.otr.pubkey.Pubkey>}
 */
e2e.otr.pubkey.Pubkey.registeredKeyTypes_ = {};


/**
 * Registers a key type for parsing.
 * @param {!function(new: e2e.otr.pubkey.Pubkey,...)} key The key constructor.
 */
e2e.otr.pubkey.Pubkey.add = function(key) {
  e2e.otr.pubkey.Pubkey.registeredKeyTypes_[
      e2e.otr.shortToNum(key.PUBKEY_TYPE)] = key.parse;
};


/**
 * Extracts a PUBKEY from the body, and returns the PUBKEY.
 * @param {!Uint8Array} body The body from where to extract the data.
 * @return {!e2e.otr.pubkey.Pubkey} The generated packet.
 */
e2e.otr.pubkey.Pubkey.parse = function(body) {
  if (body.length < 2) {
    throw new e2e.otr.error.ParseError('Invalid pubkey header.');
  }

  var type = e2e.otr.shortToNum(body.subarray(0, 2));
  var parser = e2e.otr.pubkey.Pubkey.registeredKeyTypes_[type];
  if (!parser) {
    throw new e2e.error.UnsupportedError('Pubkey type not supported.');
  }

  return parser(body.subarray(2));
};
});  // goog.scope
