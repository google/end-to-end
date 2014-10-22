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
 *
 * @fileoverview Description of this file.
 *
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.panels.KeyringMgmtFullTest');

goog.require('e2e.ext.constants');
goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.ui.panels.KeyringMgmtFull');
goog.require('e2e.ext.ui.panels.KeyringMgmtMini');
goog.require('goog.array');
goog.require('goog.dom.classlist');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var constants = e2e.ext.constants;
var mockControl = null;
var panel = null;
var stubs = new goog.testing.PropertyReplacer();
var testCase = goog.testing.AsyncTestCase.createAndInstall();


function setUp() {
  mockControl = new goog.testing.MockControl();
  e2e.ext.testingstubs.initStubs(stubs);

  panel = new e2e.ext.ui.panels.KeyringMgmtFull(
      {}, goog.abstractMethod, goog.abstractMethod, goog.abstractMethod,
      goog.abstractMethod, goog.abstractMethod, goog.abstractMethod);
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
  goog.dispose(panel);
  panel = null;
}


function testRender() {
  panel.render(document.body);
  assertNotNull(document.querySelector('table'));
}


function testAddAndRemoveKey() {
  panel.render(document.body);
  assertNotContains('test@example.com', document.body.textContent);

  panel.addNewKey('test@example.com', []);
  assertContains('test@example.com', document.body.textContent);

  panel.removeKey('test@example.com');
  assertNotContains('test@example.com', document.body.textContent);
}


function testDuplicateKey() {
  panel.render(document.body);
  panel.addNewKey('test+hasplus@example.com', []);
  panel.addNewKey('test+hasplus@example.com', []);
  assertEquals(
      document.body.textContent.match(/test\+hasplus@example\.com/g).length, 1);
}


function testPassThrough() {
  stubs.replace(
      e2e.ext.ui.panels.KeyringMgmtMini.prototype,
      'setKeyringEncrypted',
      mockControl.createFunctionMock('setKeyringEncrypted'));
  stubs.replace(
      e2e.ext.ui.panels.KeyringMgmtMini.prototype,
      'reset',
      mockControl.createFunctionMock('reset'));
  e2e.ext.ui.panels.KeyringMgmtMini.prototype.setKeyringEncrypted(true);
  e2e.ext.ui.panels.KeyringMgmtMini.prototype.reset();

  mockControl.$replayAll();
  panel.setKeyringEncrypted(true);
  panel.resetControls();
  mockControl.$verifyAll();
}


function testGetKeysDescription() {
  var keys = panel.getKeysDescription_([{
    key: {
      secret: false,
      algorithm: 'ECDH',
      fingerprint: []
    },
    subKeys: [{
      secret: false,
      algorithm: 'ECDH',
      fingerprint: []
    }]
  }]);
  assertEquals(2, keys.length);
  assertEquals('publicKeyDescription', keys[0].type);
  assertEquals('publicSubKeyDescription', keys[1].type);
}


function testHandleClick() {
  panel = new e2e.ext.ui.panels.KeyringMgmtFull(
      {},
      goog.abstractMethod,
      goog.abstractMethod,
      goog.abstractMethod,
      goog.abstractMethod,
      mockControl.createFunctionMock('exportKeyCallback_'),
      mockControl.createFunctionMock('removeKeyCallback_'));

  panel.render(document.body);
  panel.addNewKey('test@example.com', []);

  panel.exportKeyCallback_('test@example.com');
  panel.removeKeyCallback_('test@example.com');
  mockControl.$replayAll();

  goog.array.forEach(
      panel.getElementsByClass(constants.CssClass.EXPORT), function(icon) {
        icon.click();
      });
  goog.array.forEach(
      panel.getElementsByClass(constants.CssClass.REMOVE), function(icon) {
        icon.click();
      });
  testCase.waitForAsync('waiting clicks to go through');
  window.setTimeout(function() {
    testCase.continueTesting();
    mockControl.$verifyAll();
  }, 500);
}


function testEmptyKeyring() {
  panel.render(document.body);

  // buttons enabled on key add
  panel.addNewKey('test@example.com', []);
  assertFalse(panel.getElementByClass(constants.CssClass.KEYRING_EXPORT)
      .hasAttribute('disabled'));
  assertFalse(goog.dom.classlist.contains(
      panel.getElementByClass(constants.CssClass.KEYRING_BACKUP),
      e2e.ext.constants.CssClass.HIDDEN));
  assertTrue(goog.dom.classlist.contains(
      panel.getElementByClass(constants.CssClass.KEYRING_RESTORE),
      e2e.ext.constants.CssClass.HIDDEN));


  // removing only key disables buttons
  panel.removeKey('test@example.com');
  assertTrue(panel.getElementByClass(constants.CssClass.KEYRING_EXPORT)
      .hasAttribute('disabled'));
  assertTrue(goog.dom.classlist.contains(
      panel.getElementByClass(constants.CssClass.KEYRING_BACKUP),
      e2e.ext.constants.CssClass.HIDDEN));
  assertFalse(goog.dom.classlist.contains(
      panel.getElementByClass(constants.CssClass.KEYRING_RESTORE),
      e2e.ext.constants.CssClass.HIDDEN));
}
