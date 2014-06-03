// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * @fileoverview Tests for the context API.
 */

goog.require('e2e.ext.api.Api');
goog.require('e2e.ext.api.RequestThrottle');
goog.require('e2e.ext.constants');
goog.require('e2e.openpgp.ContextImpl');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');

var api = null;
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
var constants = e2e.ext.constants;
var mockControl = null;
var mockmatchers = goog.testing.mockmatchers;
var stubs = new goog.testing.PropertyReplacer();

var PRIVATE_KEY_ASCII =
    '-----BEGIN PGP PRIVATE KEY BLOCK-----\n' +
    'Version: GnuPG v1.4.11 (GNU/Linux)\n' +
    '\n' +
    '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\n' +
    '1KwNtVw=\n' +
    '=wHzz\n' +
    '-----END PGP PRIVATE KEY BLOCK-----';


var PUBLIC_KEY_ASCII =
    '-----BEGIN PGP PUBLIC KEY BLOCK-----\n' +
    'Version: GnuPG v1.4.11 (GNU/Linux)\n' +
    '\n' +
    'mI0EUcy6DgEEAJb0T7gQlfKQWmR0dLUrueRMVy8UemcmxsdIH30/HqJvqO6xU0lK\n' +
    'NaFtaVxBdenAMpEooi1EcTi/bOKfz36FY/FARTiXv1LXuLzFJdPyjTYjh7tw+uOP\n' +
    'UlLJCTZikgrnM07txTUiVVEetOa+unyKn17EX0PlSpAbGZedyO0nGwXzABEBAAG0\n' +
    'BnRlc3QgNIi4BBMBAgAiBQJRzLoOAhsDBgsJCAcDAgYVCAIJCgsEFgIDAQIeAQIX\n' +
    'gAAKCRAG/5ysCS2oCL2SA/9EV9j3T/TM3VRD0NvNySHodcxCP1BF0zm/M84I/WHQ\n' +
    'sGKmHStfCqqEGruB8E6NHQMJwNp1TzcswuxE0wiTJiXKe3w3+GZhPHdW5zcgiMKK\n' +
    'YLn80Tk6fUMx1zVZtXlSBYCN5Op/axjQRyb+fGnXOhmboqQodYaWS7qhJWQJilH6\n' +
    'iriNBFHMug4BBADDTMshHtyYhLmWC7793FlOFl5tkcEfdFKJRm30k/9yky4cuz//\n' +
    'Xe4uXM72SaTI1Dfi6UIz5ZuFTxw3bnAXav+SV4Q4dZo0hb4jU8YaQfDL4TsRp7uO\n' +
    '6iqxd8nlsh9JnBKE6Fk/CW5FoMZZ3/yEm3pq924Uv2AZlO6dafgXecyqNQARAQAB\n' +
    'iJ8EGAECAAkFAlHMug4CGwwACgkQBv+crAktqAhENwQAkMY/nds36KgzwfMPpxtB\n' +
    'aq8GbrUqY1r8lBl6a/bi8qeOuEgQmIxM2OpVPtL04c1c1hLflPCi1SQUlCIh3DkE\n' +
    'GQIcy0/wxUZdCvZK0mF5nZSq6tez3CwqbeOA4nBOLwbxho50VqxBpR4qypYrB2ip\n' +
    'ykxlwiqudEe0sE2b1KwNtVw=\n' +
    '=nHBL\n' +
    '-----END PGP PUBLIC KEY BLOCK-----';


var PUBLIC_KEY_ASCII_2 =  // user ID of 'Drew Hintz <adhintz@google.com>'
    '-----BEGIN PGP PUBLIC KEY BLOCK-----\n' +
    '\n' +
    'xv8AAABSBFir2cUTCCqGSM49AwEHAgMERh6l2ToYyzlvyRSEqkZSAxrXy6TGs6TR\n' +
    'FmAHwW4wtkRtYFoe+DyUbU5qodcyjAFFmVnNxTukBDOQOjPJiOFZ6M3/AAAAH0Ry\n' +
    'ZXcgSGludHogPGFkaGludHpAZ29vZ2xlLmNvbT7G/wAAAFYEWKvaQxIIKoZIzj0D\n' +
    'AQcCAwQAFjV1E/cPxpjJ4WLTKFrr2sEwmLoktmSDClx3SspVAOZkCcSFMXN1lRwP\n' +
    'kkrZzHlaPd41OWMeypKXUX394Y2SAwEIB83/AAAAH0RyZXcgSGludHogPGFkaGlu\n' +
    'dHpAZ29vZ2xlLmNvbT4=\n' +
    '=Af1R\n' +
    '-----END PGP PUBLIC KEY BLOCK-----';


function setUp() {
  localStorage.clear();
  mockControl = new goog.testing.MockControl();

  stubs.setPath('chrome.i18n.getMessage', function(msg) {
    return msg;
  });
  stubs.setPath('chrome.runtime.onConnect.addListener', function() {});
  stubs.setPath('chrome.runtime.onConnect.removeListener', function() {});

  api = new e2e.ext.api.Api(new e2e.openpgp.ContextImpl(true));
  api.pgpCtx_.setKeyRingPassphrase('irrelevant');
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
  api = null;
}


