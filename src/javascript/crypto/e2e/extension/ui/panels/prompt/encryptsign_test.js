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
 * @fileoverview Unit tests for the encryption panel for the prompt UI.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.panels.prompt.EncryptSignTest');

goog.require('e2e.ext.ExtensionLauncher');
goog.require('e2e.ext.actions.DecryptVerify');
goog.require('e2e.ext.actions.EncryptSign');
goog.require('e2e.ext.actions.Executor');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.ui.panels.prompt.EncryptSign');
goog.require('e2e.ext.utils');
goog.require('e2e.ext.utils.TabsHelperProxy');
goog.require('e2e.ext.utils.action');
goog.require('e2e.ext.utils.text');
goog.require('e2e.openpgp.asciiArmor');
goog.require('goog.dom');
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

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
asyncTestCase.stepTimeout = 2000;

var constants = e2e.ext.constants;
var launcher = null;
var mockControl = null;
var fakeStorage = null;
var panel = null;
var stubs = new goog.testing.PropertyReplacer();
var utils = e2e.ext.utils;


function setUp() {
  fakeStorage = new goog.testing.storage.FakeMechanism();
  mockControl = new goog.testing.MockControl();
  e2e.ext.testingstubs.initStubs(stubs);

  launcher = new e2e.ext.ExtensionLauncher(fakeStorage);
  launcher.start();
  stubs.setPath('chrome.runtime.getBackgroundPage', function(callback) {
    callback({launcher: launcher});
  });

  panel = new e2e.ext.ui.panels.prompt.EncryptSign(
      new e2e.ext.actions.Executor(goog.nullFunction),
      'irrelevant',
      launcher.getPreferences(),
      goog.nullFunction);

  if (!goog.dom.getElement(constants.ElementId.CALLBACK_DIALOG)) {
    var dialogHolder = document.createElement('div');
    dialogHolder.id = constants.ElementId.CALLBACK_DIALOG;
    document.body.appendChild(dialogHolder);
  }
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
  goog.dispose(panel);
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

var USER_ID_2_EMAIL = 'adhintz@google.com';

var USER_ID_2 = 'Drew Hintz <' + USER_ID_2_EMAIL + '>';

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

var ORIGIN = 'http://example.com';

var PLAINTEXT = 'dummy message';


function testRenderEncryptionPassphraseDialog() {
  var passphrase = 'test_passphrase';
  panel.setContentInternal({
    request: true,
    selection: 'irrelevant'
  });
  panel.render(document.body);
  panel.renderEncryptionPassphraseDialog_();

  assertContains(
      'promptEncryptionPassphraseMessage', document.body.textContent);

  var popupElem = goog.dom.getElement(constants.ElementId.CALLBACK_DIALOG);
  // Enter the passphrase.
  popupElem.querySelector('input').value = passphrase;
  goog.dom.getElementByClass(constants.CssClass.ACTION, popupElem).click();
  // Confirm the passphrase.
  popupElem.querySelector('input').value = passphrase;
  goog.dom.getElementByClass(constants.CssClass.ACTION, popupElem).click();

  assertEquals(1, panel.chipHolder_.getChildCount());
  assertEquals(passphrase, panel.chipHolder_.children_[0].getValue());

  panel.renderEncryptionPassphraseDialog_();
  popupElem.querySelector('input').value = passphrase;
  goog.dom.getElementByClass(constants.CssClass.CANCEL, popupElem).click();
  assertEquals(1, panel.chipHolder_.getChildCount());
}


function testRenderReply() {
  var textArea = document.createElement('textarea');
  var expected =
      '\n\npromptEncryptSignReplyHeader:\n\n> 123 456 7890 12 3456 7890';
  panel.renderReply_(textArea, '123 456 7890 12 3456 7890');
  assertEquals(expected, textArea.value);
}


function testSaveDraftIntoPage() {
  var encrypted = 'header\n\nencrypted message';
  var subject = 'some subject';

  var encryptCb = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  stubs.setPath('e2e.ext.actions.EncryptSign.prototype.execute',
      mockControl.createFunctionMock('encryptSign'));
  e2e.ext.actions.EncryptSign.prototype.execute(
      goog.testing.mockmatchers.ignoreArgument,
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertEquals(PLAINTEXT, arg.content);
        return true;
      }),
      panel,
      encryptCb,
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));

  stubs.replace(e2e.ext.utils.text, 'extractValidEmail', function(recipient) {
    if (recipient == USER_ID) {
      return recipient;
    }
    return null;
  });

  var helperProxy = new e2e.ext.utils.TabsHelperProxy(false);

  stubs.replace(panel, 'getParent', function() {
    return {
      'getHelperProxy' : function() { return helperProxy; }
    };
  });

  stubs.replace(helperProxy, 'updateSelectedContent',
      mockControl.createFunctionMock('updateSelectedContent'));
  var contentArg = new goog.testing.mockmatchers.SaveArgument(goog.isString);
  var subjectArg = new goog.testing.mockmatchers.SaveArgument(function(a) {
    return (!goog.isDef(a) || goog.isString(a));
  });
  helperProxy.updateSelectedContent(contentArg, [], ORIGIN, false,
      goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument, subjectArg);

  mockControl.$replayAll();
  panel.setContentInternal({
    request: true,
    selection: PLAINTEXT,
    recipients: [USER_ID],
    origin: ORIGIN,
    subject: subject,
    canInject: true
  });
  panel.render(document.body);
  textArea = document.querySelector('textarea');
  assertEquals(PLAINTEXT, textArea.value);
  subjectInput = document.getElementById(constants.ElementId.SUBJECT);
  assertEquals(subject, subjectInput.value);

  panel.saveDraft_(ORIGIN, {});
  encryptCb.arg(encrypted);
  assertTrue(e2e.openpgp.asciiArmor.isDraft(contentArg.arg));
  assertContains('encrypted message', contentArg.arg);
  assertEquals(subject, subjectArg.arg);
  mockControl.$verifyAll();
}


