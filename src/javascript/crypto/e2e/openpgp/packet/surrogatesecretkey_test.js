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
 * @fileoverview Tests for SurrogateSecretKey.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.openpgp.packet.SurrogateSecretKeyTest');


goog.require('e2e.cipher.Algorithm');
goog.require('e2e.hash.Algorithm');
goog.require('e2e.openpgp.packet.SurrogateSecretKey');
goog.require('e2e.signer.Algorithm');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.setTestOnly();


var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);

function testInvalidSigningAlgo() {
  var keyId = 'KEYID';
  assertThrows(function() {
    new e2e.openpgp.packet.SurrogateSecretKey(keyId,
        'INVALID',
        goog.nullFunction);
  });
}


function testInvalidHashAlgo() {
  var keyId = 'KEYID';
  assertThrows(function() {
    new e2e.openpgp.packet.SurrogateSecretKey(keyId,
        e2e.signer.Algorithm.ECDSA,
        goog.nullFunction,
        'INVALID');
  });
}

function testInvalidCipherAlgo() {
  var keyId = 'KEYID';
  assertThrows(function() {
    new e2e.openpgp.packet.SurrogateSecretKey(keyId,
        e2e.signer.Algorithm.ECDSA,
        undefined,
        goog.nullFunction
    );
  });
}


function testSigning() {
  var called = false;
  var dataToSign = 'test';
  var keyId = 'KEYID';
  var signAlgo = e2e.signer.Algorithm.ECDSA;
  var hashAlgo = e2e.hash.Algorithm.SHA256;
  var surrogate = new e2e.openpgp.packet.SurrogateSecretKey(keyId,
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
  assertEquals(keyId, surrogate.keyId);
  assertEquals(signAlgo, surrogate.cipher.algorithm);
  assertEquals(hashAlgo, surrogate.cipher.getHashAlgorithm());
  assertThrows(function() {
    surrogate.cipher.decrypt(dataToSign);
  });
  assertFalse(called);
  asyncTestCase.waitForAsync('Waiting for signing.');
  surrogate.cipher.sign(dataToSign).addCallback(function(result) {
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
  var surrogate = new e2e.openpgp.packet.SurrogateSecretKey(keyId,
      decryptAlgo,
      undefined,
      function(decryptA, data) {
        assertEquals(decryptAlgo, decryptA);
        assertEquals(dataToDecrypt, data);
        called = true;
        return 'decrypted';
      });
  assertEquals(keyId, surrogate.keyId);
  assertEquals(decryptAlgo, surrogate.cipher.algorithm);
  assertThrows(function() {
    surrogate.cipher.getHashAlgorithm();
  });
  assertThrows(function() {
    surrogate.cipher.sign(dataToDecrypt);
  });
  assertFalse(called);
  asyncTestCase.waitForAsync('Waiting for decryption.');
  surrogate.cipher.decrypt(dataToDecrypt).addCallback(function(result) {
    assertEquals('decrypted', result);
    assertTrue(called);
    asyncTestCase.continueTesting();
  });
}


function testConstructSigningKey() {
  var called = false;
  var dataToSign = 'test';
  var keyId = 'KEYID';
  var signAlgo = e2e.signer.Algorithm.ECDSA;
  var hashAlgo = e2e.hash.Algorithm.SHA256;
  var key = {
    signingKeyId: keyId,
    signAlgorithm: signAlgo,
    signHashAlgorithm: hashAlgo
  };
  var surrogate = e2e.openpgp.packet.SurrogateSecretKey.constructSigningKey(key,
      function(k, kId, signA, hashA, data) {
        assertObjectEquals(key, k);
        assertEquals(keyId, kId);
        assertEquals(signAlgo, signA);
        assertEquals(hashAlgo, hashA);
        assertEquals(dataToSign, data);
        called = true;
        return 'signed';
      });
  assertEquals(keyId, surrogate.keyId);
  assertEquals(signAlgo, surrogate.cipher.algorithm);
  assertEquals(hashAlgo, surrogate.cipher.getHashAlgorithm());
  surrogate.cipher.sign(dataToSign).addCallback(function(result) {
    assertEquals('signed', result);
    assertTrue(called);
    asyncTestCase.continueTesting();
  });
}
