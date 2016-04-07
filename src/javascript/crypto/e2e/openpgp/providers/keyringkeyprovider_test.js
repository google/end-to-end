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
goog.provide('e2e.openpgp.providers.KeyringKeyProviderTest');

goog.require('e2e');
goog.require('e2e.algorithm.KeyLocations');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.openpgp.KeyProviderCipher');
goog.require('e2e.openpgp.KeyPurposeType');
goog.require('e2e.openpgp.KeyRing');
goog.require('e2e.openpgp.KeyRingType');
goog.require('e2e.openpgp.KeyringExportFormat');
goog.require('e2e.openpgp.LockableStorage');
goog.require('e2e.openpgp.block.LiteralMessage');
goog.require('e2e.openpgp.block.TransferablePublicKey');
goog.require('e2e.openpgp.block.TransferableSecretKey');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.error.MissingPassphraseError');
goog.require('e2e.openpgp.error.ParseError');
goog.require('e2e.openpgp.error.WrongPassphraseError');
goog.require('e2e.openpgp.packet.SurrogateSecretKey');
goog.require('e2e.openpgp.providers.KeyringKeyProvider');
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
  providerPromise = e2e.openpgp.providers.KeyringKeyProvider.launch(
      keyRingPromise);
}

function testConstructor() {
  asyncTestCase.waitForAsync('Waiting for async call.');
  providerPromise.then(function(kkp) {
    assertTrue(kkp.keyring_ instanceof e2e.openpgp.KeyRing);
    asyncTestCase.continueTesting();
  }, fail);
}

function testInvalidPassphrase() {
  lockableStorage.lock();
  keyRingPromise = e2e.openpgp.KeyRing.launch(lockableStorage);
  providerPromise = e2e.openpgp.providers.KeyringKeyProvider.launch(
      keyRingPromise);
  asyncTestCase.waitForAsync('Waiting for async call.');
  providerPromise.then(fail, function(error) {
    assertTrue(error instanceof e2e.openpgp.error.MissingPassphraseError);
    return lockableStorage.unlockWithPassphrase('test');
  }).then(function() {
    keyRingPromise = e2e.openpgp.KeyRing.launch(lockableStorage);
    providerPromise = e2e.openpgp.providers.KeyringKeyProvider.launch(
        keyRingPromise);
    return providerPromise;
  }, fail).then(function(kkp) {
    assertTrue(kkp instanceof e2e.openpgp.providers.KeyringKeyProvider);
    assertTrue(kkp.keyring_ instanceof e2e.openpgp.KeyRing);
    asyncTestCase.continueTesting();
  }, fail);
}

