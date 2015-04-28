/**
 * @license
 * Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Tests for the context API.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.api.ApiTest');

goog.require('e2e.ext.AppLauncher');
goog.require('e2e.ext.ExtensionLauncher');
goog.require('e2e.ext.actions.EncryptSign');
goog.require('e2e.ext.api.Api');
goog.require('e2e.ext.api.RequestThrottle');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.openpgp.ContextImpl');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.mockmatchers.ArgumentMatcher');
goog.require('goog.testing.mockmatchers.SaveArgument');
goog.require('goog.testing.storage.FakeMechanism');
goog.setTestOnly();

var api = null;
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
var constants = e2e.ext.constants;
var extensionLauncher = null;
var storage = null;
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
    'Charset: UTF-8\n' +
    '\n' +
    'xv8AAABSBFP3bHYTCCqGSM49AwEHAgMECt6MVqa43Ab248CosK/cy664pkL/9XvC\n' +
    '0O2K0O1Jh2qau7ll3Q9vssdObSwX0EaiMm4Dvegxr1z+SblWSFV4x83/AAAAH0Ry\n' +
    'ZXcgSGludHogPGFkaGludHpAZ29vZ2xlLmNvbT7C/wAAAGYEEBMIABj/AAAABYJT\n' +
    '92x2/wAAAAmQ8eznwfj7hkMAADA9AQCWE4jmpmA5XRN1tZduuz8QwtxGZOFurpAK\n' +
    '6RCzKDqS8wEAx9eBxXLhKB4xm9xwPdh0+W6rbsvf58FzKjlxrkUfuxTO/wAAAFYE\n' +
    'U/dsdhIIKoZIzj0DAQcCAwQ0M6kFa7VaVmt2PRdOUdZWrHp6CZZglTVQi1eyiXB/\n' +
    'nnUUbH+qrreWTD7W9RxRtr0IqAYssLG5ZoWsXa5jQC3DAwEIB8L/AAAAZgQYEwgA\n' +
    'GP8AAAAFglP3bHf/AAAACZDx7OfB+PuGQwAAkO4BALMuXsta+bCOvzSn7InOs7wA\n' +
    '+OmDN5cv1cR/SsN5+FkLAQCmmBa/Fe76gmDd0RjvpQW7pWK2zXj3il6HYQ2NsWlI\n' +
    'bQ==\n' +
    '=LlKd\n' +
    '-----END PGP PUBLIC KEY BLOCK-----';


function setUp() {
  storage = new goog.testing.storage.FakeMechanism();
  mockControl = new goog.testing.MockControl();
  e2e.ext.testingstubs.initStubs(stubs);

  extensionLauncher = new e2e.ext.ExtensionLauncher(
      new e2e.openpgp.ContextImpl(storage), storage);
  extensionLauncher.start();

  stubs.setPath('chrome.runtime.getBackgroundPage', function(callback) {
    callback({launcher: extensionLauncher});
  });

  api = new e2e.ext.api.Api();
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


function testExecuteAction() {
  var plaintext = 'plaintext message';
  var encrypted = 'encrypted message';

  var encryptCb = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  stubs.setPath('e2e.ext.actions.EncryptSign.prototype.execute',
      mockControl.createFunctionMock('encryptSign'));
  e2e.ext.actions.EncryptSign.prototype.execute(
      goog.testing.mockmatchers.ignoreArgument,
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertEquals(plaintext, arg.content);
        assertTrue(goog.isFunction(arg.passphraseCallback));
        return true;
      }),
      goog.testing.mockmatchers.ignoreArgument,
      encryptCb,
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));

  var callbackMock = mockControl.createFunctionMock();
  callbackMock(new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    return arg.content == encrypted;
  }));

  mockControl.$replayAll();

  api.executeAction_(callbackMock, {
    content: plaintext,
    recipients: ['irrelevant'],
    currentUser: 'irrelevant',
    action: constants.Actions.ENCRYPT_SIGN
  });

  encryptCb.arg(encrypted);

  mockControl.$verifyAll();
}


function testUnsupportedAction() {
  var callbackMock = mockControl.createFunctionMock();
  callbackMock(new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    return arg.error == 'errorUnsupportedAction';
  }));

  mockControl.$replayAll();

  api.executeAction_(callbackMock, {
    action: constants.Actions.LIST_KEYS
  });

  mockControl.$verifyAll();
}


function testThrottle() {
  stubs.set(api, 'requestThrottle_', new e2e.ext.api.RequestThrottle(0));

  var callbackMock = mockControl.createFunctionMock();
  callbackMock(new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    return arg.error == 'throttleErrorMsg';
  }));

  mockControl.$replayAll();
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
  api.executeAction_(callbackMock, {
    action: constants.Actions.DECRYPT_VERIFY
  });
  mockControl.$verifyAll();
}


function testWithAppLauncher() {
  extensionLauncher = null;
  stubs.setPath('chrome.app.runtime.onLaunched.addListener', goog.nullFunction);
  stubs.setPath('chrome.app.window.create', goog.nullFunction);
  appLauncher = new e2e.ext.AppLauncher(
      new e2e.openpgp.ContextImpl(storage), storage);
  appLauncher.start();

  stubs.setPath('chrome.runtime.getBackgroundPage', function(callback) {
    callback({launcher: appLauncher});
  });

  var plaintext = 'plaintext message';
  var encrypted = 'encrypted message';

  var encryptCb = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  stubs.setPath('e2e.ext.actions.EncryptSign.prototype.execute',
      mockControl.createFunctionMock('encryptSign'));
  e2e.ext.actions.EncryptSign.prototype.execute(
      goog.testing.mockmatchers.ignoreArgument,
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertEquals(plaintext, arg.content);
        assertTrue(goog.isFunction(arg.passphraseCallback));
        return true;
      }),
      goog.testing.mockmatchers.ignoreArgument,
      encryptCb,
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));

  var callbackMock = mockControl.createFunctionMock();
  callbackMock(new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    return arg.content == encrypted;
  }));

  mockControl.$replayAll();

  api.executeAction_(callbackMock, {
    content: plaintext,
    recipients: ['irrelevant'],
    currentUser: 'irrelevant',
    action: constants.Actions.ENCRYPT_SIGN
  });

  encryptCb.arg(encrypted);

  mockControl.$verifyAll();
}
