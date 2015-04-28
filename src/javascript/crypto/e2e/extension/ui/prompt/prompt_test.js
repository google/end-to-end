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
 * @fileoverview Unit tests for the UI prompt.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.PromptTest');

goog.require('e2e.async.Result');
goog.require('e2e.ext.ExtensionLauncher');
goog.require('e2e.ext.Launcher');
goog.require('e2e.ext.actions.DecryptVerify');
goog.require('e2e.ext.actions.EncryptSign');
goog.require('e2e.ext.actions.GetKeyDescription');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.constants.ElementId');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.ui.Prompt');
goog.require('e2e.ext.utils');
goog.require('e2e.ext.utils.TabsHelperProxy');
goog.require('e2e.ext.utils.text');
goog.require('e2e.openpgp.ContextImpl');
/** @suppress {extraRequire} intentionally importing all signer functions */
goog.require('e2e.signer.all');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.mockmatchers.ArgumentMatcher');
goog.require('goog.testing.mockmatchers.SaveArgument');
goog.require('goog.testing.storage.FakeMechanism');
goog.require('goog.ui.PopupMenu');
goog.setTestOnly();

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);

var constants = e2e.ext.constants;
var mockControl = null;
var fakeStorage = null;
var prompt = null;
var stubs = new goog.testing.PropertyReplacer();
var helperProxy;
var utils = e2e.ext.utils;


function setUp() {
  asyncTestCase.stepTimeout = 2000;
  mockControl = new goog.testing.MockControl();
  e2e.ext.testingstubs.initStubs(stubs);

  stubs.replace(goog.Timer.prototype, 'start', goog.nullFunction);

  fakeStorage = new goog.testing.storage.FakeMechanism();
  helperProxy = new e2e.ext.utils.TabsHelperProxy(false);

  prompt = new e2e.ext.ui.Prompt(helperProxy);
  prompt.pgpLauncher_ = new e2e.ext.ExtensionLauncher(
      new e2e.openpgp.ContextImpl(new goog.testing.storage.FakeMechanism()),
      fakeStorage);
  prompt.pgpLauncher_.start();
  stubs.setPath('window.chrome.runtime.getBackgroundPage', function(callback) {
    callback({launcher: prompt.pgpLauncher_});
  });

  stubs.replace(e2e.ext.Launcher.prototype, 'hasPassphrase', function() {
    return true;
  });

}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
  prompt.dispose();
  goog.dispose(prompt);
}


function testGetSelectedContent() {
  stubs.replace(e2e.ext.Launcher.prototype, 'hasPassphrase', function() {
    return true;
  });

  var queriedForSelectedContent = false;
  stubs.replace(
      prompt.getHelperProxy(), 'getSelectedContent', function() {
        queriedForSelectedContent = true;
      });

  stubs.replace(chrome.runtime, 'getBackgroundPage', function(callback) {
    callback({launcher: new e2e.ext.ExtensionLauncher(
        new e2e.openpgp.ContextImpl(new goog.testing.storage.FakeMechanism()),
        new goog.testing.storage.FakeMechanism()
      )});
  });

  prompt.decorate(document.documentElement);
  assertTrue('Failed to query for selected content', queriedForSelectedContent);
}


function testGetSelectedContentWithError() {
  stubs.replace(e2e.ext.Launcher.prototype, 'hasPassphrase', function() {
    return true;
  });

  stubs.replace(
      prompt.getHelperProxy(), 'getSelectedContent', function(cb, errorCb) {
        // Simulate an error.
        errorCb();
      });

  stubs.replace(chrome.runtime, 'getBackgroundPage', function(callback) {
    callback({launcher: new e2e.ext.ExtensionLauncher(
        new e2e.openpgp.ContextImpl(new goog.testing.storage.FakeMechanism()),
        new goog.testing.storage.FakeMechanism()
      )});
  });

  stubs.replace(
      prompt, 'processSelectedContent_', function(content) {
        assertNull(content);
        asyncTestCase.continueTesting();
      });

  asyncTestCase.waitForAsync('Decorating prompt');
  prompt.decorate(document.documentElement);
}