function testConfigure() {
  // Instead of using an already initialized keyring, use locked storage and
  // uninitialized keyring.
  lockableStorage.lock();
  var kkp = new e2e.openpgp.providers.KeyringKeyProvider(
      new e2e.openpgp.KeyRing(lockableStorage));

  asyncTestCase.waitForAsync('Waiting for async call.');

  kkp.getId().then(function(id) {
    assertEquals(e2e.openpgp.providers.KeyringKeyProvider.PROVIDER_ID, id);
    return kkp.getState();
  }).then(function(state) {
    assertEquals(true, state.encrypted);
    assertEquals(true, state.locked);
    return kkp.configure(null);
  }).then(fail, function(err) {
    assertTrue(err instanceof e2e.openpgp.error.MissingPassphraseError);
    return kkp.configure({'passphrase': 'invalid'});
  }).then(fail, function(err) {
    assertTrue(err instanceof e2e.openpgp.error.WrongPassphraseError);
    return kkp.configure({'passphrase': 'test'});
  }).then(function(state) {
    assertEquals(true, state.encrypted);
    assertEquals(false, state.locked);
    return kkp.configure({'newPassphrase': ''});
  }).then(function(state) {
    assertEquals(false, state.encrypted);
    assertEquals(false, state.locked);
    assertFalse(lockableStorage.isLocked());
    return kkp.getState();
  }).then(function(state) {
    return kkp.configure({'newPassphrase': 'new-pw'});
  }).then(function(state) {
    assertEquals(true, state.encrypted);
    assertEquals(false, state.locked);
    // Try to change the passphrase on a locked storage.
    lockableStorage.lock();
    return kkp.getState();
  }).then(function(state) {
    assertEquals(true, state.locked);
    return kkp.configure({'newPassphrase': 'anything'});
  }).then(fail, function(err) {
    assertTrue(err instanceof Error);
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
    assertEquals(2, kgo.length);
    assertContains(e2e.algorithm.KeyLocations.JAVASCRIPT, kgo[0].keyLocation);
    assertContains(e2e.signer.Algorithm.ECDSA, kgo[0].keyAlgo);
    assertContains(e2e.cipher.Algorithm.ECDH, kgo[0].subkeyAlgo);

    assertContains(e2e.algorithm.KeyLocations.WEB_CRYPTO, kgo[1].keyLocation);
    assertContains(e2e.signer.Algorithm.ECDSA, kgo[1].keyAlgo);
    assertContains(e2e.cipher.Algorithm.ECDH, kgo[1].subkeyAlgo);
    asyncTestCase.waitForAsync('Waiting for key generation');
    return provider.generateKeyPair(email, chooseDefault(kgo[0]));
  }, fail).then(function(keypair) {
    assertEquals(e2e.openpgp.providers.KeyringKeyProvider.PROVIDER_ID,
        keypair['public'].providerId);
    assertArrayEquals([email], keypair['public'].uids);
    assertEquals(e2e.signer.Algorithm.ECDSA, keypair['public'].key.algorithm);
    assertEquals(e2e.cipher.Algorithm.ECDH,
        keypair['public'].subKeys[0].algorithm);
    assertTrue(keypair['public'].serialized.length > 0);
    assertEquals(e2e.openpgp.providers.KeyringKeyProvider.PROVIDER_ID,
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
  }).then(function(importedKeys) {
    assertEquals(2, importedKeys.length);
    assertArrayEquals(keys[0].keyPacket.fingerprint,
        importedKeys[0].key.fingerprint);
    // One public and one secret key.
    assertEquals(1, importedKeys[0].key.secret ^ importedKeys[1].key.secret);
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
  }).then(function(importedKeys) {
    assertEquals(0, importedKeys.length);
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

  var PUBLIC_KEY_SERIALIZE = keys[1].serialize();

  providerPromise.then(function(provider) {
    kkp = provider;
    asyncTestCase.waitForAsync('Waiting for key import.');
    return kkp.importKeys(goog.array.concat(keys[0].serialize(),
        PUBLIC_KEY_SERIALIZE));
  }, fail).then(function(uids) {
    return kkp.getTrustedSecretKeysByEmail(
        e2e.openpgp.KeyPurposeType.SIGNING,
        EMAIL);
  }, fail).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    var key = foundKeys[0];
    assertEquals(e2e.openpgp.providers.KeyringKeyProvider.PROVIDER_ID,
        key.providerId);
    assertTrue(key.key.secret);
    assertEquals(0, key.serialized.length);
    assertArrayEquals([UID], key.uids);
    // Search by UID will not find a key.
    return kkp.getTrustedSecretKeysByEmail(
        e2e.openpgp.KeyPurposeType.SIGNING,
        UID);
  }, fail).then(function(foundKeys) {
    assertEquals(0, foundKeys.length);
    return kkp.getTrustedPublicKeysByEmail(
        e2e.openpgp.KeyPurposeType.ENCRYPTION,
        EMAIL);
  }, fail).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    var key = foundKeys[0];
    assertArrayEquals(PUBLIC_KEY_SERIALIZE, key);
    return kkp.getTrustedPublicKeysByEmail(
        e2e.openpgp.KeyPurposeType.ENCRYPTION,
        'another@example.com');
  }, fail).then(function(foundKeys) {
    assertEquals(0, foundKeys.length);
    // Ask for a secret key by Key ID.
    return kkp.getDecryptionKeysByKeyId(encryptionSubkeyId);
  }, fail).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    var key = foundKeys[0];
    assertArrayEquals([], key.serialized);
    assertTrue(key.key.secret);
    // Ask for a public key by Key ID.
    return kkp.getVerificationKeysByKeyId(signingKeyId);
  }, fail).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    var key = foundKeys[0];
    assertArrayEquals(PUBLIC_KEY_SERIALIZE, key);
    return kkp.getAllPublicKeysByEmail(EMAIL);
  }).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    assertArrayEquals(PUBLIC_KEY_SERIALIZE, foundKeys[0]);
    return kkp.getAllSecretKeysByEmail(EMAIL);
  }).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    // One public and one secret key, order irrelevant.
    assertEquals(true, foundKeys[0].key.secret);
    assertArrayEquals([UID], foundKeys[0].uids);
    return kkp.getAllSecretKeys();
  }, fail).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    assertTrue(foundKeys[0].key.secret);
    return kkp.getAllPublicKeys();
  }, fail).then(function(foundKeys) {
    assertEquals(1, foundKeys.length);
    assertArrayEquals(PUBLIC_KEY_SERIALIZE, foundKeys[0]);
    return kkp.getPublicKeyByFingerprint(fingerprint);
  }, fail).then(function(key) {
    // Assert the public key has been returned.
    assertArrayEquals(PUBLIC_KEY_SERIALIZE, key);
    return kkp.getPublicKeyByFingerprint([0]);
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
    return kkp.getAllSecretKeys();
  }).then(function(secretKeys) {
    assertEquals(1, secretKeys.length);
    return kkp.removeSecretKeyByFingerprint(secretKeys[0].key.fingerprint);
  }).then(function() {
    return kkp.getAllSecretKeys();
  }).then(function(keys) {
    assertEquals(0, keys.length);
    return kkp.getAllPublicKeys();
  }).then(function(keys) {
    assertEquals(1, keys.length);
    asyncTestCase.continueTesting();
  });
}

