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
 * @fileoverview Tests for the SimpleKeyManager.
 */

goog.provide('DummyKeyProvider');
/** @suppress {extraProvide} */
goog.provide('e2e.openpgp.managers.SimpleKeyManagerTest');

goog.require('e2e');
goog.require('e2e.openpgp.KeyPurposeType');
goog.require('e2e.openpgp.KeyRingType');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('e2e.openpgp.managers.SimpleKeyManager');
goog.require('e2e.openpgp.providers.SecretKeyProvider');
goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.setTestOnly();


var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
var keyManager;
var keyProvider;
var stubs = new goog.testing.PropertyReplacer();
var EMAIL = 'test@example.com';
var EMAIL_2 = 'test2@example.com';
var FINGERPRINT = [1, 2, 3, 4];
var FINGERPRINT_2 = [1, 2, 3, 5];
var KEY = {
  key: {
    fingerprint: FINGERPRINT
  },
  uids: [EMAIL]
};
var KEY_2 = {
  key: {
    fingerprint: FINGERPRINT_2
  },
  uids: [EMAIL_2]
};
var SECRET_KEY = {
  key: {
    fingerprint: FINGERPRINT,
  },
  secret: true,
  uids: [EMAIL]
};
var PROVIDER_ID = 'DUMMY';



/**
 * @constructor
 * @implements {e2e.openpgp.providers.SecretKeyProvider}
 */
var DummyKeyProvider = function() {
  this.publicKeys_ = [];
  this.secretKeys_ = [];
  this.state_ = {
    locked: true
  };
};
DummyKeyProvider.OPTIONS_ = {fake: 'options'};
DummyKeyProvider.KEYRING_EXPORT_ = {fake: 'keyring_export'};
DummyKeyProvider.PASSPHRASE_ = 's3cr3t';