function testLoadDraftFromPage() {
  var encrypted = 'header\n\nencrypted message';

  var decryptCb = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  stubs.setPath('e2e.ext.actions.DecryptVerify.prototype.execute',
      mockControl.createFunctionMock('decryptVerify'));
  e2e.ext.actions.DecryptVerify.prototype.execute(
      goog.testing.mockmatchers.ignoreArgument,
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertEquals(
            e2e.openpgp.asciiArmor.markAsDraft(encrypted), arg.content);
        return true;
      }),
      panel,
      decryptCb,
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));

  stubs.setPath('e2e.ext.utils.text.getPgpAction',
      mockControl.createFunctionMock());
  e2e.ext.utils.text.getPgpAction(goog.testing.mockmatchers.ignoreArgument).
      $returns(constants.Actions.DECRYPT_VERIFY).$atLeastOnce();

  mockControl.$replayAll();

  panel.setContentInternal({
    request: true,
    selection: e2e.openpgp.asciiArmor.markAsDraft(encrypted)
  });
  panel.render(document.body);

  decryptCb.arg(PLAINTEXT);
  assertEquals(PLAINTEXT, document.querySelector('textarea').value);
  mockControl.$verifyAll();
}


function testSaveDraftNoKeys() {
  stubs.set(e2e.ext.utils.action, 'updateSelectedContent',
      mockControl.createFunctionMock('updateSelectedContent'));

  var encryptErrorCb =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  stubs.setPath('e2e.ext.actions.EncryptSign.prototype.execute',
      mockControl.createFunctionMock('encryptSign'));
  e2e.ext.actions.EncryptSign.prototype.execute(
      goog.testing.mockmatchers.ignoreArgument,
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertEquals(PLAINTEXT, arg.content);
        return true;
      }),
      panel,
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction),
      encryptErrorCb);

  mockControl.$replayAll();

  panel.setContentInternal({
    request: true,
    selection: PLAINTEXT,
    recipients: [],
    origin: ORIGIN
  });
  panel.render(document.body);

  textArea = document.querySelector('textarea');
  assertEquals(PLAINTEXT, textArea.value);

  panel.saveDraft_(ORIGIN, {type: 'click'});
  encryptErrorCb.arg(new utils.Error('', 'promptNoEncryptionTarget'));
  assertEquals(PLAINTEXT, textArea.value);
  mockControl.$verifyAll();
}


