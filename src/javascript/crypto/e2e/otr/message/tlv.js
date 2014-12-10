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
 * @fileoverview Defines the TLV record type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.Tlv');

goog.require('e2e.otr');
goog.require('e2e.otr.Serializable');
goog.require('e2e.otr.constants.TlvType');
goog.require('e2e.otr.error.NotImplementedError');


goog.scope(function() {

var constants = e2e.otr.constants;

var TLV_TYPE_VALUES = Object.keys(e2e.otr.constants.TlvType).map(
    function(key) {
      return e2e.otr.shortToNum(e2e.otr.constants.TlvType[key]);
    });



/**
 * An OTRv3 TLV record.
 * @constructor
 * @implements {e2e.otr.Serializable}
 * @param {!e2e.otr.Session} session The enclosing session.
 */
e2e.otr.message.Tlv = function(session) {
  //TODO(rcc): Remove when closure compiler issue #104 (@abstract) is resolved.
  assert(this.constructor != e2e.otr.message.Tlv);
  assert(goog.isFunction(this.constructor.process));

  assert(goog.isDefAndNotNull(this.constructor.TLV_TYPE));
  assert(TLV_TYPE_VALUES.indexOf(
      e2e.otr.shortToNum(this.constructor.TLV_TYPE)) != -1);

  this.session_ = session;

  e2e.otr.implements(e2e.otr.message.Tlv, e2e.otr.Serializable);
};


/**
 * Specifies the type of the TLV.
 * @type {!e2e.otr.Short}
 */
e2e.otr.message.Tlv.TLV_TYPE;


/**
 * Serialize the TLV record into a Uint8Array.
 * @return {!Uint8Array} The serialized TLV record.
 */
e2e.otr.message.Tlv.prototype.serialize = function() {
  throw new e2e.otr.error.NotImplementedError('Not yet implemented.');
};


/**
 * Serializes the data contained in the TLV.
 * @return {!Uint8Array} The serialized TLV content.
 */
e2e.otr.message.Tlv.prototype.serializeRecordContent = goog.abstractMethod;


/**
 * Processes a TLV record message.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {!Uint8Array} data The data to be processed.
 */
e2e.otr.message.Tlv.process = function(session, data) {
  throw new e2e.otr.error.NotImplementedError('Not yet implemented.');
};
});  // goog.scope
