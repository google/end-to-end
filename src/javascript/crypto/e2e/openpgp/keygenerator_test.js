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

/**
 * @fileoverview Tests for the preferences handler.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.openpgp.KeyGeneratorTest');

goog.require('e2e.algorithm.KeyLocations');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.openpgp.KeyGenerator');
goog.require('e2e.signer.Algorithm');
goog.require('goog.array');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');

goog.setTestOnly();


var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
var keyGenerator;
var stubs = new goog.testing.PropertyReplacer();

function setUp() {
  keyGenerator = new e2e.openpgp.KeyGenerator();
}

function testGetNextKey() {
  stubs.setPath('e2e.random.getRandomBytes', function(bytes) {
    return goog.array.range(bytes).map(function(i) { return i % 256; });
  });
  var key = keyGenerator.getNextKey_(256);
  assertArrayEquals(keyGenerator.eccSeed_,
      goog.array.range(e2e.openpgp.KeyGenerator.ECC_SEED_SIZE));
  assertEquals(keyGenerator.eccCount_, 1);
  assertEquals(key.length, 32);

  var key2 = keyGenerator.getNextKey_(256);
  assertNotEquals(key, key2);
  assertArrayEquals(keyGenerator.eccSeed_,
      goog.array.range(e2e.openpgp.KeyGenerator.ECC_SEED_SIZE));
  assertEquals(keyGenerator.eccCount_, 2);
  assertEquals(key2.length, 32);
}


/**
Ensure that generateKey always produces 2 key pairs
This is an assumption that we currently make when backing up / restoring
using backup key codes
*/
function testGenerateKeyProducesTwoKeyPairs() {
  var fn = goog.bind(keyGenerator.generateKey, keyGenerator,
      'test <test@example.com>', e2e.signer.Algorithm['ECDSA'], 256,
      e2e.cipher.Algorithm['ECDH'], 256);

  assertUndefined(keyGenerator.eccCount_);
  fn();
  assertEquals(keyGenerator.eccCount_, 2);
  fn();
  assertEquals(keyGenerator.eccCount_, 4);
}


/**
Test WebCrypto EC key generation
*/
function testGenerateWebCryptoECKey() {
  asyncTestCase.waitForAsync('Waiting for webcrypto keygen');
  var asyncKeys = keyGenerator.generateKey(
      'test <test@example.com>', e2e.signer.Algorithm['ECDSA'], 256,
      e2e.cipher.Algorithm['ECDH'], 256, e2e.algorithm.KeyLocations.WEB_CRYPTO);
  asyncKeys.addCallback(function(keys) {
    assertTrue(keys.length > 0);
    asyncTestCase.continueTesting();
  }).addErrback(fail);
}