function testInstall() {
  stubs.setPath(
      'chrome.runtime.onConnect.addListener', mockControl.createFunctionMock());
  chrome.runtime.onConnect.addListener(api.requestHandler_);

  mockControl.$replayAll();
  api.installApi();

  mockControl.$verifyAll();
}


function testRemove() {
  stubs.setPath('chrome.runtime.onConnect.removeListener',
      mockControl.createFunctionMock());
  chrome.runtime.onConnect.removeListener(api.requestHandler_);

  mockControl.$replayAll();
  api.removeApi();

  mockControl.$verifyAll();
}


function testGetEncryptKeys() {
  populatePgpKeys();
  var keys = api.getEncryptKeys_(['test 4']);
  assertEquals(1, keys.length);
  keys = api.getEncryptKeys_(['test 4', 'test 4', 'Does not exist']);
  assertEquals(2, keys.length);
}


function testEncryptAndDecrypt() {
  var plaintext = 'a secret message';

  populatePgpKeys();
  asyncTestCase.waitForAsync('Waiting for keys to be populated.');
  window.setTimeout(function() {
    asyncTestCase.continueTesting();

    api.executeAction_(function(encryptedResponse) {

      assertContains('-----BEGIN PGP MESSAGE-----', encryptedResponse.content);

      api.executeAction_(function(decryptedResponse) {
        assertEquals(plaintext, decryptedResponse.content);
      }, {
        content: encryptedResponse.content,
        currentUser: 'test 4',
        action: constants.Actions.DECRYPT_VERIFY
      });
    }, {
      content: plaintext,
      recipients: ['test 4'],
      currentUser: 'test 4',
      action: constants.Actions.ENCRYPT_SIGN
    });
  }, 500);
}


function testEncryptForSigner() {
  var plaintext = 'a secret message';

  populatePgpKeys();
  api.pgpCtx_.importKey(function() {}, PUBLIC_KEY_ASCII_2);
  asyncTestCase.waitForAsync('Waiting for keys to be populated.');
  window.setTimeout(function() {
    asyncTestCase.continueTesting();

    api.executeAction_(function(encryptedResponse) {
      assertContains('-----BEGIN PGP MESSAGE-----', encryptedResponse.content);

      api.executeAction_(function(decryptedResponse) {
        assertEquals(plaintext, decryptedResponse.content);
      }, {
        content: encryptedResponse.content,
        currentUser: 'test 4',
        action: constants.Actions.DECRYPT_VERIFY
      });
    }, {
      content: plaintext,
      // Specify a recipient so it's not sign-only:
      recipients: ['Drew Hintz <adhintz@google.com>'],
      currentUser: 'test 4',
      action: constants.Actions.ENCRYPT_SIGN
    });
  }, 500);
}


function testGetKeyDescription() {
  var plaintext = 'a secret message';

  api.executeAction_(function(response) {
    console.debug(response);
    assertContains('test 4', response.content);
  }, {
    content: PUBLIC_KEY_ASCII,
    currentUser: 'test 4',
    action: constants.Actions.GET_KEY_DESCRIPTION
  });
}


function testImportKeyAndGetDescription() {
  api.executeAction_({
    content: PUBLIC_KEY_ASCII,
    currentUser: '',
    action: constants.Actions.IMPORT_KEY
  }, {}, function() {
    var keys = api.getEncryptKeys_(['test 4']);
    assertEquals(1, keys.length);
  });
}


function testThrottle() {
  stubs.set(api, 'runWrappedProcessor_', mockControl.createFunctionMock());
  stubs.set(
      api, 'encryptRequestThrottle_', new e2e.ext.api.RequestThrottle(0));
  stubs.set(
      api, 'decryptRequestThrottle_', new e2e.ext.api.RequestThrottle(0));

  var callbackMock = mockControl.createFunctionMock();
  callbackMock(new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    return arg.error == 'throttleErrorMsg';
  })).$times(2);

  mockControl.$replayAll();

  api.executeAction_(callbackMock, {
    action: constants.Actions.ENCRYPT_SIGN
  });

  api.executeAction_(callbackMock, {
    action: constants.Actions.DECRYPT_VERIFY
  });

  mockControl.$verifyAll();
}


function testLockedKeyring() {
  stubs.setPath(
      'window.launcher.hasPassphrase', mockControl.createFunctionMock());
  window.launcher.hasPassphrase().$returns(false);

  var callbackMock = mockControl.createFunctionMock();
  callbackMock(new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    assertEquals('glassKeyringLockedError', arg.error);
    assertFalse(goog.isDef(arg.completedAction));
    assertFalse(goog.isDef(arg.content));
    return true;
  }));

  mockControl.$replayAll();
  api.executeAction_(callbackMock, {});
  mockControl.$verifyAll();
}


function populatePgpKeys() {
  var ctx = api.pgpCtx_;
  ctx.importKey(function(uid, callback) {
    callback('test');
  }, PRIVATE_KEY_ASCII);

  ctx.importKey(function() {}, PUBLIC_KEY_ASCII);
}
