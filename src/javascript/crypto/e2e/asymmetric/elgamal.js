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
 * @fileoverview Representation of ElGamal. This should only be used with a
 * wrapping function such as PKCS v1.5 EME.
 */

goog.provide('e2e.cipher.ElGamal');

goog.require('e2e');
goog.require('e2e.AlgorithmImpl');
goog.require('e2e.BigNum');
goog.require('e2e.BigPrimeNum');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.cipher.AsymmetricCipher');
goog.require('e2e.cipher.factory');
goog.require('e2e.random');
goog.require('goog.array');
goog.require('goog.asserts');



/**
 * Representation of an ElGamal public key as specified by RFC 4880.
 * @param {!e2e.cipher.Algorithm} algorithm The algorithm to retrieve.
 * @param {e2e.cipher.key.Key=} opt_key The public or private key.
 * @constructor
 * @implements {e2e.cipher.AsymmetricCipher}
 * @extends {e2e.AlgorithmImpl}
 */
e2e.cipher.ElGamal = function(algorithm, opt_key) {
  goog.base(this, e2e.cipher.Algorithm.ELGAMAL, opt_key);
};
goog.inherits(e2e.cipher.ElGamal, e2e.AlgorithmImpl);


/**
 * @type {?e2e.BigPrimeNum}
 */
e2e.cipher.ElGamal.prototype.modulus;


/** @inheritDoc */
e2e.cipher.ElGamal.prototype.setKey = function(key) {
  goog.asserts.assertArray(key['p'], 'Modulus should be defined.');
  this.modulus = new e2e.BigPrimeNum(key['p']);
  goog.base(this, 'setKey', key, Math.ceil(this.modulus.getBitLength() / 8));
};


/** @inheritDoc */
e2e.cipher.ElGamal.prototype.encrypt = function(plaintext) {
  goog.asserts.assertArray(this.key['y'],
      'Public key value should be defined.');
  goog.asserts.assertArray(this.key['g'],
      'Generator should be defined.');
  goog.asserts.assert(
      this.modulus.compare(new e2e.BigNum(plaintext)) > 0,
      'The plaintext value should be less than the modulus.');
  /** @type {!e2e.cipher.ciphertext.Elgamal} */
  var ciphertext = {'u': [], 'v': []};
  var oneTimeKeyLength = this.key['p'].length;
  do {
    var k = e2e.random.getRandomBytes(oneTimeKeyLength);
    ciphertext['u'] = this.modulus.pow(this.key['g'], k);
  } while (e2e.compareByteArray(ciphertext['u'], [1]));
  ciphertext['v'] = this.modulus.mul(plaintext,
      this.modulus.pow(this.key['y'], k));
  goog.array.forEach(k, function(v, i) {
    // Clear memory.
    k[i] = Math.random();
  });
  return e2e.async.Result.toResult(ciphertext);
};


/** @inheritDoc */
e2e.cipher.ElGamal.prototype.decrypt = function(ciphertext) {
  goog.asserts.assertArray(this.key['x'],
      'Private key value should be defined.');
  goog.asserts.assertArray(ciphertext['v'],
      'ElGamal v value should be defined.');
  goog.asserts.assertArray(ciphertext['u'],
      'ElGamal u value should be defined.');
  var v = ciphertext['v'];  // v == c2 == m * y**k mod p
  var u = ciphertext['u'];  // u == c1 == g**k mod p
  var result = this.modulus.mul(
      v, this.modulus.pow(
          u, this.modulus.negateExponent(this.key['x'])));
  return e2e.async.Result.toResult(result);
};


e2e.cipher.factory.add(e2e.cipher.ElGamal, e2e.cipher.Algorithm.ELGAMAL);
