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
 * @fileoverview Tests for the HkpKeyProvider.
 */


/** @suppress {extraProvide} */
goog.setTestOnly('e2e.openpgp.providers.HkpKeyProviderTest');
goog.provide('e2e.openpgp.providers.HkpKeyProviderTest');

/** @suppress {extraRequire} */
goog.require('e2e.cipher.all');
goog.require('e2e.openpgp.asciiArmor');
goog.require('e2e.openpgp.providers.HkpKeyProvider');
/** @suppress {extraRequire} */
goog.require('e2e.signer.all');
goog.require('goog.array');
goog.require('goog.crypt');
goog.require('goog.net.XhrIo');
goog.require('goog.string');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.net.XhrIo');


var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
var stubs = new goog.testing.PropertyReplacer();
var SAMPLE_FINGERPRINT = '5e31485bd84e3ca6e1f6e604731e6b9f00540fc3';
var SAMPLE_KEYID = '708cd053a11a9b3b';
var SAMPLE_EMAIL = 'foo@example.com';
var SAMPLE_ROOT = 'https://127.0.0.1';
var SAMPLE_UID = 'Android Security <security@android.com>';
var ASCII_KEY = document.getElementById('samplePublicKey').value;
var BIN_KEY_LENGTH = 1675;
var provider = new e2e.openpgp.providers.HkpKeyProvider(SAMPLE_ROOT);

function setUp() {
  stubs.replace(goog.net.XhrIo, 'send', goog.testing.net.XhrIo.send);
}

function tearDown() {
  stubs.reset();
  goog.array.clear(goog.testing.net.XhrIo.getSendInstances());
}

function testGetByFingerprint() {
  var fp = goog.crypt.hexToByteArray(SAMPLE_FINGERPRINT);
  var promise = provider.getPublicKeyByFingerprint(fp);
  var xhrios = goog.testing.net.XhrIo.getSendInstances();
  assertEquals(1, xhrios.length);
  assertEquals('GET', xhrios[0].getLastMethod());
  assertEquals('https://127.0.0.1/pks/lookup?search=0x' +
      SAMPLE_FINGERPRINT + '&op=get&options=mr', xhrios[0].getLastUri());
  asyncTestCase.waitForAsync('Waiting for response to be processed.');
  xhrios[0].simulateResponse(
      200, document.getElementById('samplePublicKey').value);
  promise.then(function(bytes) {
    assertEquals(BIN_KEY_LENGTH, bytes.length);
    asyncTestCase.continueTesting();
  }, fail);
}

function testGetByFingerprintMissing() {
  var fp = goog.crypt.hexToByteArray(SAMPLE_FINGERPRINT);
  var promise = provider.getPublicKeyByFingerprint(fp);
  var xhrios = goog.testing.net.XhrIo.getSendInstances();
  assertEquals(1, xhrios.length);
  assertEquals('GET', xhrios[0].getLastMethod());
  assertEquals('https://127.0.0.1/pks/lookup?search=0x' +
      SAMPLE_FINGERPRINT + '&op=get&options=mr', xhrios[0].getLastUri());
  asyncTestCase.waitForAsync('Waiting for response to be processed.');
  xhrios[0].simulateResponse(404, 'No such key');
  promise.then(function(bytes) {
    assertNull(bytes);
    asyncTestCase.continueTesting();
  }, fail);
}

function testGetByKeyId() {
  var keyid = goog.crypt.hexToByteArray(SAMPLE_KEYID);
  var promise = provider.getVerificationKeysByKeyId(keyid);
  var xhrios = goog.testing.net.XhrIo.getSendInstances();
  assertEquals(1, xhrios.length);
  assertEquals('GET', xhrios[0].getLastMethod());
  assertEquals('https://127.0.0.1/pks/lookup?search=0x' +
      SAMPLE_KEYID + '&op=get&options=mr', xhrios[0].getLastUri());
  asyncTestCase.waitForAsync('Waiting for response to be processed.');
  xhrios[0].simulateResponse(
      200, document.getElementById('samplePublicKey').value);
  promise.then(function(keyrings) {
    assertEquals(keyrings.length, 1);
    assertEquals(BIN_KEY_LENGTH, keyrings[0].length);
    asyncTestCase.continueTesting();
  }, fail);
}

