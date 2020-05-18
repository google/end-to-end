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
 * @fileoverview Tests for the KeyProviderCipher.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.openpgp.KeyProviderCipherTest');

goog.require('e2e.cipher.Algorithm');
goog.require('e2e.hash.Algorithm');
goog.require('e2e.openpgp.KeyProviderCipher');
goog.require('e2e.signer.Algorithm');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');

goog.setTestOnly();

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);

function testInvalidSigningAlgo() {
  assertThrows(function() {
    new e2e.openpgp.KeyProviderCipher('INVALID',
        goog.nullFunction);
  });
}


function testInvalidHashAlgo() {
  assertThrows(function() {
    new e2e.openpgp.KeyProviderCipher(e2e.signer.Algorithm.ECDSA,
        goog.nullFunction,
        'INVALID');
  });
}

function testInvalidCipherAlgo() {
  assertThrows(function() {
    new e2e.openpgp.KeyProviderCipher(keyId,
        e2e.signer.Algorithm.ECDSA,
        undefined,
        goog.nullFunction
    );
  });
}


function testSigning() {
  var called = false;
  var dataToSign = 'test';
  var signAlgo = e2e.signer.Algorithm.ECDSA;
  var hashAlgo = e2e.hash.Algorithm.SHA256;
  var cipher = new e2e.openpgp.KeyProviderCipher(
      signAlgo,
      function(signA, hashA, data) {
        assertEquals(signAlgo, signA);
        assertEquals(hashAlgo, hashA);
        assertEquals(dataToSign, data);
        called = true;
        return 'signed';
      },
      undefined,
      hashAlgo);
  assertEquals(signAlgo, cipher.algorithm);
  assertEquals(hashAlgo, cipher.getHashAlgorithm());
  assertThrows(function() {
    cipher.decrypt(dataToSign);
  });
  assertFalse(called);
  asyncTestCase.waitForAsync('Waiting for signing.');
  cipher.sign(dataToSign).addCallback(function(result) {
    assertEquals('signed', result);
    assertTrue(called);
    asyncTestCase.continueTesting();
  });
}


function testDecryption() {
  var called = false;
  var dataToDecrypt = 'test';
  var keyId = 'KEYID';
  var decryptAlgo = e2e.cipher.Algorithm.ECDH;
  var cipher = new e2e.openpgp.KeyProviderCipher(
      decryptAlgo,
      undefined,
      function(decryptA, data) {
        assertEquals(decryptAlgo, decryptA);
        assertEquals(dataToDecrypt, data);
        called = true;
        return 'decrypted';
      });
  assertEquals(decryptAlgo, cipher.algorithm);
  assertThrows(function() {
    cipher.getHashAlgorithm();
  });
  assertThrows(function() {
    cipher.sign(dataToDecrypt);
  });
  assertFalse(called);
  asyncTestCase.waitForAsync('Waiting for decryption.');
  cipher.decrypt(dataToDecrypt).addCallback(function(result) {
    assertEquals('decrypted', result);
    assertTrue(called);
    asyncTestCase.continueTesting();
  });
}
