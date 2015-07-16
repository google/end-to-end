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
 * @fileoverview Tests for the preferences handler.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.openpgp.Context2ImplTest');

goog.require('e2e');
goog.require('e2e.openpgp.Context2Impl');
goog.require('e2e.openpgp.KeyPurposeType');
goog.require('e2e.openpgp.KeyRingType');
goog.require('e2e.openpgp.SimpleKeyManager');
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockClassFactory');
goog.require('goog.testing.jsunit');
goog.setTestOnly();


var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
var contextPromise;
var keyManagerMock;
var mockClassFactory;

function setUp() {
  mockClassFactory = new goog.testing.MockClassFactory();
  keyManagerMock = mockClassFactory.getStrictMockClass(e2e.openpgp,
      e2e.openpgp.SimpleKeyManager);
  contextPromise = e2e.openpgp.Context2Impl.launch(
      goog.Promise.resolve(keyManagerMock));
}

function tearDown() {
  mockClassFactory.reset();
}


function testConstructor() {
  asyncTestCase.waitForAsync('Waiting for async call.');

  contextPromise.then(function(context) {
    assertTrue(context instanceof e2e.openpgp.Context2Impl);
    asyncTestCase.continueTesting();
  });
}

function testKeyManagerProxyMethods() {
  var key = 'A_KEY';
  var email = 'email@example.com';
  var provider = 'testProvider';
  var fingerprint = 'fingerprint';
  var credentials = 'creds';
  var options = 'dummy';
  var returnValueCount = 0;
  var expectedReturnValueCount = 0;

  keyManagerMock.getTrustedKeys(e2e.openpgp.KeyPurposeType.ENCRYPTION, email).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.getAllKeys(e2e.openpgp.KeyRingType.SECRET, provider).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.getAllKeys(e2e.openpgp.KeyRingType.PUBLIC, provider).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.getKeyByFingerprint(fingerprint, provider).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.setProviderCredentials(provider, credentials).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.getAllKeyGenerateOptions().
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.generateKeyPair(email, options).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.getKeyringExportOptions(e2e.openpgp.KeyRingType.PUBLIC).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.exportKeyring(e2e.openpgp.KeyRingType.PUBLIC, options).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.trustKeys(
      [key], email, e2e.openpgp.KeyPurposeType.ENCRYPTION, options).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.unlockKey(key, options).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.getKeysDescription(key).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.importKeys(key, options).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.getAllKeysByEmail(email).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.removeKeys([key]).
      $returns(goog.Promise.resolve(returnValueCount++));
  keyManagerMock.removeKeys([key]).
      $throws(new Error('Dummy error.'));

  keyManagerMock.$replay();

  asyncTestCase.waitForAsync('Waiting for async call.');

  var context = new e2e.openpgp.Context2Impl(keyManagerMock);

  context.getTrustedKeys(e2e.openpgp.KeyPurposeType.ENCRYPTION, email)
      .then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.getAllSecretKeys(provider);
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.getAllPublicKeys(provider);
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.getKeyByFingerprint(fingerprint, provider);
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.setProviderCredentials(provider, credentials);
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.getAllKeyGenerateOptions();
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.generateKeyPair(email, options);
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.getKeyringExportOptions(e2e.openpgp.KeyRingType.PUBLIC);
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.exportKeyring(e2e.openpgp.KeyRingType.PUBLIC, options);
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.trustKeys([key], email,
            e2e.openpgp.KeyPurposeType.ENCRYPTION, options);
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.unlockKey(key, options);
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.getKeysDescription(key);
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.importKeys(key, options);
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.getAllKeysByEmail(email);
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.removeKeys([key]);
      }).then(function(res) {
        assertEquals(expectedReturnValueCount++, res);
        return context.removeKeys([key]); // This will throw an error.
      }).then(fail, function(error) {
        assertTrue(error instanceof Error);
        keyManagerMock.$verify();
        asyncTestCase.continueTesting();
      });
}
