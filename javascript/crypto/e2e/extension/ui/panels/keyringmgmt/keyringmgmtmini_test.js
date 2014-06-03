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
 * @fileoverview Tests for the minimized keyring management UI.
 */

goog.require('e2e.ext.constants');
goog.require('e2e.ext.ui.panels.KeyringMgmtMini');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.testing.Mock');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');

var constants = e2e.ext.constants;
var panel = null;
var stubs = new goog.testing.PropertyReplacer();


function setUp() {
  mockControl = new goog.testing.MockControl();

  stubs.setPath('chrome.i18n.getMessage', function(msg) {
    return msg;
  });
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();

  goog.dispose(panel);
  panel = null;
}


function testRender() {
  panel = new e2e.ext.ui.panels.KeyringMgmtMini(
      goog.abstractMethod, goog.abstractMethod, goog.abstractMethod);
  panel.render(document.body);

  assertNotNull(document.querySelector('input[type="file"]'));
}


function testRenderWithoutExport() {
  panel = new e2e.ext.ui.panels.KeyringMgmtMini(
      goog.nullFunction, goog.abstractMethod, goog.abstractMethod);
  panel.render(document.body);

  assertTrue(goog.dom.classes.has(
      panel.getElementByClass(constants.CssClass.KEYRING_EXPORT),
      constants.CssClass.HIDDEN));
}


function testImportKeyring() {
  var filename = 'temp.asc';
  var importedFile = false;
  panel = new e2e.ext.ui.panels.KeyringMgmtMini(
      goog.abstractMethod, function(file) {
        assertEquals(file, filename);
        importedFile = true;
      }, goog.abstractMethod);
  panel.render(document.body);

  stubs.replace(HTMLDivElement.prototype, 'querySelector', function() {
    return {files: [filename]};
  });

  panel.importKeyring_();
  assertTrue(importedFile);
}


function testUpdateKeyringPassphrase() {
  var newPass = 'passphrase';
  var updatePassCallback = mockControl.createFunctionMock('updatePass');
  updatePassCallback(newPass);

  mockControl.$replayAll();

  panel = new e2e.ext.ui.panels.KeyringMgmtMini(
      goog.abstractMethod, goog.abstractMethod, updatePassCallback);
  panel.render(document.body);

  goog.dom.getElementByClass(
      constants.CssClass.PASSPHRASE,
      goog.dom.getElement(
          constants.ElementId.KEYRING_PASSPHRASE_CHANGE_DIV)).value = newPass;
  goog.dom.getElementByClass(
      constants.CssClass.PASSPHRASE,
      goog.dom.getElement(
          constants.ElementId.KEYRING_PASSPHRASE_CONFIRM_DIV)).value = newPass;
  panel.updateKeyringPassphrase_();

  mockControl.$verifyAll();
}


function testUpdateKeyringPassphraseMismatch() {
  stubs.replace(window, 'alert', mockControl.createFunctionMock('alert'));
  window.alert('keyMgmtPassphraseMismatchLabel');

  var updatePassCallback = mockControl.createFunctionMock('updatePass');

  mockControl.$replayAll();

  panel = new e2e.ext.ui.panels.KeyringMgmtMini(
      goog.abstractMethod, goog.abstractMethod, updatePassCallback);
  panel.render(document.body);

  goog.dom.getElementByClass(
      constants.CssClass.PASSPHRASE,
      goog.dom.getElement(
          constants.ElementId.KEYRING_PASSPHRASE_CHANGE_DIV)).value = 'value1';
  goog.dom.getElementByClass(
      constants.CssClass.PASSPHRASE,
      goog.dom.getElement(
          constants.ElementId.KEYRING_PASSPHRASE_CONFIRM_DIV)).value = 'value2';
  panel.updateKeyringPassphrase_();

  mockControl.$verifyAll();
}



function testSetKeyringEncrypted() {
  panel = new e2e.ext.ui.panels.KeyringMgmtMini(
      goog.abstractMethod, goog.abstractMethod, goog.abstractMethod);
  panel.render(document.body);

  panel.setKeyringEncrypted(true);
  assertContains('keyMgmtChangePassphraseLabel', document.body.textContent);
  assertNotContains('keyMgmtAddPassphraseLabel', document.body.textContent);

  panel.setKeyringEncrypted(false);
  assertContains('keyMgmtAddPassphraseLabel', document.body.textContent);
  assertNotContains('keyMgmtChangePassphraseLabel', document.body.textContent);
}


function testShowKeyringMgmtForm() {
  panel = new e2e.ext.ui.panels.KeyringMgmtMini(
      goog.abstractMethod, goog.abstractMethod, goog.abstractMethod);
  panel.render(document.body);

  var importDiv = goog.dom.getElement(constants.ElementId.KEYRING_IMPORT_DIV);
  var optionsDiv = goog.dom.getElement(
      constants.ElementId.KEYRING_OPTIONS_DIV);
  assertTrue(goog.dom.classes.has(importDiv, constants.CssClass.HIDDEN));

  panel.showKeyringMgmtForm_(constants.ElementId.KEYRING_IMPORT_DIV);
  assertTrue(goog.dom.classes.has(optionsDiv, constants.CssClass.HIDDEN));
  panel.showKeyringMgmtForm_(constants.ElementId.KEYRING_OPTIONS_DIV);
  assertTrue(goog.dom.classes.has(importDiv, constants.CssClass.HIDDEN));
}