function testFocusWithRecipients() {
  stubs.replace(panel.actionExecutor_, 'execute',
      function(ignore, ignore2, callback) {
        // Mock a public keyring with USER_ID_2 key.
        var mockResults = {};
        mockResults[USER_ID_2] = [{uids: USER_ID_2}];
        callback(mockResults);
      });
  panel.setContentInternal({
    request: true,
    selection: PLAINTEXT,
    recipients: [USER_ID_2_EMAIL],
    origin: ORIGIN
  });
  panel.render(document.body);
  asyncTestCase.waitForAsync('Waiting for rendering to finish.');
  asyncTestCase.timeout(function() {
    textArea = document.querySelector('textarea');
    assertEquals(PLAINTEXT, textArea.value);
    assertEquals(1, panel.chipHolder_.getChildCount());
    assertTrue(panel.getElement().querySelector('textarea') ===
        document.activeElement);
    asyncTestCase.continueTesting();
  }, 50);
}


function testFocusNoRecipients() {
  stubs.replace(panel.actionExecutor_, 'execute',
      function(ignore, ignore2, callback) {
        callback({});
      });
  panel.setContentInternal({
    request: true,
    selection: PLAINTEXT,
    recipients: [],
    origin: ORIGIN
  });
  panel.render(document.body);
  asyncTestCase.waitForAsync('Waiting for rendering to finish.');
  asyncTestCase.timeout(function() {
    textArea = document.querySelector('textarea');
    assertEquals(PLAINTEXT, textArea.value);
    assertEquals(0, panel.chipHolder_.getChildCount());
    assertTrue(panel.chipHolder_.shadowInputElem_ === document.activeElement);
    asyncTestCase.continueTesting();
  }, 50);
}


function testOnlyExactAddressesMatch() {
  launcher.getContext().importKey(goog.nullFunction, PUBLIC_KEY_ASCII_2);
  launcher.getContext().importKey(goog.nullFunction, PUBLIC_KEY_ASCII_2_EVIL);

  asyncTestCase.waitForAsync('Waiting for keys to be populated.');
  asyncTestCase.timeout(function() {
    panel.setContentInternal({
      request: true,
      selection: PLAINTEXT,
      recipients: ['adhintz@google.com', 'a!weird@email.com']
    });
    panel.render(document.body);
    assertEquals(1, panel.chipHolder_.getChildCount());
    assertEquals(USER_ID_2,
        panel.chipHolder_.children_[0].getValue());
    asyncTestCase.continueTesting();
  }, 500);
}


function testUpdateButtonTextNoSend() {
  panel.setContentInternal({
    request: true,
    selection: PLAINTEXT,
    recipients: [],
    origin: ORIGIN,
    canInject: true
  });
  stubs.replace(panel, 'canSend_', function() {
    return false;
  });
  panel.render(document.body);
  asyncTestCase.waitForAsync('Waiting for rendering to finish.');
  asyncTestCase.timeout(function() {
    assertContains(
        'promptEncryptSignInsertLabel', document.body.textContent);
    asyncTestCase.continueTesting();
  }, 50);
}


function testUpdateButtonTextSend() {
  panel.setContentInternal({
    request: true,
    selection: PLAINTEXT,
    recipients: [],
    origin: ORIGIN,
    canInject: true
  });
  stubs.replace(panel, 'canSend_', function() {
    return true;
  });
  panel.render(document.body);
  asyncTestCase.waitForAsync('Waiting for rendering to finish.');
  asyncTestCase.timeout(function() {
    assertNotContains(
        'promptEncryptSignInsertLabel', document.body.textContent);
    assertContains(
        'promptEncryptSignSendLabel', document.body.textContent);
    asyncTestCase.continueTesting();
  }, 50);
}