DummyKeyProvider.prototype.getId = function() {
  return goog.Promise.resolve(PROVIDER_ID);
};
DummyKeyProvider.prototype.configure = function(config) {
  if (config.passphrase == DummyKeyProvider.PASSPHRASE_) {
    this.state_.locked = false;
  } else {
    this.state_.locked = true;
  }
  return this.getState();
};
DummyKeyProvider.prototype.getState = function() {
  return goog.Promise.resolve(this.state_);
};
DummyKeyProvider.prototype.getTrustedPublicKeysByEmail = function(purpose,
    email) {
  return goog.Promise.resolve(goog.array.filter(this.publicKeys_,
      function(key) {
        return goog.array.contains(key.uids, email);
      }));
};
DummyKeyProvider.prototype.getTrustedSecretKeysByEmail = function(purpose,
    email) {
  return goog.Promise.resolve(goog.array.filter(this.secretKeys_,
      function(key) {
        return goog.array.contains(key.uids, email);
      }));
};
DummyKeyProvider.prototype.getVerificationKeysByKeyId = function(id) {
  return this.getPublicKeyByFingerprint(id);
};
DummyKeyProvider.prototype.getDecryptionKeysByKeyId = function(id) {
  return goog.Promise.resolve(goog.array.filter(this.secretKeys_,
      function(key) {
        return goog.array.equals(key.key.fingerprint, id);
      }));
};
DummyKeyProvider.prototype.getAllPublicKeys = function(type) {
  return goog.Promise.resolve(this.publicKeys_);
};
DummyKeyProvider.prototype.getAllSecretKeys = function(type) {
  return goog.Promise.resolve(this.secretKeys_);
};
DummyKeyProvider.prototype.getAllPublicKeysByEmail = function(email) {
  return this.getTrustedPublicKeysByEmail('ignore', email);
};
DummyKeyProvider.prototype.getAllSecretKeysByEmail = function(email) {
  return this.getTrustedSecretKeysByEmail('ignore', email);
};
DummyKeyProvider.prototype.getPublicKeyByFingerprint = function(
    fingerprint) {
  return goog.Promise.resolve(goog.array.filter(this.publicKeys_,
      function(key) {
        return goog.array.equals(key.key.fingerprint, fingerprint);
      }));
};
DummyKeyProvider.prototype.getKeyringExportOptions = function(
    type) {
  return goog.Promise.resolve([DummyKeyProvider.OPTIONS_]);
};
DummyKeyProvider.prototype.exportKeyring = function(type, options) {
  return goog.Promise.resolve(DummyKeyProvider.KEYRING_EXPORT_);
};
DummyKeyProvider.prototype.setCredentials = function(credentials) {
  return goog.Promise.resolve(undefined);
};
DummyKeyProvider.prototype.trustKeys = function(keys, email,
    purpose, options) {
  return goog.Promise.resolve(keys);
};
DummyKeyProvider.prototype.removePublicKeyByFingerprint = function(fp) {
  goog.array.removeIf(this.publicKeys_, function(key) {
    return key.key.fingerprint == fp;
  }, this);
  return goog.Promise.resolve(undefined);
};
DummyKeyProvider.prototype.removeSecretKeyByFingerprint = function(fp) {
  goog.array.removeIf(this.secretKeys_, function(key) {
    return key.key.fingerprint == fp;
  }, this);
  return goog.Promise.resolve(undefined);
};
DummyKeyProvider.prototype.importKeys = function(keys, options) {
  goog.array.forEach(keys, function(key) {
    if (key.secret) {
      goog.array.insert(this.secretKeys_, key);
    } else {
      goog.array.insert(this.publicKeys_, key);
    }
  }, this);
  return goog.Promise.resolve(keys);
};
DummyKeyProvider.prototype.decrypt = function(key, keyId, algorithm,
    ciphertext) {
  return goog.Promise.resolve(ciphertext);
};
DummyKeyProvider.prototype.sign = function(key, keyId, algorithm, hashAlgorithm,
    data) {
  return goog.Promise.resolve(data);
};
DummyKeyProvider.prototype.generateKeyPair = function(userId, options) {
  var key = {
    key: {
      fingerprint: [5, 5, 5, 5],
    },
    uids: [userId]
  };
  return this.importKeys([key]).then(function() {
    return {
      'public': key,
      'secret': key
    }});
};
DummyKeyProvider.prototype.getKeyGenerateOptions = function() {
  return goog.Promise.resolve([DummyKeyProvider.OPTIONS_]);
};
DummyKeyProvider.prototype.unlockSecretKey = function(key) {
  return goog.Promise.resolve(key);
};


function setUp() {
  keyProvider = new DummyKeyProvider();
  keyManager = new e2e.openpgp.managers.SimpleKeyManager(keyProvider,
      PROVIDER_ID);
}

function tearDown() {
  stubs.reset();
}

function testInitializeAndConfigure() {
  var providerConfig =
      asyncTestCase.waitForAsync('Waiting for async call.');
  keyManager.getKeyProviderIds().then(function(ids) {
    assertArrayEquals([PROVIDER_ID], ids);
    var cfg = {};
    cfg[PROVIDER_ID] = {passphrase: 'incorrect'};
    return keyManager.initializeKeyProviders(cfg);
  }, fail).then(function(states) {
    assertNotNull(states[PROVIDER_ID]);
    assertTrue(states[PROVIDER_ID].locked);
    var newConfig = {passphrase: 's3cr3t'};
    return keyManager.reconfigureKeyProvider(PROVIDER_ID, newConfig);
  }, fail).then(function() {
    return keyManager.reconfigureKeyProvider('INVALID_PROVIDER', {});
  }, fail).then(fail, function(err) {
    assertTrue(err instanceof e2e.openpgp.error.InvalidArgumentsError);
    return keyManager.getKeyProvidersState(PROVIDER_ID);
  }, fail).then(function(states) {
    assertNotNull(states[PROVIDER_ID]);
    assertFalse(states[PROVIDER_ID].locked);
    asyncTestCase.continueTesting();
  }, fail);
}


