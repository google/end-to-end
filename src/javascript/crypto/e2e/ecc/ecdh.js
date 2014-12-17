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
 * @fileoverview An implementation of the one-pass ECDH key exchange protocol,
 *     which is the ECC version of HAC 12.51.
 *     In this protocol, Alice knows Bob's public key B and she wants to derive
 *     a shared secret with him. She generates an ephemeral private key a,
 *     computes the ephemeral public key A = aG (G is the base point of the
 *     curve), and derives the shared secret S = aB. She then sends A to Bob,
 *     who shall derive the shared secret with his private key b by computing
 *     S = bA = baG = aB.
 *     Note: the actual shared secret is the x-coordinate of S.
 * @author thaidn@google.com (Thai Duong)
 */

goog.provide('e2e.ecc.Ecdh');

goog.require('e2e.ecc.Protocol');
goog.require('goog.asserts');



/**
 * Representation of an instance of the one-pass ECDH key agreement protocol,
 *     which is the ECC version of HAC 12.51.
 *     In this protocol, Alice knows Bob's public key B and she wants to derive
 *     a shared secret with him. She generates an ephemeral private key a,
 *     computes the ephemeral public key A = aG (G is the base point of the
 *     curve), and derives the shared secret S = aB. She then sends A to Bob,
 *     who shall derive the shared secret with his private key b by computing
 *     S = bA = baG = aB.
 *     Note: the actual shared secret is the x-coordinate of S.
 * @param {!e2e.ecc.PrimeCurve} curve The curve used for this protocol.
 * @param {{pubKey: !e2e.ByteArray, privKey: (!e2e.ByteArray|undefined)}=}
 *     opt_key The public and/or private key used in this protocol.
 * @constructor
 * @extends {e2e.ecc.Protocol}
 */
e2e.ecc.Ecdh = function(curve, opt_key) {
  e2e.ecc.Ecdh.base(this, 'constructor', curve, opt_key);
};
goog.inherits(e2e.ecc.Ecdh, e2e.ecc.Protocol);


/**
 * Acts as Alice in the one-pass ECDH protocol. Alice knows Bob's public key B
 *     and she wants to derive a shared secret with him. She generates an
 *     ephemeral private key a, computes the ephemeral public key A = aG (G is
 *     the base point of the curve), and derives the shared secret S = aB.
 *     The public key used here should belong to Bob. The returned message
 *     consists of Alice's ephemeral public key and the shared key, which is
 *     the x-coordinate of the shared secret value.
 * @param {!e2e.ByteArray=} opt_bobPubKey Bob's public key.
 * @return {{secret: !e2e.ByteArray,
 *           pubKey: !e2e.ByteArray}}
 */
e2e.ecc.Ecdh.prototype.alice = function(opt_bobPubKey) {
  goog.asserts.assertObject(this.params, 'Domain params should be defined.');
  var publicKey;
  if (goog.isDefAndNotNull(opt_bobPubKey)) {
    publicKey = this.params.curve.pointFromByteArray(opt_bobPubKey);
  } else {
    publicKey = this.getPublicKeyAsPoint();
  }
  goog.asserts.assertObject(publicKey, 'Public key should be defined.');
  // The per-message secret is also the ephemeral private key in ECDH.
  var ephemeralKeyPair = this.params.generateKeyPair();
  var ephemeralPrivateBigNum = ephemeralKeyPair['privateKeyBigNum'];
  var ephemeralPublicKey = ephemeralKeyPair['publicKey'];
  return {
    'secret': this.params.calculateSharedSecret(publicKey,
                                                ephemeralPrivateBigNum),
    'pubKey': ephemeralPublicKey
  };
};


/**
 * Acts as Bob in the one-pass ECDH protocol. Bob receives Alice's ephemeral
 *     public key from which he derives the shared secret using his private key
 *     b by computing S = bA = baG = aB.
 *     The public key used here is Alice's ephemeral public key. The private
 *     key should belong to Bob. The returned message is the shared key, which
 *     is the x-coordinate of the shared secret value.
 * @param {!e2e.ByteArray} alicePubKey Alice's ephemeral public key,
 *     which is sent by Alice to Bob as part of the protocol.
 * @param {!e2e.ByteArray=} opt_bobPrivKey Bob's private key.
 * @return {{secret: !e2e.ByteArray}}
 */
e2e.ecc.Ecdh.prototype.bob = function(alicePubKey, opt_bobPrivKey) {
  goog.asserts.assertObject(this.params, 'Domain params should be defined.');

  var privateKeyBytes = opt_bobPrivKey || this.getPrivateKey();
  var privateKey = this.params.bigNumFromPrivateKey(privateKeyBytes);
  goog.asserts.assertObject(privateKey, 'Private key should be defined.');
  var publicKey = this.params.curve.pointFromByteArray(alicePubKey);
  return {
    'secret': this.params.calculateSharedSecret(publicKey, privateKey)
  };
};