function testRendering() {
  stubs.replace(chrome.i18n, 'getMessage', function() {
    return 'PGP Encrypt/Sign';
  });

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_({
    request: true,
    selection: 'irrelevant',
    recipients: ['example@example.com']
  });
  var elem = document.body;
  assertTrue(elem.textContent.indexOf('PGP Encrypt/Sign') > -1);
}


function testMenuRendering() {
  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_();
  var elem = document.body;

  assertContains('actionUserSpecified', elem.textContent);
}


function testLoadingState() {
  stubs.replace(chrome.i18n, 'getMessage', function(msgId) {
    return msgId;
  });

  prompt.decorate(document.documentElement);
  var elem = document.body;

  assertContains('actionLoading', elem.textContent);
  assertTrue(goog.dom.classlist.contains(
      prompt.getElementByClass(e2e.ext.constants.CssClass.BUTTONS_CONTAINER),
      e2e.ext.constants.CssClass.HIDDEN));

}


function testDisabledMenuItems() {
  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_({
    action: e2e.ext.constants.Actions.ENCRYPT_SIGN
  });
  assertTrue(prompt.getChildAt(1) instanceof goog.ui.PopupMenu);
  assertEquals(e2e.ext.constants.Actions.ENCRYPT_SIGN,
      prompt.getChildAt(1).getItemAt(0).getValue());
  assertFalse('Menu item should be disabled',
      prompt.getChildAt(1).getItemAt(0).isEnabled());
}


function testDisposeOnClose() {
  prompt.close();
  assertTrue('Failed to dispose prompt', prompt.isDisposed());
}


function testGetTitle() {
  stubs.replace(chrome.i18n, 'getMessage', function(msgId) {
    return msgId;
  });
  assertEquals('actionUserSpecified',
      prompt.getTitle_(e2e.ext.constants.Actions.USER_SPECIFIED));
  assertEquals('actionUnlockKeyring',
      prompt.getTitle_(e2e.ext.constants.Actions.GET_PASSPHRASE));
}


var PRIVATE_KEY_ASCII =
    '-----BEGIN PGP PRIVATE KEY BLOCK-----\n' +
    'Version: GnuPG v1.4.11 (GNU/Linux)\n' +
    '\n' +
    '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\n' +
    '1KwNtVw=\n' +
    '=wHzz\n' +
    '-----END PGP PRIVATE KEY BLOCK-----';

var USER_ID = 'test 4';

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

var USER_ID_2 = 'Drew Hintz <adhintz@google.com>';

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