function testDelayedConstructor() {
  asyncTestCase.waitForAsync('Waiting for async call.');
  var managerPromise = e2e.openpgp.managers.SimpleKeyManager.launch(
      goog.Promise.resolve(keyProvider));
  managerPromise.then(function(km) {
    assertEquals(keyProvider, km.keyProvider_);
    asyncTestCase.continueTesting();
  });
}

function testGetKeysByKeyId() {
  asyncTestCase.waitForAsync('Waiting for async call.');
  keyManager.getKeysByKeyId(e2e.openpgp.KeyPurposeType.ENCRYPTION)
      .then(fail, function(e) {
        assertTrue(e instanceof e2e.openpgp.error.InvalidArgumentsError);
        asyncTestCase.continueTesting();
      });
}

function testKeyManagement() {
  stubs.setPath('e2e.openpgp.block.factory.parseByteArrayTransferableKey',
      function(serialization) {
        var transferableKey = {
          toKeyObject: function(ignore, id) {
            serialization.providerId = id;
            return serialization;
          }
        };
        return transferableKey;
      });

  asyncTestCase.waitForAsync('Waiting for async');
  keyManager.importKeys([KEY, KEY_2, SECRET_KEY], goog.abstractMethod)
      .then(function(keys) {
        assertArrayEquals([KEY, KEY_2, SECRET_KEY], keys);
        return keyManager.getTrustedKeys(
            e2e.openpgp.KeyPurposeType.ENCRYPTION, EMAIL);
      }).then(function(keys) {
        return keyManager.getTrustedKeys(
            e2e.openpgp.KeyPurposeType.ENCRYPTION, 'notexisting@example.com');
      }).then(function(keys) {
        assertArrayEquals([], keys);
        return keyManager.getKeysByKeyId(
            e2e.openpgp.KeyPurposeType.VERIFICATION, FINGERPRINT);
      }).then(function(keys) {
        assertArrayEquals([KEY], keys);
        return keyManager.getKeysByKeyId(
            e2e.openpgp.KeyPurposeType.DECRYPTION, FINGERPRINT);
      }).then(function(keys) {
        assertArrayEquals([SECRET_KEY], keys);
        return keyManager.getAllKeys();
      }).then(function(keys) {
        assertArrayEquals([KEY, KEY_2], keys);
        return keyManager.getAllKeysByEmail(EMAIL_2);
      }).then(function(keys) {
        assertArrayEquals([KEY_2], keys);
        return keyManager.getPublicKeyByFingerprint(FINGERPRINT_2);
      }).then(function(keys) {
        return keyManager.trustKeys(KEY);
      }).then(function(key) {
        assertEquals(KEY, key);
        return keyManager.unlockSecretKey(KEY);
      }).then(function(key) {
        assertEquals(KEY, key);
        return keyManager.removeKeys([KEY]);
      }).then(function() {
        return keyManager.getAllKeys();
      }).then(function(keys) {
        assertArrayEquals([KEY_2], keys);
        return keyManager.getAllKeyGenerateOptions();
      }).then(function(options) {
        assertArrayEquals([DummyKeyProvider.OPTIONS_], options);
        return keyManager.generateKeyPair('newkey@example.com', options);
      }).then(function(keypair) {
        assertTrue('secret' in keypair);
        assertTrue('public' in keypair);
        assertArrayEquals(['newkey@example.com'], keypair['public'].uids);
        return keyManager.getKeyringExportOptions();
      }).then(function(options) {
        assertArrayEquals([DummyKeyProvider.OPTIONS_], options);
        return keyManager.exportKeyring(e2e.openpgp.KeyRingType.PUBLIC);
      }).then(function(exportData) {
        assertEquals(DummyKeyProvider.KEYRING_EXPORT_, exportData);
        asyncTestCase.continueTesting();
      });
}
