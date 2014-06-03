// Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Tests for the settings page.
 */

goog.require('e2e.ext.Launcher');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.ui.Settings');
goog.require('e2e.ext.ui.panels.KeyringMgmtFull');
goog.require('e2e.ext.ui.preferences');
goog.require('e2e.ext.utils');
goog.require('e2e.openpgp.KeyRing');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.Mock');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');

var constants = e2e.ext.constants;
var launcher = null;
var mockControl = null;
var page = null;
var preferences = e2e.ext.ui.preferences;
var stubs = new goog.testing.PropertyReplacer();
var testCase = goog.testing.AsyncTestCase.createAndInstall();


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

  stubs.setPath('chrome.browserAction.setBadgeText', function() {});
  stubs.setPath('chrome.browserAction.setTitle', function() {});
  stubs.setPath('chrome.i18n.getMessage', function(msg) {
    return msg;
  });
  stubs.setPath('chrome.tabs.onUpdated.addListener', function() {});
  stubs.setPath('chrome.tabs.onRemoved.addListener', function() {});
  stubs.setPath('chrome.extension.getURL', function() {});
  stubs.setPath('chrome.notifications.clear', function() {});
  stubs.setPath('chrome.notifications.create', function() {});
  stubs.setPath('chrome.runtime.getBackgroundPage', function(callback) {
    callback({launcher: launcher});
  });
  stubs.setPath('chrome.runtime.onConnect.addListener', function() {});
  stubs.setPath('chrome.runtime.onConnect.removeListener', function() {});
  stubs.replace(window, 'confirm', function(msg) { return true;});

  page = new e2e.ext.ui.Settings();
  localStorage.clear();
  launcher = new e2e.ext.Launcher();
  launcher.start();
}


function tearDown() {
  goog.dispose(page);
  goog.dispose(launcher);
  launcher.pgpContext_.keyRing_.reset();

  stubs.reset();
  mockControl.$tearDown();
}


function testRendering() {
  stubs.replace(chrome.i18n, 'getMessage', function() {
    return 'Page title';
  });

  launcher.pgpContext_.importKey(function() {}, PUBLIC_KEY_ASCII);

  page.decorate(document.documentElement);
  assertContains('Page title', document.body.textContent);
}


function testGenerateKey() {
  page.decorate(document.documentElement);
  testCase.waitForAsync('waiting for key to be generated');
  fakeGenerateKey().addCallback(function() {
    testCase.continueTesting();
    assertNotEquals(-1, document.body.textContent.indexOf(
        '<test@example.com>'));
  });
}


function testRemoveKey() {
  stubs.set(launcher.pgpContext_, 'deleteKey',
      mockControl.createFunctionMock('deleteKey'));
  launcher.pgpContext_.deleteKey('test@example.com');

  stubs.replace(e2e.ext.ui.panels.KeyringMgmtFull.prototype, 'removeKey',
      mockControl.createFunctionMock('removeKey'));
  e2e.ext.ui.panels.KeyringMgmtFull.prototype.removeKey('test@example.com');

  mockControl.$replayAll();

  page.decorate(document.documentElement);
  testCase.waitForAsync('waiting for key to be generated');
  fakeGenerateKey().addCallback(function() {
    testCase.continueTesting();
    page.removeKey_('test@example.com');

    testCase.waitForAsync('waiting for key to be removed');
    window.setTimeout(function() {
      testCase.continueTesting();
      mockControl.$verifyAll();
    }, 500);
  });
}


function testExportKey() {
  stubs.replace(
      HTMLElement.prototype, 'click', mockControl.createFunctionMock('click'));
  HTMLElement.prototype.click();

  stubs.replace(e2e.ext.utils, 'WriteToFile',
      mockControl.createFunctionMock('WriteToFile'));
  var contentMatcher = new goog.testing.mockmatchers.ArgumentMatcher(
      function(arg) {
        return arg.length > 0;
      });
  var callbackArg = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  e2e.ext.utils.WriteToFile(
      goog.testing.mockmatchers.ignoreArgument, contentMatcher, callbackArg);

  mockControl.$replayAll();

  page.decorate(document.documentElement);
  testCase.waitForAsync('waiting for key to be generated');
  fakeGenerateKey().addCallback(function() {
    testCase.continueTesting();
    page.exportKey_('test@example.com');
    callbackArg.arg(document.location.href);
    mockControl.$verifyAll();
  });
}