var PUBLIC_KEY_ASCII_2_EVIL = // Evil Drew Hintz <adhintz@google.com.evil.com>
    '-----BEGIN PGP PUBLIC KEY BLOCK-----\n' +
    'Version: GnuPG v1.4.11 (GNU/Linux)\n' +
    '\n' +
    'mI0EU7FngwEEALi4HSlK9DJuYUS7zEuJpi2RVdTE0zDQwyX7xLCERZLrPVWUHH0x\n' +
    'XO9X7X6ngA2qNQVUirMsGK/OOwTwzN0ywmETmHJCjx7cPqruSxD+BsnceiHRWc7m\n' +
    'FCJSP7Vl7BQUp16sbryT8dOpXmc+72ftxPahDJ0WWKSebXYVvvcJM8cLABEBAAG0\n' +
    'MkxpbnVzIFRvcndhbGRzIDxMaW51cy5Ub3J3YWxkczFAY2FyYW1haWwuY29tLmV2\n' +
    'aWw+iLgEEwECACIFAlOxZ4MCGwMGCwkIBwMCBhUIAgkKCwQWAgMBAh4BAheAAAoJ\n' +
    'EMBeGa5IppzDSFoD/0KGrjnLynrzOD7ZZRCL6jcv/YXR0PCgmyko94njmozfupmp\n' +
    'his/9Nw6EChGC1WigwmgOYXzy/fynnts1YlPSQQJpbDt1XIOkm0dmSKSI+/zNxGm\n' +
    'BZqstDLEdUPLt7HZecz5iTbEh3NDpz8nhiHiiIq0rMN0f67+vFpsfLQLtvw7tDVM\n' +
    'aW51cy5Ub3J3YWxkczFAY2FyYW1haWwuY29tLmV2aWwyIDxhbm90aGVyQGV2aWwu\n' +
    'Y29tPoi4BBMBAgAiBQJTsWmqAhsDBgsJCAcDAgYVCAIJCgsEFgIDAQIeAQIXgAAK\n' +
    'CRDAXhmuSKacw7C+A/988WuUl7PzBjIDiCEjffe/fC4gNP7viRRQhwvh8QSgNpXl\n' +
    '9TQ4PcKQRZvfNJk+OQvHMoPa+qXAB91GQg/nzYcFwKrsiy+wddAc/SbL0ClT5EEG\n' +
    'hy2DzvuOHoTK51O+RwaHP08jciQIeLC0BRJEMsuxK86j9vlUEWAEP9uPEiUvobiN\n' +
    'BFOxZ4MBBADDAzzpcIhOslSqULxjSdhQH0y8DK8GgbsCeIxf8iGIFNHEbOzUUZKV\n' +
    'IITTBjQVZS/2enkE+UOpVZUp2SgJogEbxstjeE7NofWNqeDGye01dfGDOyjc1Se/\n' +
    'WwHbxendlFpjZ8iHAjza4Bws2SsgCYYx0vfB8yruDnj9B299xXevLQARAQABiJ8E\n' +
    'GAECAAkFAlOxZ4MCGwwACgkQwF4ZrkimnMMPnwP+J/cbZK5eR0v6Y9VI2uA6GW7T\n' +
    'vILwfV3mUki9a5ag0XhL1xQWJSEBSLvNJac8/Cpc80yUpXvmvBhoefZSzzcR00pN\n' +
    'RyfyHLU6nEU7LDvQlN3TPpuctRhrLEnn4pMhgvIxDRLKcR1JtZ9ikcYI9pC9ywx7\n' +
    'YjNmsSc84KVYhDqIn6eZAaIEU7GElxEEAIbLqIgY+O3NLfNYp5da8c5hnPdMprOP\n' +
    '2dzL7d0ay6LsuaAcXSq4yaOa/WOAL64kFdX+I40sV21nQZ/gYB6OFT/qk3WtKepE\n' +
    'L6lc9iZULbVL9H14UOFAetYrmO53YetFpJZVCnsVBw7GRhOLV31oXldouh2a2NjC\n' +
    'r+5By/EaP2ADAKDxqlytOJwCJ+sWP0PGnjONb4zOdQP/X15UGQbmsDIm/iY3yPQe\n' +
    'FJjqMX0dKUJxB5cpVhBg2R4JZLCuDiN+3xC7/bcyZzUlaU7axt1/KvwighAnZrBD\n' +
    'Z6RbbPdCOf+KtSifQvNSrAOk8AhRrUN+sGc/fLSotsBPXcXYSR6bm/fzRKtcmV7U\n' +
    '95dkYanPy2rGG/HfB+opWrED/ic1Ib28DNReZ/xvbJicm2YDda8SyemX8g4/Qrir\n' +
    'oqtXeOIyHyOeZQoFk+W5sIXy1t8lM8isYNctKdvuSPjaZbTD//bI2r2T1Sc/nwoy\n' +
    'LupRcNH2oSfZ/4idPzCNdyHEDhzzNw1m8LQO1x5a2FJGJgaF8JCiNeNT8m65b/Uq\n' +
    'myw7tC1FdmlsIERyZXcgSGludHogPGFkaGludHpAZ29vZ2xlLmNvbS5ldmlsLmNv\n' +
    'bT6IYgQTEQIAIgUCU7GElwIbAwYLCQgHAwIGFQgCCQoLBBYCAwECHgECF4AACgkQ\n' +
    'qFdA2mzeclR1qwCg0a+61ZBPYdopFg8cwUjsDnFVvUAAoNun2cB7omK05P3URbVf\n' +
    'HEWI4RSPuQENBFOxhJcQBAC/SptM2I3+1ktGrhVHTkSU0C7/hiKWqKKg4lrQe0VR\n' +
    'GPi4SBc2stjS5HhBhDb+fBl3K+IiqDh8yCHxtXJeenrOutklMSfl89hDWLQefgrU\n' +
    'zZ3VX3llAs4DDjxF7ppEAraHM6GpPm+oEXeOuThBAqOkstT53IehTspiqnoouKgu\n' +
    'PwAECwQAmBGvx+TYOhEajpexobauc8yTACFwhYiwx7XK4+LGRenRJMY9/oGMb4/r\n' +
    'L4DLA4kosrzvblbGFLOsj/MtN2HZZIjekVqEpLqNULX8WfwO4ku+ahRCT+qOQe5x\n' +
    '9dHXUgr+ZRFtAkhxdMIF6Yh3eH7aSYZYkbUUaxtRSPsNfDe1Xh2ISQQYEQIACQUC\n' +
    'U7GElwIbDAAKCRCoV0DabN5yVIa4AKCwMqovxeUL8m2D7aWMZBLYG5Bb2wCfVpwq\n' +
    'x4imzBK+e4+YnAiNVhYYEJY=\n' +
    '=lo5W\n' +
    '-----END PGP PUBLIC KEY BLOCK-----';

