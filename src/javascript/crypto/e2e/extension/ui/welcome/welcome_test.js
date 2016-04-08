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
 * @fileoverview Tests for the welcome page.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.WelcomeTest');

goog.require('e2e.async.Result');
goog.require('e2e.ext.ExtensionLauncher');
goog.require('e2e.ext.Preferences');
goog.require('e2e.ext.actions.GetKeyDescription');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.ui.Welcome');
goog.require('e2e.ext.ui.dialogs.Generic');
goog.require('e2e.ext.utils');
goog.require('e2e.openpgp.ContextImpl');
goog.require('goog.dom');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.mockmatchers.SaveArgument');
goog.require('goog.testing.storage.FakeMechanism');
goog.setTestOnly();

var constants = e2e.ext.constants;
var launcher = null;
var mockControl = null;
var page = null;
var preferences = null;
var fakeStorage = null;
var stubs = new goog.testing.PropertyReplacer();
var testCase = goog.testing.AsyncTestCase.createAndInstall();


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


function setUp() {
  mockControl = new goog.testing.MockControl();
  e2e.ext.testingstubs.initStubs(stubs);

  fakeStorage = new goog.testing.storage.FakeMechanism();

  preferences = new e2e.ext.Preferences(fakeStorage);
  preferences.setWelcomePageEnabled(false);

  launcher = new e2e.ext.ExtensionLauncher(
      new e2e.openpgp.ContextImpl(new goog.testing.storage.FakeMechanism()),
      fakeStorage);
  stubs.setPath('chrome.runtime.getBackgroundPage', function(callback) {
    callback({launcher: launcher});
  });
  launcher.start();
  e2e.ext.ui.Welcome.IMAGE_PATH_ = '';
  page = new e2e.ext.ui.Welcome();
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
  goog.dispose(page);
}


function testRenderEmptyKeyring() {
  page.decorate(document.documentElement);

  assertContains('Failed to render welcome page',
      'welcomeHeader', document.body.textContent);
  assertNotNull(goog.dom.getElement(constants.ElementId.WELCOME_MENU_NOVICE));
  assertNotNull(goog.dom.getElement(constants.ElementId.WELCOME_MENU_ADVANCED));
}


function testRenderNonEmptyKeyring() {
  populatePgpKeys();
  page.decorate(document.documentElement);

  testCase.waitForAsync('waiting for page to render');
  window.setTimeout(function() {
    assertContains('Failed to render welcome page',
        'welcomeHeader', document.body.textContent);
    assertNull(goog.dom.getElement(constants.ElementId.WELCOME_MENU_NOVICE));
    assertNull(goog.dom.getElement(constants.ElementId.WELCOME_MENU_ADVANCED));
    testCase.continueTesting();
  }, 500);
}


function testClose() {
  stubs.replace(window, 'close', mockControl.createFunctionMock('close'));
  window.close();
  mockControl.$replayAll();

  page.decorate(document.documentElement);
  page.closeAndDisableWelcomeScreen_();

  assertFalse(
      'Failed to disable welcome screen', preferences.isWelcomePageEnabled());
  mockControl.$verifyAll();
}


function testGenerateKey() {
  stubs.replace(window, 'alert', mockControl.createFunctionMock('alert'));
  mockControl.$replayAll();

  page.decorate(document.documentElement);
  page.generateKey_({reset: function() {}}, '', 'test@example.com', '');
  testCase.waitForAsync('waiting for key to be generated');

  window.setTimeout(function() {
    testCase.continueTesting();
    assertContains('welcomeGenKeyConfirm', document.body.textContent);
    for (var childIdx = 0; childIdx < page.getChildCount(); childIdx++) {
      var child = page.getChildAt(childIdx);
      if (child instanceof e2e.ext.ui.dialogs.Generic) {
        child.dialogCallback_();
      }
    }
    assertNotContains('welcomeGenKeyConfirm', document.body.textContent);

    mockControl.$verifyAll();
  }, 500);
}


function testImportKeyring() {
  stubs.replace(e2e.ext.utils, 'readFile',
      mockControl.createFunctionMock('readFile'));
  stubs.replace(chrome.i18n, 'getMessage', function(a, b) {
    return a + (b ? b : '');
  });
  var readCallbackArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  e2e.ext.utils.readFile(
      goog.testing.mockmatchers.ignoreArgument, readCallbackArg);

  stubs.setPath('e2e.ext.actions.GetKeyDescription.prototype.execute',
      mockControl.createFunctionMock());
  var keyDescriptionArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  e2e.ext.actions.GetKeyDescription.prototype.execute(
      goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument,
      page,
      keyDescriptionArg,
      goog.testing.mockmatchers.ignoreArgument);

  mockControl.$replayAll();

  page.decorate(document.documentElement);
  page.importKeyring_('irrelevant');
  readCallbackArg.arg(PUBLIC_KEY_ASCII);
  keyDescriptionArg.arg('');

  testCase.waitForAsync('waiting for keyring to be imported');
  window.setTimeout(function() {
    assertContains('welcomeKeyImport', document.body.textContent);
    for (var childIdx = 0; childIdx < page.getChildCount(); childIdx++) {
      var child = page.getChildAt(childIdx);
      if (child instanceof e2e.ext.ui.dialogs.Generic) {
        child.dialogCallback_();
      }
    }
    assertNotContains('welcomeKeyImport', document.body.textContent);
    mockControl.$verifyAll();
    testCase.continueTesting();
  }, 500);
}


function testUpdateKeyringPassphrase() {
  page.decorate(document.documentElement);
  stubs.set(launcher.pgpContext_, 'changeKeyRingPassphrase', function(pass) {
    assertEquals('testPass', pass);
    return e2e.async.Result.toResult(undefined);
  });

  stubs.set(
      launcher.pgpContext_, 'isKeyRingEncrypted', function() {
        return e2e.async.Result.toResult(true);
      });

  mockControl.$replayAll();
  page.updateKeyringPassphrase_('testPass');

  assertContains(
      'keyMgmtChangePassphraseSuccessMsg', document.body.textContent);
  for (var childIdx = 0; childIdx < page.getChildCount(); childIdx++) {
    var child = page.getChildAt(childIdx);
    if (child instanceof e2e.ext.ui.dialogs.Generic) {
      child.dialogCallback_();
    }
  }
  assertNotContains(
      'keyMgmtChangePassphraseSuccessMsg', document.body.textContent);

  mockControl.$verifyAll();
}


function testRenderPassphraseCallback() {
  var passphrase = 'test';

  stubs.replace(chrome.i18n, 'getMessage', function(a, b) {
    return b;
  });

  var callback = mockControl.createFunctionMock('callback');
  callback(passphrase);

  mockControl.$replayAll();

  page.decorate(document.documentElement);
  page.renderPassphraseCallback_('test_uid').addCallback(callback);

  assertContains('test_uid', document.body.textContent);
  for (var childIdx = 0; childIdx < page.getChildCount(); childIdx++) {
    var child = page.getChildAt(childIdx);
    if (child instanceof e2e.ext.ui.dialogs.Generic) {
      child.dialogCallback_(passphrase);
    }
  }
  assertNotContains('test_uid', document.body.textContent);

  mockControl.$verifyAll();
}


function populatePgpKeys() {
  var ctx = launcher.getContext();
  ctx.importKey(function(uid) {
    return e2e.async.Result.toResult('test');
  }, PRIVATE_KEY_ASCII);

  ctx.importKey(goog.nullFunction, PUBLIC_KEY_ASCII);
}

