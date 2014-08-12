// Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Defines the SIG type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.Sig');

goog.require('e2e.async.Result');
goog.require('e2e.otr');
goog.require('e2e.otr.constants');
goog.require('e2e.otr.error.NotImplementedError');
goog.require('e2e.signer.Algorithm');
goog.require('e2e.signer.factory');
goog.require('goog.asserts');


/**
 * An OTRv3 SIG.
 * @constructor
 * @implements {e2e.otr.Serializable}
 * @param {!e2e.signer.key.Dsa} key The DSA key used for signing.
 * @param {!e2e.ByteArray} data The data to sign.
 */
e2e.otr.Sig = function(key, data) {
  assert(key.q.length == 20);
  this.sig_ = e2e.async.Result.getValue(
    e2e.signer.factory.get(e2e.signer.Algorithm.DSA, key).sign(data));
  e2e.otr.implements(e2e.otr.Sig, e2e.otr.Serializable);
};


/** @inheritDoc */
e2e.otr.Sig.prototype.serialize = function() {
  return e2e.otr.concat([this.sig_.r, this.sig_.s]);
};


/**
 * Extracts a SIG from the body, and returns the SIG.
 * @param {!Uint8Array} body The body from where to extract the data.
 * @return {!e2e.otr.Sig} The generated packet.
 */
e2e.otr.Sig.parse = function(body) {
  throw new e2e.otr.error.NotImplementedError('Not yet implemented.');
};