function testEncrypt() {
  var plaintext = 'plaintext message';
  var encrypted = 'encrypted message';

  var encryptCb = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  stubs.setPath('e2e.ext.actions.EncryptSign.prototype.execute',
      mockControl.createFunctionMock('encryptSign'));
  e2e.ext.actions.EncryptSign.prototype.execute(
      goog.testing.mockmatchers.ignoreArgument,
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertEquals(plaintext, arg.content);
        return true;
      }),
      goog.testing.mockmatchers.ignoreArgument,
      encryptCb,
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));

  stubs.replace(e2e.ext.utils.text, 'extractValidEmail', function(recipient) {
    if (recipient == USER_ID) {
      return recipient;
    }
    return null;
  });

  mockControl.$replayAll();

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_({
    request: true,
    selection: plaintext,
    recipients: [USER_ID]
  }, constants.Actions.ENCRYPT_SIGN);
  goog.dom.getElement(constants.ElementId.SIGN_MESSAGE_CHECK).checked = true;

  var protectBtn = document.querySelector('button.action');
  protectBtn.click();

  asyncTestCase.waitForAsync('Waiting for message to be encrypted.');
  window.setTimeout(function() {
    encryptCb.arg(encrypted);
    var textArea = document.querySelector('textarea');
    assertEquals(encrypted, textArea.value);
    assertTrue(textArea.disabled);

    mockControl.$verifyAll();
    asyncTestCase.continueTesting();
  }, 100);
}

