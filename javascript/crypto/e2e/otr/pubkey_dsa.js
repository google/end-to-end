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
 * @fileoverview Defines the DSA PUBKEY type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.pubkey.Dsa');

goog.require('e2e.otr');
goog.require('e2e.otr.pubkey.Pubkey');


/**
 * An OTRv3 DSA PUBKEY.
 * @constructor
 * @extends {e2e.otr.pubkey.Pubkey}
 * @param {!e2e.ByteArray} p DSA public key parameter p.
 * @param {!e2e.ByteArray} q DSA public key parameter q.
 * @param {!e2e.ByteArray} g DSA public key parameter g.
 * @param {!e2e.ByteArray} y DSA public key parameter y.
 */
e2e.otr.pubkey.Dsa = function(p, q, g, y) {
  goog.base(this);
  this.p_ = p;
  this.q_ = q;
  this.g_ = g;
  this.y_ = y;
};
goog.inherits(e2e.otr.pubkey.Dsa, e2e.otr.pubkey.Pubkey);


/**
 * Specifies the type of the public key.
 * @type {!e2e.otr.Short}
 */
e2e.otr.pubkey.Dsa.PUBKEY_TYPE = e2e.otr.constants.PubkeyType.DSA;


/** @inheritDoc */
e2e.otr.pubkey.Dsa.prototype.serializePubkey = function() {
  return e2e.otr.serializeBytes([
    new e2e.otr.Mpi(new Uint8Array(this.p_)),
    new e2e.otr.Mpi(new Uint8Array(this.q_)),
    new e2e.otr.Mpi(new Uint8Array(this.g_)),
    new e2e.otr.Mpi(new Uint8Array(this.y_))
  ]);
};


/**
 * Deconstructs DSA PUBKEY into p, q, g, and y.
 * @return {!e2e.signer.key.DsaPublicKey} The object containing p, q, g, and y.
 */
e2e.otr.pubkey.Dsa.prototype.deconstruct = function() {
  return {
    p: goog.array.clone(this.p_),
    q: goog.array.clone(this.q_),
    g: goog.array.clone(this.g_),
    y: goog.array.clone(this.y_)
  };
};


/**
 * Extracts a DSA PUBKEY from the body, and returns the DSA PUBKEY.
 * @param {!Uint8Array} body The body from where to extract the data.
 * @return {!e2e.otr.pubkey.Dsa} The generated packet.
 */
e2e.otr.pubkey.Dsa.parse = function(body) {
  var iter = new e2e.otr.util.Iterator(body);
  throw new e2e.otr.error.NotImplementedError('Not yet implemented.');
};

e2e.otr.pubkey.Pubkey.add(e2e.otr.pubkey.Dsa);
