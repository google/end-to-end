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
 * @fileoverview Unit tests for the UI prompt.
 */

goog.require('e2e.ext.Launcher');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.ui.Dialog');
goog.require('e2e.ext.ui.Prompt');
goog.require('e2e.ext.ui.draftmanager');
goog.require('e2e.ext.ui.preferences');
goog.require('e2e.openpgp.asciiArmor');
goog.require('goog.Timer');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.KeyCodes');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
asyncTestCase.stepTimeout = 2000;
var constants = e2e.ext.constants;
var drafts = e2e.ext.ui.draftmanager;
var mockControl = null;
var preferences = e2e.ext.ui.preferences;
var prompt = null;
var stubs = new goog.testing.PropertyReplacer();


function setUp() {
  window.localStorage.clear();
  mockControl = new goog.testing.MockControl();

  stubs.setPath('chrome.browserAction.setBadgeText', function() {});
  stubs.setPath('chrome.browserAction.setTitle', function() {});
  stubs.setPath('chrome.i18n.getMessage', function(msg) {
    return msg;
  });
  stubs.setPath('chrome.extension.getURL', function() {});
  stubs.setPath('chrome.notifications.create', function() {});
  stubs.setPath('chrome.runtime.getBackgroundPage', function() {});
  stubs.setPath('chrome.runtime.onConnect.addListener', function() {});
  stubs.setPath('chrome.runtime.onConnect.removeListener', function() {});
  stubs.setPath('chrome.tabs.query', function() {});
  stubs.setPath('chrome.tabs.onUpdated.addListener', function() {});
  stubs.setPath('chrome.tabs.onRemoved.addListener', function() {});
  stubs.setPath('window.confirm', function(msg) { return true;});

  stubs.replace(goog.Timer.prototype, 'start', function() {});
  stubs.replace(window, 'open', function() {});

  prompt = new e2e.ext.ui.Prompt();
  //localStorage.clear();
  prompt.pgpLauncher_ = new e2e.ext.Launcher();
  prompt.pgpLauncher_.start();

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
      e2e.ext.Launcher.prototype, 'getSelectedContent', function() {
        queriedForSelectedContent = true;
      });

  stubs.replace(chrome.runtime, 'getBackgroundPage', function(callback) {
    callback({launcher: new e2e.ext.Launcher()});
  });

  prompt.decorate(document.documentElement);
  assertTrue('Failed to query for selected content', queriedForSelectedContent);
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

  assertEquals(
      'Failed to render menu', 4, elem.querySelectorAll('ul>li').length);
}


function testDisposeOnClose() {
  prompt.close();
  assertTrue('Failed to dispose prompt', prompt.isDisposed());
}


function testGetTitle() {
  stubs.replace(chrome.i18n, 'getMessage', function(msgId) {
    return msgId;
  });
  assertEquals('promptEncryptSignTitle',
      prompt.getTitle_(e2e.ext.constants.Actions.ENCRYPT_SIGN));
  assertEquals('promptDecryptVerifyTitle',
      prompt.getTitle_(e2e.ext.constants.Actions.DECRYPT_VERIFY));
  assertEquals('promptImportKeyTitle',
      prompt.getTitle_(e2e.ext.constants.Actions.IMPORT_KEY));
  assertEquals('actionUserSpecified',
      prompt.getTitle_(e2e.ext.constants.Actions.USER_SPECIFIED));
  assertEquals('actionUnlockKeyring',
      prompt.getTitle_(e2e.ext.constants.Actions.GET_PASSPHRASE));
}