function testDecrypt() {
  var plaintext = 'plaintext message';
  var encrypted = 'encrypted message';

  var decryptCb = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  stubs.setPath('e2e.ext.actions.DecryptVerify.prototype.execute',
      mockControl.createFunctionMock('decryptVerify'));
  e2e.ext.actions.DecryptVerify.prototype.execute(
      goog.testing.mockmatchers.ignoreArgument,
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertEquals(encrypted, arg.content);
        return true;
      }),
      goog.testing.mockmatchers.ignoreArgument,
      decryptCb,
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));

  mockControl.$replayAll();

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_({
    request: true,
    selection: encrypted
  }, constants.Actions.DECRYPT_VERIFY);

  var decryptBtn = document.querySelector('button.action');
  decryptBtn.click();

  asyncTestCase.waitForAsync('Waiting for text to be decrypted.');
  window.setTimeout(function() {
    decryptCb.arg(plaintext);
    assertEquals(
        '', goog.dom.getElement(constants.ElementId.ERROR_DIV).textContent);
    assertEquals(plaintext, document.querySelector('textarea').value);
    mockControl.$verifyAll();
    asyncTestCase.continueTesting();
  }, 100);
}


function testOpenPopout() {
  var selection = 'selected content';
  var stubWindow = {
    id: 5
  };
  var timesCalled = 0;

  stubs.setPath('e2e.ext.utils.isChromeExtensionWindow', function() {
    return true;
  });

  stubs.setPath('chrome.windows.create', function(windowOptions, callback) {
    assertEquals('prompt.html?popout#' + e2e.ext.testingstubs.TAB_ID,
        windowOptions.url);
    assertEquals('popup', windowOptions.type);
    callback(stubWindow);
  });

  stubs.setPath('chrome.windows.update', function(windowId, update) {
    assertEquals(5, windowId);
    timesCalled++;
    assertTrue(update.focused);
  });

  stubs.set(prompt, 'close', function() {
    assertEquals(2, timesCalled);
    asyncTestCase.continueTesting();
  });

  stubs.setPath('chrome.extension.getViews', function() {
    return [{location: {search: '?popout'}, postMessage: function(msg,
            senderOrigin) {
          assertEquals(selection, msg.selection);
          assertEquals(constants.Actions.ENCRYPT_SIGN, msg.action);
          assertEquals(location.origin, senderOrigin);
          timesCalled++;
        }}];
  });

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_({
    request: true,
    selection: selection,
    action: constants.Actions.ENCRYPT_SIGN
  });
  asyncTestCase.waitForAsync('Waiting for popout window to open.');
  var popoutButton = document.querySelector('.popout-button');
  popoutButton.click();
}

function testInitializePopout() {
  var selection = 'aaa';
  var removedListener = false;
  var request = {
    request: true,
    selection: selection,
    action: constants.Actions.DECRYPT_VERIFY
  };
  stubs.set(prompt, 'isPopout', true);
  stubs.set(window, 'removeEventListener', function(eventType) {
    assertEquals('message', eventType);
    removedListener = true;
  });
  stubs.set(window, 'addEventListener', function(eventType, handler) {
    assertEquals('message', eventType);
    handler({data: request, origin: 'http://invalid-origin.com'});
    assertFalse(prompt.wasDecorated());
    assertFalse(removedListener);
    handler({data: request, origin: location.origin});
    assertTrue(prompt.wasDecorated());
    assertEquals(constants.Actions.DECRYPT_VERIFY,
        prompt.panel_.getContent().action);
    assertEquals(selection, prompt.panel_.getContent().selection);
    assertTrue(removedListener);
  });
  prompt.startMessageListener();
  assertTrue(removedListener);
}