function testExportBackupCode() {
  var kkp;
  var email = 'export.test@example.com';

  function chooseDefault(options) {
    return goog.object.map(options, function(value) {
      return value[0];
    });
  }

  asyncTestCase.waitForAsync('Waiting for async call.');
  var keys = e2e.openpgp.block.factory.parseAsciiMulti(
      document.getElementById('privKeyAscii').value);
  providerPromise.then(function(provider) {
    kkp = provider;
    return kkp.importKeys(goog.array.concat(keys[0].serialize(),
        keys[1].serialize()));
  }).then(function() {
    return kkp.getKeyringExportOptions(e2e.openpgp.KeyRingType.SECRET);
  }).then(function(options) {
    var backupCodeOption = goog.array.find(options, function(option) {
      return option.format == 'backup-code';
    });
    assertNull(backupCodeOption); // No keys generated yet.
    // Generate the key
    return kkp.getKeyGenerateOptions();
  }).then(function(kgo) {
    asyncTestCase.waitForAsync('Waiting for key generation');
    return kkp.generateKeyPair(email, chooseDefault(kgo[0]));
  }).then(function() {
    return kkp.getKeyringExportOptions(e2e.openpgp.KeyRingType.SECRET);
  }).then(function(options) {
    var backupCodeOption = goog.array.find(options, function(option) {
      return option.format == 'backup-code';
    });
    assertNotNull(backupCodeOption); // Backup code available.
    return kkp.exportKeyring(e2e.openpgp.KeyRingType.SECRET, backupCodeOption);
  }).then(function(keyringExport) {
    assertEquals(2, keyringExport.count);
    assertNotNull(keyringExport.seed);
    asyncTestCase.continueTesting();
  }, fail);
}

function testExportOpenpgpPackets() {
  var kkp;
  var TEST_PASSPHRASE = 'TEST';

  function chooseDefault(options) {
    return goog.object.map(options, function(value) {
      return goog.isArray(value) ? value[0] : value;
    });
  }

  asyncTestCase.waitForAsync('Waiting for async call.');
  var keys = e2e.openpgp.block.factory.parseAsciiMulti(
      document.getElementById('privKeyAscii').value);
  providerPromise.then(function(provider) {
    kkp = provider;
    return kkp.importKeys(goog.array.concat(keys[0].serialize(),
        keys[1].serialize()));
  }).then(function() {
    return kkp.getKeyringExportOptions(e2e.openpgp.KeyRingType.SECRET);
  }).then(function(options) {
    var pgpPacketsOption = goog.array.find(options, function(option) {
      return option.format ==
          e2e.openpgp.KeyringExportFormat.OPENPGP_PACKETS_ASCII;
    });
    assertNotNull(pgpPacketsOption);
    pgpPacketsOption.passphrase = TEST_PASSPHRASE;
    asyncTestCase.waitForAsync('Waiting for async call.');
    return kkp.exportKeyring(e2e.openpgp.KeyRingType.SECRET, pgpPacketsOption);
  }).then(function(keyringExport) {
    var blocks = e2e.openpgp.block.factory.parseAsciiAllTransferableKeys(
        keyringExport);
    assertContains('BEGIN PGP PRIVATE KEY BLOCK', keyringExport);
    assertEquals(2, blocks.length);
    assertTrue(blocks[0] instanceof e2e.openpgp.block.TransferableSecretKey);
    assertTrue(blocks[1] instanceof e2e.openpgp.block.TransferablePublicKey);
    // Key is encrypted.
    assertFalse(blocks[0].unlock());
    assertTrue(blocks[0].unlock(e2e.stringToByteArray(TEST_PASSPHRASE)));
    return kkp.getKeyringExportOptions(e2e.openpgp.KeyRingType.SECRET);
  }).then(function(options) {
    var pgpPacketsOption = goog.array.find(options, function(option) {
      return option.format ==
          e2e.openpgp.KeyringExportFormat.OPENPGP_PACKETS_ASCII;
    });
    assertNotNull(pgpPacketsOption);
    pgpPacketsOption.passphrase = ''; // No passphrase
    asyncTestCase.waitForAsync('Waiting for async call.');
    return kkp.exportKeyring(e2e.openpgp.KeyRingType.SECRET, pgpPacketsOption);
  }).then(function(keyringExport) {
    var blocks = e2e.openpgp.block.factory.parseAsciiAllTransferableKeys(
        keyringExport);
    assertContains('BEGIN PGP PRIVATE KEY BLOCK', keyringExport);
    assertEquals(2, blocks.length);
    assertTrue(blocks[0] instanceof e2e.openpgp.block.TransferableSecretKey);
    assertTrue(blocks[1] instanceof e2e.openpgp.block.TransferablePublicKey);
    // Key is not encrypted.
    assertTrue(blocks[0].unlock());
    return kkp.getKeyringExportOptions(e2e.openpgp.KeyRingType.PUBLIC);
  }).then(function(options) {
    var pgpPacketsOption = goog.array.find(options, function(option) {
      return option.format ==
          e2e.openpgp.KeyringExportFormat.OPENPGP_PACKETS_BINARY;
    });
    assertNotNull(pgpPacketsOption); // Backup code available.
    assertUndefined(pgpPacketsOption.passphrase);
    asyncTestCase.waitForAsync('Waiting for async call.');
    return kkp.exportKeyring(e2e.openpgp.KeyRingType.PUBLIC, pgpPacketsOption);
  }).then(function(keyringExport) {
    var blocks = e2e.openpgp.block.factory.parseByteArrayAllTransferableKeys(
        keyringExport);
    assertEquals(1, blocks.length);
    assertTrue(blocks[0] instanceof e2e.openpgp.block.TransferablePublicKey);
    asyncTestCase.continueTesting();
  }, fail);
}