function testExportKeyWithSlashes() {
  stubs.replace(e2e.ext.utils, 'WriteToFile',
      mockControl.createFunctionMock('WriteToFile'));
  var filenameMatcher = new goog.testing.mockmatchers.ArgumentMatcher(
      function(arg) {
        return arg.indexOf('/') == -1;
      });
  e2e.ext.utils.WriteToFile(
      filenameMatcher,
      goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument);
  mockControl.$replayAll();

  page.decorate(document.documentElement);
  testCase.waitForAsync('waiting for key to be generated');
  fakeGenerateKey('test/user').addCallback(function() {
    testCase.continueTesting();
    page.exportKey_('test@example.com');
    mockControl.$verifyAll();
  });
}


function testImportKeyring() {
  stubs.replace(chrome.notifications, 'create',
      mockControl.createFunctionMock('create'));
  var notificationArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  chrome.notifications.create(
      goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument,
      notificationArg);

  stubs.replace(e2e.ext.utils, 'ReadFile',
      mockControl.createFunctionMock('ReadFile'));
  var readCallbackArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  e2e.ext.utils.ReadFile(
      goog.testing.mockmatchers.ignoreArgument, readCallbackArg);

  stubs.replace(e2e.ext.ui.panels.KeyringMgmtFull.prototype, 'resetControls',
      mockControl.createFunctionMock('resetControls'));
  e2e.ext.ui.panels.KeyringMgmtFull.prototype.resetControls();

  mockControl.$replayAll();

  page.decorate(document.documentElement);
  page.importKeyring_('irrelevant');
  readCallbackArg.arg(PUBLIC_KEY_ASCII);

  testCase.waitForAsync('waiting for keyring to be imported');
  window.setTimeout(function() {
    testCase.continueTesting();
    notificationArg.arg();

    mockControl.$verifyAll();
    assertContains('test 4', document.body.textContent);
  }, 500);

}


function testExportKeyring() {
  var downloadedFile = false;
  stubs.replace(HTMLElement.prototype, 'click', function() {
    downloadedFile = true;
  });

  page.decorate(document.documentElement);
  page.exportKeyring_();

  testCase.waitForAsync('waiting for keyring to be exported');
  window.setTimeout(function() {
    testCase.continueTesting();
    // TODO(adhintz) Fix this test and enable this assert.
    // assertTrue('Failed to export keyring', downloadedFile);
  }, 500);
}


function testUpdateKeyringPassphrase() {
  page.decorate(document.documentElement);
  stubs.set(launcher.pgpContext_, 'changeKeyRingPassphrase',
      mockControl.createFunctionMock('changeKeyRingPassphrase'));
  launcher.pgpContext_.changeKeyRingPassphrase('testPass');

  stubs.replace(chrome.notifications, 'create',
      mockControl.createFunctionMock('create'));
  var msgMatcher = new goog.testing.mockmatchers.ArgumentMatcher(
      function(arg) {
        return arg.message == 'keyMgmtChangePassphraseSuccessMsg';
      });
  chrome.notifications.create(
      goog.testing.mockmatchers.ignoreArgument,
      msgMatcher,
      goog.testing.mockmatchers.ignoreArgument);

  stubs.set(
      launcher.pgpContext_, 'isKeyRingEncrypted', function() {return true;});
  stubs.set(page.keyringMgmtPanel_, 'setKeyringEncrypted',
      mockControl.createFunctionMock('setKeyringEncrypted'));
  page.keyringMgmtPanel_.setKeyringEncrypted(true);

  mockControl.$replayAll();
  page.updateKeyringPassphrase_('testPass');
  mockControl.$verifyAll();
}


function testRenderPassphraseCallback() {
  stubs.replace(chrome.i18n, 'getMessage', function() {
    return '%s';
  });
  page.decorate(document.documentElement);
  page.renderPassphraseCallback_('test_uid', function() {});

  assertContains('test_uid', document.body.textContent);
}


function testDisplayFailure() {
  page.decorate(document.documentElement);
  var errorDiv = document.getElementById(constants.ElementId.ERROR_DIV);

  page.displayFailure_(new Error('test failure'));
  assertEquals('test failure', errorDiv.textContent);

  page.clearFailure_();
  assertEquals('', errorDiv.textContent);
}


function fakeGenerateKey(opt_fullname) {
  return page.generateKey_({reset: function() {}}, opt_fullname || 'test user',
      'test@example.com', 'comment');
}