function testContentInsertedOnEncrypt() {
  var plaintext = 'irrelevant';
  var origin = 'http://www.example.com';
  var subject = 'encrypted message';

  stubs.replace(e2e.ext.utils.text, 'extractValidEmail',
      function(recipient) {
        if (recipient == USER_ID) {
          return recipient;
        }
        return null;
      });
  stubs.set(prompt.getHelperProxy(), 'updateSelectedContent',
      mockControl.createFunctionMock('updateSelectedContent'));
  var encryptedMsg = new goog.testing.mockmatchers.SaveArgument(goog.isString);
  var subjectMsg = new goog.testing.mockmatchers.SaveArgument(function(a) {
    return (!goog.isDef(a) || goog.isString(a));
  });
  prompt.getHelperProxy().updateSelectedContent(encryptedMsg, [USER_ID], origin,
      false, goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument, subjectMsg);

  mockControl.$replayAll();
  populatePgpKeys();

  asyncTestCase.waitForAsync('Waiting for keys to be populated.');
  window.setTimeout(function() {
    prompt.decorate(document.documentElement);
    prompt.processSelectedContent_({
      request: true,
      selection: plaintext,
      recipients: [USER_ID],
      origin: origin,
      canInject: true,
      subject: subject
    }, constants.Actions.ENCRYPT_SIGN);

    var protectBtn = document.querySelector('button.action');
    protectBtn.click();

    asyncTestCase.waitForAsync('Waiting for message to be encrypted.');
    window.setTimeout(function() {
      var insertBtn = document.querySelector('button.insert');
      insertBtn.click();

      assertContains('-----BEGIN PGP MESSAGE-----', encryptedMsg.arg);
      assertEquals(subject, subjectMsg.arg);
      mockControl.$verifyAll();
      asyncTestCase.continueTesting();
    }, 500);
  }, 500);
}


function testImportKey() {
  stubs.setPath('chrome.runtime.getBackgroundPage', function(callback) {
    callback({launcher: prompt.pgpLauncher_});
  });

  stubs.setPath('e2e.ext.actions.GetKeyDescription.prototype.execute',
      mockControl.createFunctionMock('execute'));
  var keyDescriptionArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  e2e.ext.actions.GetKeyDescription.prototype.execute(
      goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument,
      keyDescriptionArg,
      goog.testing.mockmatchers.ignoreArgument);

  stubs.replace(chrome.notifications, 'create',
      mockControl.createFunctionMock('create'));
  var notificationArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  chrome.notifications.create(
      goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument,
      notificationArg);

  mockControl.$replayAll();

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_({
    request: true,
    selection: PUBLIC_KEY_ASCII
  }, constants.Actions.IMPORT_KEY);

  var importBtn = document.querySelector('button.action');
  importBtn.click();

  keyDescriptionArg.arg('');
  asyncTestCase.waitForAsync('waiting for keyring to be imported');
  window.setTimeout(function() {
    notificationArg.arg();

    mockControl.$verifyAll();
    asyncTestCase.continueTesting();
  }, 500);
}


function testDisplayFailure() {
  prompt.decorate(document.documentElement);
  var errorDiv = document.getElementById(constants.ElementId.ERROR_DIV);

  prompt.displayFailure_(new Error('test failure'));
  assertEquals('test failure', errorDiv.textContent);
}


function testSelectAction() {
  var processedContent = false;
  stubs.replace(
      e2e.ext.ui.Prompt.prototype,
      'processSelectedContent_',
      function(blob) {
        assertEquals('Failed to select action', 'test_action', blob.action);
        processedContent = true;
      });

  prompt.selectAction_(null, {
    target: {
      getValue: function() { return 'test_action'}
    }
  });

  assertTrue('Failed to process content', processedContent);
}


function testIfNoPassphrase() {
  prompt.pgpLauncher_ = new e2e.ext.ExtensionLauncher(
      new e2e.openpgp.ContextImpl(new goog.testing.storage.FakeMechanism()),
      new goog.testing.storage.FakeMechanism()
      );
  stubs.replace(e2e.ext.Launcher.prototype, 'hasPassphrase', function() {
    return false;
  });

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_(
      null, e2e.ext.constants.Actions.ENCRYPT_SIGN);
  assertContains('actionEnterPassphrase', document.body.textContent);
}


