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
 * @fileoverview Defines the DSA PUBKEY type used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.pubkey.Dsa');

goog.require('e2e');
goog.require('e2e.otr');
goog.require('e2e.otr.Mpi');
goog.require('e2e.otr.constants.PubkeyType');
goog.require('e2e.otr.error.ParseError');
goog.require('e2e.otr.pubkey.Pubkey');
goog.require('e2e.otr.util.Iterator');
goog.require('goog.array');



/**
 * An OTRv3 DSA PUBKEY.
 * @constructor
 * @extends {e2e.otr.pubkey.Pubkey}
 * @param {!e2e.signer.key.DsaPublicKey} key DSA public key object.
 */
e2e.otr.pubkey.Dsa = function(key) {
  goog.base(this);
  this.p_ = goog.array.clone(key.p);
  this.q_ = goog.array.clone(key.q);
  this.g_ = goog.array.clone(key.g);
  this.y_ = goog.array.clone(key.y);
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
  var key = {
    p: e2e.otr.Mpi.parse(iter.nextEncoded()),
    q: e2e.otr.Mpi.parse(iter.nextEncoded()),
    g: e2e.otr.Mpi.parse(iter.nextEncoded()),
    y: e2e.otr.Mpi.parse(iter.nextEncoded())
  };
  if (iter.hasNext()) {
    throw new e2e.otr.error.ParseError('Malformed DSA PUBKEY.');
  }
  return new e2e.otr.pubkey.Dsa(key);
};


/** @inheritDoc */
e2e.otr.pubkey.Dsa.prototype.pack = function() {
  return {p: this.p_, q: this.q_, g: this.g_, y: this.y_};
};


/** @inheritDoc */
e2e.otr.pubkey.Dsa.unpack = function(data) {
  assert(e2e.isByteArray(data.p) && e2e.isByteArray(data.q) &&
      e2e.isByteArray(data.g) && e2e.isByteArray(data.y));
  return new e2e.otr.pubkey.Dsa(/** @type {!e2e.signer.key.DsaPublicKey} */
      (data));
};

e2e.otr.pubkey.Pubkey.add(e2e.otr.pubkey.Dsa);