function testGetEncryptKeys() {
  stubs.replace(window, 'close', function(arg) {});
  prompt.pgpLauncher_.getContext().importKey(function() {}, PUBLIC_KEY_ASCII);
  var keys = prompt.getEncryptKeys_([USER_ID]);
  assertEquals(1, keys.length);
  keys = prompt.getEncryptKeys_([USER_ID, USER_ID, 'Does not exist']);
  assertEquals(2, keys.length);
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


function testEncryptAndDecrypt() {
  var plaintext = 'a secret message';

  populatePgpKeys();
  asyncTestCase.waitForAsync('Waiting for keys to be populated.');
  window.setTimeout(function() {
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
      var textArea = document.querySelector('textarea');
      var encrypted = textArea.value;
      assertContains('-----BEGIN PGP MESSAGE-----', encrypted);
      assertTrue(textArea.disabled);

      prompt.processSelectedContent_({
        request: true,
        selection: encrypted
      }, constants.Actions.DECRYPT_VERIFY);
      asyncTestCase.waitForAsync('Waiting for text to be decrypted.');

      var decryptBtn = document.querySelector('button.action');
      decryptBtn.click();

      window.setTimeout(function() {
        asyncTestCase.continueTesting();
        assertEquals(
            '', goog.dom.getElement(constants.ElementId.ERROR_DIV).textContent);
        assertEquals(plaintext, document.querySelector('textarea').value);
      }, 500);
    }, 500);
  }, 500);
}


function testEncryptForSigner() {
  var plaintext = 'a secret message';

  populatePgpKeys();
  prompt.pgpLauncher_.getContext().importKey(function() {}, PUBLIC_KEY_ASCII_2);
  asyncTestCase.waitForAsync('Waiting for keys to be populated.');
  window.setTimeout(function() {
    prompt.decorate(document.documentElement);
    prompt.processSelectedContent_({
      request: true,
      selection: plaintext,
      // Specify a recipient so it's not sign-only:
      recipients: ['Drew Hintz <adhintz@google.com>']
    }, constants.Actions.ENCRYPT_SIGN);
    goog.dom.getElement(constants.ElementId.SIGN_MESSAGE_CHECK).checked = true;

    var protectBtn = document.querySelector('button.action');
    protectBtn.click();

    asyncTestCase.waitForAsync('Waiting for message to be encrypted.');
    window.setTimeout(function() {
      var encrypted = document.querySelector('textarea').value;
      assertContains('-----BEGIN PGP MESSAGE-----', encrypted);

      prompt.processSelectedContent_({
        request: true,
        selection: encrypted
      }, constants.Actions.DECRYPT_VERIFY);
      asyncTestCase.waitForAsync('Waiting for text to be decrypted.');

      var notificationMsg = '';
      stubs.replace(chrome.i18n, 'getMessage', function(a) {
        return '%s';
      });
      stubs.replace(
          e2e.ext.Launcher.prototype,
          'showNotification',
          function(a, callback) {
            notificationMsg = a;
            callback();
          });
      var decryptBtn = document.querySelector('button.action');
      decryptBtn.click();

      window.setTimeout(function() {
        asyncTestCase.continueTesting();
        // No signature verification error.
        var errorDiv = document.getElementById(constants.ElementId.ERROR_DIV);
        assertEquals('', errorDiv.textContent);
        // User ID from signature in notification message.
        assertContains(USER_ID, notificationMsg);
        assertEquals(
            '', goog.dom.getElement(constants.ElementId.ERROR_DIV).textContent);
        assertEquals(plaintext, document.querySelector('textarea').value);
      }, 500);
    }, 500);
  }, 500);
}