function testSetKeyringPassphrase() {
  var passphrase = 'test';
  stubs.set(prompt.pgpLauncher_, 'start',
      mockControl.createFunctionMock('start'));
  prompt.pgpLauncher_.start(passphrase);

  stubs.set(prompt, 'close', mockControl.createFunctionMock('close'));
  prompt.close();

  mockControl.$replayAll();

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_(null, constants.Actions.GET_PASSPHRASE);

  assertFalse(goog.dom.classlist.contains(
      goog.dom.getElement(e2e.ext.constants.ElementId.BODY),
      e2e.ext.constants.CssClass.TRANSPARENT));

  var dialog = prompt.getChildAt(0);
  dialog.dialogCallback_(passphrase);

  mockControl.$verifyAll();
}


function testSetKeyringPassphraseRedirect() {
  var passphrase = 'test';
  stubs.set(prompt.pgpLauncher_, 'start',
      mockControl.createFunctionMock('start'));
  prompt.pgpLauncher_.start(passphrase);

  stubs.set(prompt, 'close', mockControl.createFunctionMock('close'));

  mockControl.$replayAll();

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_({
    request: true,
    selection: 'irrelevant',
    recipients: [USER_ID],
    action: constants.Actions.ENCRYPT_SIGN
  }, constants.Actions.GET_PASSPHRASE);

  var dialog = prompt.getChildAt(0);
  dialog.dialogCallback_(passphrase);

  assertContains('promptEncryptSignActionLabel', document.body.textContent);

  mockControl.$verifyAll();
}


function testSetKeyringPassphraseRedirectDefault() {
  var passphrase = 'test';
  stubs.set(prompt.pgpLauncher_, 'start',
      mockControl.createFunctionMock('start'));
  prompt.pgpLauncher_.start(passphrase);

  stubs.set(prompt, 'close', mockControl.createFunctionMock('close'));

  mockControl.$replayAll();

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_({
    action: constants.Actions.GET_PASSPHRASE
  }, constants.Actions.GET_PASSPHRASE);

  var dialog = prompt.getChildAt(0);
  dialog.dialogCallback_(passphrase);

  assertContains('promptEncryptSignTitle', document.body.textContent);

  mockControl.$verifyAll();
}


function testSetKeyringPassphraseError() {
  var passphrase = 'test';
  stubs.set(prompt.pgpLauncher_, 'start',
      mockControl.createFunctionMock('start'));
  prompt.pgpLauncher_.start(passphrase).$throws(new Error('irrelevant'));

  stubs.set(prompt, 'close', mockControl.createFunctionMock('close'));

  mockControl.$replayAll();

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_({
    action: constants.Actions.GET_PASSPHRASE
  }, constants.Actions.GET_PASSPHRASE);

  var dialog = prompt.getChildAt(0);
  dialog.dialogCallback_(passphrase);
  assertEquals(2, prompt.getChildCount());

  mockControl.$verifyAll();
}


function testClose() {
  var closedWindow = false;
  prompt.addOnDisposeCallback(function() {
    closedWindow = true;
  });

  prompt.decorate(document.body);
  prompt.close();

  assertTrue(prompt.isDisposed());

  goog.array.forEach(
      document.querySelectorAll('textarea,input'), function(elem) {
        assertEquals('', elem.value);
      });
}


function testConfigureExtension() {
  stubs.setPath('chrome.tabs.create', mockControl.createFunctionMock());
  chrome.tabs.create(
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertEquals('settings.html', arg.url);
        assertFalse(arg.active);
        return true;
      }),
      goog.nullFunction);

  mockControl.$replayAll();
  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_(null, constants.Actions.CONFIGURE_EXTENSION);

  mockControl.$verifyAll();
}


function testNoOp() {
  stubs.set(prompt, 'close', mockControl.createFunctionMock());
  prompt.close();

  mockControl.$replayAll();

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_(null, constants.Actions.NO_OP);

  mockControl.$verifyAll();
}


function populatePgpKeys() {
  var ctx = prompt.pgpLauncher_.getContext();
  ctx.importKey(function(uid) {
    return e2e.async.Result.toResult('test');
  }, PRIVATE_KEY_ASCII);

  ctx.importKey(function() {}, PUBLIC_KEY_ASCII);
}
