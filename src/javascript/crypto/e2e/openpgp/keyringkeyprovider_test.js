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
 * @fileoverview Tests for the KeyringKeyProvider.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.openpgp.KeyringKeyProviderTest');

goog.require('e2e.algorithm.KeyLocations');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.openpgp.KeyPurposeType');
goog.require('e2e.openpgp.KeyRing');
goog.require('e2e.openpgp.KeyRingType');
goog.require('e2e.openpgp.KeyringKeyProvider');
goog.require('e2e.openpgp.LockableStorage');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.signer.Algorithm');
goog.require('goog.array');
goog.require('goog.object');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.storage.FakeMechanism');
goog.setTestOnly();


var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
var providerPromise;
var keyRingPromise;
var lockableStorage;
var EMAIL = 'ecc@example.com';
var UID = '<' + EMAIL + '>';

function setUp() {
  storage = new goog.testing.storage.FakeMechanism();
  lockableStorage = new e2e.openpgp.LockableStorage(storage);
  lockableStorage.setPassphrase('test');
  keyRingPromise = e2e.openpgp.KeyRing.launch(lockableStorage);
  providerPromise = e2e.openpgp.KeyringKeyProvider.launch(keyRingPromise);
}

function testConstructor() {
  asyncTestCase.waitForAsync('Waiting for async call.');
  providerPromise.then(function(kkp) {
    assertTrue(kkp.keyring_ instanceof e2e.openpgp.KeyRing);
    asyncTestCase.continueTesting();
  }, fail);
}

function testGenerateKeys() {
  var provider;
  var generateOptions;
  var email = 'test@example.com';
  function chooseDefault(options) {
    return goog.object.map(options, function(value) {
      return value[0];
    });
  }
  asyncTestCase.waitForAsync('Waiting for async call.');
  providerPromise.then(function(kkp) {
    provider = kkp;
    return kkp.getKeyGenerateOptions();
  }, fail).then(function(kgo) {
    generateOptions = kgo;
    assertEquals(1, kgo.length);
    assertContains(e2e.algorithm.KeyLocations.JAVASCRIPT, kgo[0].keyLocation);
    assertContains(e2e.signer.Algorithm.ECDSA, kgo[0].keyAlgo);
    assertContains(e2e.cipher.Algorithm.ECDH, kgo[0].subkeyAlgo);
    asyncTestCase.waitForAsync('Waiting for key generation');
    return provider.generateKeyPair(email, chooseDefault(kgo[0]));
  }, fail).then(function(keypair) {
    assertEquals(e2e.openpgp.KeyringKeyProvider.PROVIDER_ID_,
        keypair['public'].providerId);
    assertArrayEquals([email], keypair['public'].uids);
    assertEquals(e2e.signer.Algorithm.ECDSA, keypair['public'].key.algorithm);
    assertEquals(e2e.cipher.Algorithm.ECDH,
        keypair['public'].subKeys[0].algorithm);
    assertTrue(keypair['public'].serialized.length > 0);
    assertEquals(e2e.openpgp.KeyringKeyProvider.PROVIDER_ID_,
        keypair['secret'].providerId);
    assertArrayEquals([email], keypair['secret'].uids);
    assertEquals(0, keypair['secret'].serialized.length);
    assertArrayEquals(keypair['public'].key.fingerprint,
        keypair['secret'].key.fingerprint);
    return provider.generateKeyPair(email, {invalid: 'options'});
  }).then(fail, function(e) {
    assertTrue(e instanceof e2e.openpgp.error.InvalidArgumentsError);
    asyncTestCase.continueTesting();
  });
}

function testImportKeys() {
  var kkp;
  asyncTestCase.waitForAsync('Waiting for async call.');
  var keys = e2e.openpgp.block.factory.parseAsciiMulti(
      document.getElementById('privKeyAscii').value);
  providerPromise.then(function(provider) {
    kkp = provider;
    asyncTestCase.waitForAsync('Waiting for key import.');
    return kkp.importKeys([0, 0, 0, 0]);
  }).then(fail, function(error) {
    assertTrue(error instanceof e2e.openpgp.error.ParseError);
    return kkp.importKeys(goog.array.concat(keys[0].serialize(),
        keys[1].serialize()));
  }).then(function(uids) {
    assertArrayEquals([UID], uids);
    assertEquals(1, kkp.keyring_.pubKeyRing_.getValues().length);
    assertEquals(1, kkp.keyring_.pubKeyRing_.getValues()[0].length);
    assertEquals(1, kkp.keyring_.privKeyRing_.getValues().length);
    assertEquals(1, kkp.keyring_.privKeyRing_.getValues()[0].length);
    assertArrayEquals(
        keys[0].keyPacket.fingerprint,
        kkp.keyring_.pubKeyRing_.getValues()[0][0].keyPacket.fingerprint);
    assertArrayEquals(
        keys[0].keyPacket.fingerprint,
        kkp.keyring_.privKeyRing_.getValues()[0][0].keyPacket.fingerprint);
    // Import the same key again.
    return kkp.importKeys(keys[0].serialize());
  }).then(function(uids) {
    assertEquals(0, uids.length);
    asyncTestCase.continueTesting();
  });
}

