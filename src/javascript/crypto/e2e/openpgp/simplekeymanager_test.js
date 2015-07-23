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
goog.provide('e2e.openpgp.SimpleKeyManagerTest');

goog.require('e2e');
goog.require('e2e.openpgp.KeyPurposeType');
goog.require('e2e.openpgp.KeyRingType');
goog.require('e2e.openpgp.SecretKeyProvider');
goog.require('e2e.openpgp.SimpleKeyManager');
goog.require('e2e.openpgp.error.InvalidArgumentsError');
goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.setTestOnly();


var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
var keyManager;
var keyProvider;
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



/**
 * @constructor
 * @implements {e2e.openpgp.SecretKeyProvider}
 */
var DummyKeyProvider = function() {
  this.keys_ = [];
};
DummyKeyProvider.OPTIONS_ = {fake: 'options'};
DummyKeyProvider.KEYRING_EXPORT_ = {fake: 'keyring_export'};

DummyKeyProvider.prototype.getTrustedKeysByEmail = function(purpose,
    email) {
  return goog.Promise.resolve(goog.array.filter(this.keys_, function(key) {
    return goog.array.contains(key.uids, email);
  }));
};
DummyKeyProvider.prototype.getKeysByKeyId = function(purpose, id) {
  return this.getKeyByFingerprint(id);
};
DummyKeyProvider.prototype.getAllKeys = function(type) {
  return goog.Promise.resolve(this.keys_);
};
DummyKeyProvider.prototype.getAllKeysByEmail = function(email) {
  return this.getTrustedKeysByEmail('ignore', email);
};
DummyKeyProvider.prototype.getKeyByFingerprint = function(
    fingerprint) {
  return goog.Promise.resolve(goog.array.filter(this.keys_, function(key) {
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
DummyKeyProvider.prototype.removeKeys = function(keys) {
  goog.array.forEach(keys, function(key) {
    goog.array.remove(this.keys_, key);
  }, this);
  return goog.Promise.resolve(undefined);
};
DummyKeyProvider.prototype.importKeys = function(keys, options) {
  var uids = [];
  goog.array.forEach(keys, function(key) {
    goog.array.insert(this.keys_, key);
    uids = goog.array.concat(uids, key.uids);
  }, this);
  return goog.Promise.resolve(uids);
};
DummyKeyProvider.prototype.decrypt = goog.nullFunction;
DummyKeyProvider.prototype.sign = goog.nullFunction;
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
DummyKeyProvider.prototype.unlockKey = function(key) {
  return goog.Promise.resolve(key);
};


function setUp() {
  keyProvider = new DummyKeyProvider();
  keyManager = new e2e.openpgp.SimpleKeyManager(keyProvider);
}


function testDelayedConstructor() {
  asyncTestCase.waitForAsync('Waiting for async call.');
  var managerPromise = e2e.openpgp.SimpleKeyManager.launch(
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
  asyncTestCase.waitForAsync('Waiting for async');
  keyManager.importKeys([KEY, KEY_2], goog.abstractMethod)
      .then(function(uids) {
        assertArrayEquals([EMAIL, EMAIL_2], uids);
        return keyManager.getTrustedKeys(
            e2e.openpgp.KeyPurposeType.ENCRYPTION, EMAIL);
      }).then(function(keys) {
        return keyManager.getTrustedKeys(
            e2e.openpgp.KeyPurposeType.ENCRYPTION, 'notexisting@example.com');
      }).then(function(keys) {
        assertArrayEquals([], keys);
        return keyManager.getKeysByKeyId(e2e.openpgp.KeyPurposeType.ENCRYPTION,
            FINGERPRINT);
      }).then(fail, function(e) {
        assertTrue(e instanceof e2e.openpgp.error.InvalidArgumentsError);
        return keyManager.getKeysByKeyId(
            e2e.openpgp.KeyPurposeType.VERIFICATION,
            FINGERPRINT);
      }).then(function(keys) {
        assertArrayEquals([KEY], keys);
        return keyManager.getAllKeys();
      }).then(function(keys) {
        assertArrayEquals([KEY, KEY_2], keys);
        return keyManager.getAllKeysByEmail(EMAIL_2);
      }).then(function(keys) {
        assertArrayEquals([KEY_2], keys);
        return keyManager.getKeyByFingerprint(FINGERPRINT_2);
      }).then(function(keys) {
        return keyManager.trustKeys(KEY);
      }).then(function(key) {
        assertEquals(KEY, key);
        return keyManager.unlockKey(KEY);
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