function testEncryptForPassphrase() {
  var plaintext = 'a secret message';
  var passphrase = 'a passphrase';
  populatePgpKeys();
  prompt.pgpLauncher_.getContext().importKey(function() {}, PUBLIC_KEY_ASCII_2);
  asyncTestCase.waitForAsync('Waiting for keys to be populated.');
  window.setTimeout(function() {
    prompt.decorate(document.documentElement);
    prompt.processSelectedContent_({
      request: true,
      selection: plaintext,
      recipients: []
    }, constants.Actions.ENCRYPT_SIGN);
    goog.dom.getElement(constants.ElementId.SIGN_MESSAGE_CHECK).checked = true;
    goog.dom.getElement(constants.ElementId.PASSPHRASE_ENCRYPTION_LINK).click();
    var popupElem = goog.dom.getElement(constants.ElementId.CALLBACK_DIALOG);
    // Enter the passphrase.
    popupElem.querySelector('input').value = passphrase;
    goog.dom.getElementByClass(constants.CssClass.ACTION, popupElem).click();
    // Confirm the passphrase.
    popupElem.querySelector('input').value = passphrase;
    goog.dom.getElementByClass(constants.CssClass.ACTION, popupElem).click();
    var protectBtn = document.querySelector('button.action');
    protectBtn.click();
    asyncTestCase.waitForAsync('Waiting for message to be encrypted.');
    window.setTimeout(function() {
      var encrypted = document.querySelector('textarea').value;
      assertContains('-----BEGIN PGP MESSAGE-----', encrypted);

      prompt.processSelectedContent_({
        request: true,
        selection: encrypted
      }, constants.Actions.DECRYPT_VERIFY);
      asyncTestCase.waitForAsync('Waiting for text to be decrypted.');
      stubs.replace(
        e2e.ext.ui.Prompt.prototype,
        'renderPassphraseCallback_',
        function(uid, callback) {
          fail('Should not ask for passphrase on decryption.');
      });
      var decryptBtn = document.querySelector('button.action');
      decryptBtn.click();
      window.setTimeout(function() {
        asyncTestCase.continueTesting();
        // No signature verification error.
        var errorDiv = document.getElementById(constants.ElementId.ERROR_DIV);
        assertEquals('', errorDiv.textContent);
        assertEquals(
            '', goog.dom.getElement(constants.ElementId.ERROR_DIV).textContent);
        assertEquals(plaintext, document.querySelector('textarea').value);

      }, 500);
    }, 500);
  }, 500);
}


function testClearSign() {
  var plaintext = 'a clearsigned message';

  populatePgpKeys();
  prompt.pgpLauncher_.getContext().importKey(function() {}, PUBLIC_KEY_ASCII_2);
  asyncTestCase.waitForAsync('Waiting for keys to be populated.');
  window.setTimeout(function() {
    prompt.decorate(document.documentElement);
    prompt.processSelectedContent_({
      request: true,
      selection: plaintext,
      recipients: [] // No recipient, no passphrase: expect clearsigned message.
    }, constants.Actions.ENCRYPT_SIGN);
    goog.dom.getElement(constants.ElementId.SIGN_MESSAGE_CHECK).checked = true;

    var protectBtn = document.querySelector('button.action');
    protectBtn.click();

    asyncTestCase.waitForAsync('Waiting for message to be encrypted.');
    window.setTimeout(function() {
      asyncTestCase.continueTesting();
      var encrypted = document.querySelector('textarea').value;
      assertContains('-----BEGIN PGP SIGNED MESSAGE-----', encrypted);
      assertContains('-----BEGIN PGP SIGNATURE-----', encrypted);
    }, 500);
  }, 500);
}

function testContentInsertedOnEncrypt() {
  var plaintext = 'irrelevant';
  var origin = 'http://www.example.com';

  stubs.set(prompt.pgpLauncher_, 'updateSelectedContent',
      mockControl.createFunctionMock('updateSelectedContent'));
  var encryptedMsg = new goog.testing.mockmatchers.SaveArgument(goog.isString);
  prompt.pgpLauncher_.updateSelectedContent(encryptedMsg, [USER_ID], origin,
      false, goog.testing.mockmatchers.ignoreArgument);

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
      canInject: true
    }, constants.Actions.ENCRYPT_SIGN);

    var protectBtn = document.querySelector('button.action');
    protectBtn.click();

    asyncTestCase.waitForAsync('Waiting for message to be encrypted.');
    window.setTimeout(function() {
      asyncTestCase.continueTesting();
      var insertBtn = document.querySelector('button.insert');
      insertBtn.click();

      assertContains('-----BEGIN PGP MESSAGE-----', encryptedMsg.arg);
      mockControl.$verifyAll();
    }, 500);
  }, 500);
}