function testGetByKeyIdMissing() {
  var keyidHex = 'abcdabcdabcdabcd';
  var keyid = goog.crypt.hexToByteArray(keyidHex);
  var promise = provider.getVerificationKeysByKeyId(keyid);
  var xhrios = goog.testing.net.XhrIo.getSendInstances();
  assertEquals(1, xhrios.length);
  assertEquals('GET', xhrios[0].getLastMethod());
  assertEquals('https://127.0.0.1/pks/lookup?search=0x' +
      keyidHex + '&op=get&options=mr', xhrios[0].getLastUri());
  asyncTestCase.waitForAsync('Waiting for response to be processed.');
  xhrios[0].simulateResponse(404, 'No such key');
  promise.then(function(keyrings) {
    assertEquals(0, keyrings.length);
    asyncTestCase.continueTesting();
  }, fail);
}

function testGetByEmail() {
  var promise = provider.getAllPublicKeysByEmail(SAMPLE_EMAIL);
  var xhrios = goog.testing.net.XhrIo.getSendInstances();
  assertEquals(1, xhrios.length);
  assertEquals('GET', xhrios[0].getLastMethod());
  assertEquals('https://127.0.0.1/pks/lookup?search=' +
      goog.string.urlEncode(SAMPLE_EMAIL) + '&op=get&options=mr',
               xhrios[0].getLastUri());
  asyncTestCase.waitForAsync('Waiting for response to be processed.');
  xhrios[0].simulateResponse(
      200, document.getElementById('samplePublicKey').value);
  promise.then(function(keyrings) {
    assertEquals(1, keyrings.length);
    assertEquals(BIN_KEY_LENGTH, keyrings[0].length);
    asyncTestCase.continueTesting();
  }, fail);
}

function testGetByEmailMissing() {
  var promise = provider.getAllPublicKeysByEmail(SAMPLE_EMAIL);
  var xhrios = goog.testing.net.XhrIo.getSendInstances();
  assertEquals(1, xhrios.length);
  assertEquals('GET', xhrios[0].getLastMethod());
  assertEquals('https://127.0.0.1/pks/lookup?search=' +
      goog.string.urlEncode(SAMPLE_EMAIL) + '&op=get&options=mr',
               xhrios[0].getLastUri());
  asyncTestCase.waitForAsync('Waiting for response to be processed.');
  xhrios[0].simulateResponse(404, 'No such key');
  promise.then(function(keyrings) {
    assertEquals(0, keyrings.length);
    asyncTestCase.continueTesting();
  }, fail);
}

function testImportKey() {
  var promise = provider.importKeys(e2e.openpgp.asciiArmor.parse(
      document.getElementById('samplePublicKey').value).data, function(s) {
        throw new Error('Should not require passwords for public keys');
      });

  // TODO(evn): Figure out how to do this without a polling loop
  var handle = setInterval(function() {
    var xhrios = goog.testing.net.XhrIo.getSendInstances();
    if (xhrios.length > 0) {
      clearInterval(handle);
      assertEquals(1, xhrios.length);
      assertEquals('POST', xhrios[0].getLastMethod());
      assertEquals('https://127.0.0.1/pks/add', xhrios[0].getLastUri());
      xhrios[0].simulateResponse(200, 'ok');
    }
  }, 50);

  asyncTestCase.waitForAsync('Waiting for response to be processed.');
  promise.then(function(keys) {
    assertEquals(1, keys.length);
    var key = keys[0];
    assertEquals(e2e.openpgp.providers.HkpKeyProvider.PROVIDER_ID,
                 key.providerId);
    assertEquals(1, key.subKeys.length);
    assertEquals(1, key.uids.length);
    assertEquals(SAMPLE_UID, key.uids[0]);
    asyncTestCase.continueTesting();
  }, fail);
}

function testGetState() {
  asyncTestCase.waitForAsync('Waiting for response to be processed.');
  provider.getState().then(function(state) {
    assertEquals(SAMPLE_ROOT,
                 state[e2e.openpgp.providers.HkpKeyProvider.HKP_ROOT_KEY]);
    asyncTestCase.continueTesting();
  }, fail);
}

function testId() {
  asyncTestCase.waitForAsync('Waiting for response to be processed.');
  provider.getId().then(function(id) {
    assertEquals(e2e.openpgp.providers.HkpKeyProvider.PROVIDER_ID, id);
    asyncTestCase.continueTesting();
  }, fail);
}