function testDecrypt() {
  var kkp;
  var keys = e2e.openpgp.block.factory.parseAsciiMulti(
      document.getElementById('privKeyAscii').value);
  var message = e2e.openpgp.block.factory.parseAscii(
      document.getElementById('encryptedSignedMessage').value);
  asyncTestCase.waitForAsync('Waiting for provider initialization.');
  providerPromise.then(function(provider) {
    kkp = provider;
    asyncTestCase.waitForAsync('Waiting for key import.');
    return kkp.importKeys(goog.array.concat(keys[0].serialize(),
        keys[1].serialize()));
  }).then(function() {
    asyncTestCase.waitForAsync('Waiting for key retrieval.');
    return kkp.getTrustedSecretKeysByEmail(
        e2e.openpgp.KeyPurposeType.DECRYPTION, EMAIL);
  }).then(function(keyObjects) {
    assertEquals(1, keyObjects.length);
    assertEquals('ECDH', keyObjects[0].decryptionAlgorithm);
    // Assert key ids are present in keyObjects.
    var cipherCallback = function(keyId, algorithm) {
      return e2e.async.Result.toResult(new e2e.openpgp.KeyProviderCipher(
          algorithm, undefined,
          goog.bind(kkp.decrypt, kkp, keyObjects[0], keyId)));
    };
    asyncTestCase.waitForAsync('Waiting for decryption.');
    return message.decrypt(cipherCallback);
  }).then(function(res) {
    assertEquals('test', e2e.byteArrayToString(res.getMessage().getData()));
    asyncTestCase.continueTesting();
  }, fail);
}

function testSign() {
  var kkp;
  var keyId;
  var keys = e2e.openpgp.block.factory.parseAsciiMulti(
      document.getElementById('privKeyAscii').value);
  var privateKey = keys[0];
  var publicKey = keys[1];
  var PLAINTEXT = 'TEST';
  var message = e2e.openpgp.block.LiteralMessage.construct(PLAINTEXT);
  asyncTestCase.waitForAsync('Waiting for provider initialization.');
  providerPromise.then(function(provider) {
    kkp = provider;
    asyncTestCase.waitForAsync('Waiting for key import.');
    return kkp.importKeys(goog.array.concat(privateKey.serialize(),
        publicKey.serialize()));
  }).then(function() {
    asyncTestCase.waitForAsync('Waiting for key retrieval.');
    return kkp.getTrustedSecretKeysByEmail(e2e.openpgp.KeyPurposeType.SIGNING,
        EMAIL);
  }).then(function(keyObjects) {
    assertEquals(1, keyObjects.length);
    var keyObject = keyObjects[0];
    var signingKey = e2e.openpgp.packet.SurrogateSecretKey.constructSigningKey(
        keyObject, goog.bind(kkp.sign, kkp));
    asyncTestCase.waitForAsync('Waiting for signing.');
    return message.signWithOnePass(signingKey).then(function() {
      return message;
    });
  }).then(function(signedMessage) {
    assertArrayEquals(publicKey.keyPacket.keyId,
        signedMessage.signatures[0].getSignerKeyId());
    return signedMessage.verify([publicKey]);
  }).then(function(verifyResult) {
    assertEquals(1, verifyResult.success.length);
    assertEquals(0, verifyResult.failure.length);
    asyncTestCase.continueTesting();
  }, fail);
}
