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
 * @fileoverview User Attribute packet stub.
 */

goog.provide('e2e.openpgp.packet.UserAttribute');

goog.require('e2e.openpgp.packet.Packet');
goog.require('e2e.openpgp.packet.factory');



/**
 * @constructor
 * @extends {e2e.openpgp.packet.Packet}
 */
e2e.openpgp.packet.UserAttribute = function() {
  goog.base(this);
  /**
   * @type {Array.<e2e.openpgp.packet.Signature>}
   * @private
   */
  this.certifications_ = [];
};
goog.inherits(e2e.openpgp.packet.UserAttribute,
              e2e.openpgp.packet.Packet);


/** @inheritDoc */
e2e.openpgp.packet.UserAttribute.prototype.tag = 17;


/**
 * @param {e2e.openpgp.packet.Signature} sig
 */
e2e.openpgp.packet.UserAttribute.prototype.addCertification =
    function(sig) {
  this.certifications_.push(sig);
};


/**
 * @param {e2e.ByteArray} body
 * @return {e2e.openpgp.packet.UserAttribute}
 */
e2e.openpgp.packet.UserAttribute.parse = function(body) {
  // TODO(evn): Implement parsing.
  return new e2e.openpgp.packet.UserAttribute;
};


e2e.openpgp.packet.factory.add(e2e.openpgp.packet.UserAttribute);