function testKeyRetrieval() {
  var kkp;
  asyncTestCase.waitForAsync('Waiting for async call.');
  var keys = e2e.openpgp.block.factory.parseAsciiMulti(
      document.getElementById('privKeyAscii').value);
  var encryptionSubkeyId = [234, 77, 177, 111, 60, 102, 104, 151];
  var signingKeyId = [143, 243, 246, 92, 96, 215, 152, 140];
  var fingerprint = [51, 195, 52, 75, 104, 70, 196, 105, 98, 15, 67, 238, 143,
    243, 246, 92, 96, 215, 152, 140];
  providerPromise.then(function(provider) {
    kkp = provider;
    asyncTestCase.waitForAsync('Waiting for key import.');
    return kkp.importKeys(goog.array.concat(keys[0].serialize(),
        keys[1].serialize()));
  }, fail).then(function(uids) {
    return kkp.getTrustedKeysByEmail(e2e.openpgp.KeyPurposeType.SIGNING, EMAIL);
  }, fail).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    var key = foundKeys[0];
    assertEquals(e2e.openpgp.KeyringKeyProvider.PROVIDER_ID_,
        key.providerId);
    assertTrue(key.key.secret);
    assertEquals(0, key.serialized.length);
    assertArrayEquals([UID], key.uids);
    // Search by UID will not find a key.
    return kkp.getTrustedKeysByEmail(e2e.openpgp.KeyPurposeType.SIGNING, UID);
  }, fail).then(function(foundKeys) {
    assertEquals(0, foundKeys.length);
    return kkp.getTrustedKeysByEmail(e2e.openpgp.KeyPurposeType.ENCRYPTION,
        EMAIL);
  }, fail).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    var key = foundKeys[0];
    assertEquals(e2e.openpgp.KeyringKeyProvider.PROVIDER_ID_,
        key.providerId);
    assertFalse(key.key.secret);
    assertArrayEquals(keys[1].serialize(), key.serialized);
    assertArrayEquals([UID], key.uids);
    return kkp.getTrustedKeysByEmail(e2e.openpgp.KeyPurposeType.ENCRYPTION,
        'another@example.com');
  }, fail).then(function(foundKeys) {
    assertEquals(0, foundKeys.length);
    // Ask for a secret key by Key ID.
    return kkp.getKeysByKeyId(e2e.openpgp.KeyPurposeType.DECRYPTION,
        encryptionSubkeyId);
  }, fail).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    var key = foundKeys[0];
    assertArrayEquals([], key.serialized);
    assertTrue(key.key.secret);
    // Ask for a public key by Key ID.
    return kkp.getKeysByKeyId(e2e.openpgp.KeyPurposeType.VERIFICATION,
        signingKeyId);
  }, fail).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    var key = foundKeys[0];
    assertArrayEquals(keys[1].serialize(), key.serialized);
    assertFalse(key.key.secret);
    return kkp.getKeysByKeyId(e2e.openpgp.KeyPurposeType.ENCRYPTION,
        signingKeyId);
  }, fail).then(fail, function(error) {
    assertTrue(error instanceof e2e.openpgp.error.InvalidArgumentsError);
    return kkp.getAllKeysByEmail(EMAIL);
  }).then(function(foundKeys) {
    assertEquals(2, foundKeys.length);
    // One public and one secret key, order irrelevant.
    assertEquals(1, foundKeys[0].key.secret ^ foundKeys[1].key.secret);
    return kkp.getAllKeys(e2e.openpgp.KeyRingType.SECRET);
  }, fail).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    assertTrue(foundKeys[0].key.secret);
    return kkp.getAllKeys(e2e.openpgp.KeyRingType.PUBLIC);
  }, fail).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    return kkp.getKeyByFingerprint(fingerprint);
  }, fail).then(function(key) {
    // Assert the public key has been returned.
    assertFalse(key.key.secret);
    return kkp.getKeyByFingerprint([0]);
  }, fail).then(function(key) {
    assertNull(key);
    asyncTestCase.continueTesting();
  }, fail);
}

function testKeyRemoval() {
  var kkp;
  asyncTestCase.waitForAsync('Waiting for async call.');
  var keys = e2e.openpgp.block.factory.parseAsciiMulti(
      document.getElementById('privKeyAscii').value);
  providerPromise.then(function(provider) {
    kkp = provider;
    asyncTestCase.waitForAsync('Waiting for key import.');
    return kkp.importKeys(goog.array.concat(keys[0].serialize(),
        keys[1].serialize()));
  }).then(function() {
    return kkp.getAllKeys(e2e.openpgp.KeyRingType.SECRET);
  }).then(function(secretKeys) {
    assertEquals(1, secretKeys.length);
    return kkp.removeKeys(secretKeys);
  }).then(function() {
    return kkp.getAllKeys(e2e.openpgp.KeyRingType.SECRET);
  }).then(function(keys) {
    assertEquals(0, keys.length);
    return kkp.getAllKeys(e2e.openpgp.KeyRingType.PUBLIC);
  }).then(function(keys) {
    assertEquals(1, keys.length);
    asyncTestCase.continueTesting();
  });
}

function testExport() {
  var kkp;
  asyncTestCase.waitForAsync('Waiting for async call.');
  var keys = e2e.openpgp.block.factory.parseAsciiMulti(
      document.getElementById('privKeyAscii').value);
  providerPromise.then(function(provider) {
    kkp = provider;
    return kkp.getKeyringExportOptions();
  }).then(function(options) {
    // Not yet implemented.
    assertNull(options);
    asyncTestCase.continueTesting();
  });
}