function testDisplayFailure() {
  prompt.decorate(document.documentElement);
  var errorDiv = document.getElementById(constants.ElementId.ERROR_DIV);

  prompt.displayFailure_(new Error('test failure'));
  assertEquals('test failure', errorDiv.textContent);
}


function testDisplaySuccess() {
  var notifiedUser = false;
  stubs.replace(
      e2e.ext.Launcher.prototype,
      'showNotification',
      function(a, callback) {
        notifiedUser = true;
        callback();
      });

  prompt.decorate(document.documentElement);

  var calledCallback = false;
  prompt.displaySuccess_('irrelevant', function() {
    calledCallback = true;
  });

  assertTrue('Failed to notify user', notifiedUser);
  assertTrue('Failed to invoke callback', calledCallback);
}


function testSelectAction() {
  var elem = document.createElement('div');
  elem.setAttribute('action', 'test_action');

  var processedContent = false;
  stubs.replace(
      e2e.ext.ui.Prompt.prototype,
      'processSelectedContent_',
      function(blob, action) {
        assertEquals('Failed to select action', 'test_action', action);
        processedContent = true;
      });

  prompt.selectAction_(null, {target: elem});

  assertTrue('Failed to process content', processedContent);
}


function testIfNoPassphrase() {
  prompt.pgpLauncher_ = new e2e.ext.Launcher();
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

  stubs.set(window, 'close', mockControl.createFunctionMock('close'));
  window.close();

  mockControl.$replayAll();

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_(null, constants.Actions.GET_PASSPHRASE);

  assertFalse(goog.dom.classes.has(
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
  prompt.pgpLauncher_.start(passphrase).$throws(new Error('irrlevant'));

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


function testRenderPassphraseCallback() {
  stubs.replace(chrome.i18n, 'getMessage', function() {
    return '%s';
  });
  prompt.decorate(document.body);
  prompt.renderPassphraseCallback_('test_uid', function() {});

  assertContains('test_uid', document.body.textContent);
}


function testRenderEncryptionPassphraseDialog() {
  var passphrase = 'test_passphrase';
  prompt.pgpLauncher_ = new e2e.ext.Launcher();
  prompt.pgpLauncher_.start(passphrase);
  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_({
    request: true,
    selection: 'irrelevant'
  }, constants.Actions.ENCRYPT_SIGN);
  prompt.renderEncryptionPassphraseDialog_();

  assertContains(
      'promptEncryptionPassphraseMessage', document.body.textContent);

  var popupElem = goog.dom.getElement(constants.ElementId.CALLBACK_DIALOG);
  // Enter the passphrase.
  popupElem.querySelector('input').value = passphrase;
  goog.dom.getElementByClass(constants.CssClass.ACTION, popupElem).click();
  // Confirm the passphrase.
  popupElem.querySelector('input').value = passphrase;
  goog.dom.getElementByClass(constants.CssClass.ACTION, popupElem).click();

  assertEquals(1, prompt.chipHolder_.getChildCount());
  assertEquals(passphrase, prompt.chipHolder_.children_[0].getValue());

  prompt.renderEncryptionPassphraseDialog_();
  popupElem.querySelector('input').value = passphrase;
  goog.dom.getElementByClass(constants.CssClass.CANCEL, popupElem).click();
  assertEquals(1, prompt.chipHolder_.getChildCount());
}


function testClose() {
  var closedWindow = false;
  stubs.replace(window, 'close', function() {
    closedWindow = true;
  });

  prompt.decorate(document.body);
  prompt.close();

  assertTrue(prompt.isDisposed());
  assertTrue(closedWindow);

  goog.array.forEach(
      document.querySelectorAll('textarea,input'), function(elem) {
        assertEquals('', elem.value);
      });
}


function testConfigureExtension() {
  var openedSettings = false;
  stubs.replace(window, 'open', function() {
    openedSettings = true;
  });

  var closedPrompt = false;
  stubs.replace(window, 'close', function() {
    closedPrompt = true;
  });

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_(null, constants.Actions.CONFIGURE_EXTENSION);

  assertTrue('Failed to open setting page', openedSettings);
  assertTrue('Failed to close prompt UI', closedPrompt);
}


function testNoOp() {
  stubs.set(prompt, 'close', mockControl.createFunctionMock());
  prompt.close();

  mockControl.$replayAll();

  prompt.decorate(document.documentElement);
  prompt.processSelectedContent_(null, constants.Actions.NO_OP);

  mockControl.$verifyAll();
}


function testRenderReply() {
  var textArea = document.createElement('textarea');
  var expected =
      '\n\npromptEncryptSignReplyHeader:\n\n> 123 456 7890 12 3456 7890';
  prompt.renderReply_(textArea, '123 456 7890 12 3456 7890');
  assertEquals(expected, textArea.value);
}


function testSaveDraft() {
  var plaintext = 'a secret message';
  var origin = 'http://www.example.com';

  stubs.set(prompt.pgpLauncher_, 'updateSelectedContent',
      mockControl.createFunctionMock('updateSelectedContent'));
  var contentArg = new goog.testing.mockmatchers.SaveArgument(goog.isString);
  prompt.pgpLauncher_.updateSelectedContent(contentArg, [], origin, true,
      goog.testing.mockmatchers.ignoreArgument);

  mockControl.$replayAll();
  populatePgpKeys();

  asyncTestCase.waitForAsync('Waiting for keys to be populated.');
  window.setTimeout(function() {
    prompt.decorate(document.documentElement);
    prompt.processSelectedContent_({
      request: true,
      selection: plaintext,
      recipients: [USER_ID],
      origin: origin
    }, constants.Actions.ENCRYPT_SIGN);
    textArea = document.querySelector('textarea');
    assertEquals(plaintext, textArea.value);

    prompt.saveDraft_(origin, {type: 'click'});

    asyncTestCase.waitForAsync('Waiting for draft to be generated.');
    window.setTimeout(function() {
      asyncTestCase.continueTesting();
      assertTrue(e2e.openpgp.asciiArmor.isDraft(contentArg.arg));

      prompt.processSelectedContent_({
        request: true,
        selection: contentArg.arg
      });
      window.setTimeout(function() {
        textArea = document.querySelector('textarea');
        assertNotContains('-----BEGIN PGP MESSAGE-----', textArea.value);
        assertEquals(plaintext, textArea.value);
        assertNull(window.localStorage.getItem(
            constants.StorageKey.LAST_SAVED_DRAFT));
        mockControl.$verifyAll();
      }, 500);
    }, 500);

  }, 500);
}


function testSaveDraftLocalStorage() {
  var plaintext = 'a secret message';
  var origin = 'http://www.example.com';

  stubs.set(prompt.pgpLauncher_, 'updateSelectedContent',
      mockControl.createFunctionMock('updateSelectedContent'));

  mockControl.$replayAll();
  populatePgpKeys();

  asyncTestCase.waitForAsync('Waiting for keys to be populated.');
  window.setTimeout(function() {
    prompt.decorate(document.documentElement);
    prompt.processSelectedContent_({
      request: true,
      selection: plaintext,
      recipients: [USER_ID],
      origin: origin
    }, constants.Actions.ENCRYPT_SIGN);
    textArea = document.querySelector('textarea');
    assertEquals(plaintext, textArea.value);

    prompt.saveDraft_(origin, {type: 'non-click'});

    asyncTestCase.waitForAsync('Waiting for draft to be generated.');
    window.setTimeout(function() {
      assertTrue(e2e.openpgp.asciiArmor.isDraft(drafts.getDraft(origin)));

      prompt.processSelectedContent_({
        request: true,
        selection: '',
        origin: origin
      });

      for (var childIdx = 0; childIdx < prompt.getChildCount(); childIdx++) {
        var child = prompt.getChildAt(childIdx);
        if (child instanceof e2e.ext.ui.Dialog) {
          child.dialogCallback_('');
        }
      }

      asyncTestCase.waitForAsync('Waiting for draft to be loaded.');
      window.setTimeout(function() {
        asyncTestCase.continueTesting();
        textArea = document.querySelector('textarea');
        assertNotContains('-----BEGIN PGP MESSAGE-----', textArea.value);
        assertEquals(plaintext, textArea.value);
        mockControl.$verifyAll();
      }, 500);
    }, 500);

  }, 500);
}


function testDiscardSavedDraft() {
  var plaintext = 'a secret message';
  var origin = 'http://www.example.com';

  stubs.set(prompt.pgpLauncher_, 'updateSelectedContent',
      mockControl.createFunctionMock('updateSelectedContent'));

  mockControl.$replayAll();
  populatePgpKeys();

  asyncTestCase.waitForAsync('Waiting for keys to be populated.');
  window.setTimeout(function() {
    prompt.decorate(document.documentElement);
    prompt.processSelectedContent_({
      request: true,
      selection: plaintext,
      recipients: [USER_ID],
      origin: origin
    }, constants.Actions.ENCRYPT_SIGN);
    textArea = document.querySelector('textarea');
    assertEquals(plaintext, textArea.value);

    prompt.saveDraft_(origin, {type: 'non-click'});

    asyncTestCase.waitForAsync('Waiting for draft to be generated.');
    window.setTimeout(function() {
      asyncTestCase.continueTesting();
      assertTrue(e2e.openpgp.asciiArmor.isDraft(drafts.getDraft(origin)));

      prompt.processSelectedContent_({
        request: true,
        selection: '',
        origin: origin
      });

      for (var childIdx = 0; childIdx < prompt.getChildCount(); childIdx++) {
        var child = prompt.getChildAt(childIdx);
        if (child instanceof e2e.ext.ui.Dialog) {
          child.dialogCallback_();
        }
      }

      textArea = document.querySelector('textarea');
      assertNotContains('-----BEGIN PGP MESSAGE-----', textArea.value);
      assertEquals('', textArea.value);
      assertFalse(drafts.hasDraft(origin));
      mockControl.$verifyAll();
    }, 500);
  }, 500);
}



function testSaveDraftNoKeys() {
  var plaintext = 'a secret message';
  var origin = 'http://www.example.com';
  stubs.set(prompt.pgpLauncher_, 'updateSelectedContent',
      mockControl.createFunctionMock('updateSelectedContent'));

  stubs.setPath('e2e.ext.ui.Dialog',
      mockControl.createConstructorMock(e2e.ext.ui, 'Dialog'));
  var callbackArg = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  e2e.ext.ui.Dialog('promptNoEncryptionKeysFound',
      callbackArg,
      e2e.ext.ui.Dialog.InputType.NONE);

  stubs.replace(goog, 'dispose', mockControl.createFunctionMock('dispose'));
  var disposeArg = new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    return arg instanceof e2e.ext.ui.Dialog;
  });
  goog.dispose(disposeArg);

  mockControl.$replayAll();
  prompt.decorate(document.documentElement);

  prompt.processSelectedContent_({
    request: true,
    selection: plaintext,
    recipients: [],
    origin: origin
  }, constants.Actions.ENCRYPT_SIGN);
  textArea = document.querySelector('textarea');
  assertEquals(plaintext, textArea.value);

  prompt.saveDraft_(origin, {type: 'click'});
  assertEquals(plaintext, textArea.value);
  assertEquals('', drafts.getDraft(origin));
  callbackArg.arg();
  mockControl.$verifyAll();
}


function populatePgpKeys() {
  var ctx = prompt.pgpLauncher_.getContext();
  ctx.importKey(function(uid, callback) {
    console.debug(arguments);
    callback('test');
  }, PRIVATE_KEY_ASCII);

  ctx.importKey(function() {}, PUBLIC_KEY_ASCII);
}
