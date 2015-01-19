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
 * @fileoverview Unit tests for the End-To-End launcher.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.LauncherTest');

goog.require('e2e.ext.ExtensionLauncher');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.testingstubs');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.storage.FakeMechanism');
goog.setTestOnly();

var constants = e2e.ext.constants;
var launcher = null;
var mockControl = null;
var mockmatchers = goog.testing.mockmatchers;
var stubs = new goog.testing.PropertyReplacer();
var fakeStorage;


function setUp() {
  fakeStorage = new goog.testing.storage.FakeMechanism();
  mockControl = new goog.testing.MockControl();
  e2e.ext.testingstubs.initStubs(stubs);

  launcher = new e2e.ext.ExtensionLauncher(fakeStorage);
  launcher.getPreferences().setWelcomePageEnabled(false);
  launcher.start();
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
  launcher = null;
}


function testGetSelectedContent() {
  var injectedScript = false;
  stubs.replace(chrome.tabs, 'executeScript', function(a, b, callback) {
    injectedScript = true;
    callback();
  });

  var sentMessage = false;
  stubs.replace(chrome.tabs, 'sendMessage', function(tabId) {
    assertNotUndefined(tabId);
    sentMessage = true;
  });

  launcher.getSelectedContent(function() {});
  assertTrue('Failed to inject content script', injectedScript);
  assertTrue(
      'Failed to query content script for selected content', sentMessage);

}


function testUpdateSelectedContent() {
  var content = 'some text';
  var origin = 'http://www.example.com';
  var recipients = ['a@example.com'];
  var executeScriptArg = new mockmatchers.SaveArgument(goog.isFunction);
  stubs.setPath('chrome.tabs.executeScript',
      mockControl.createFunctionMock('executeScript'));
  chrome.tabs.executeScript(mockmatchers.ignoreArgument,
      mockmatchers.ignoreArgument, executeScriptArg);

  var messageArg = new mockmatchers.SaveArgument();
  stubs.setPath('chrome.tabs.sendMessage', function(tabId, msg, callback)  {
    assertEquals(msg.value, content);
    assertEquals(msg.origin, origin);
    assertArrayEquals(msg.recipients, recipients);
    callback(true);
  });

  var callbackMock = mockControl.createFunctionMock('callbackMock');
  callbackMock(true);

  mockControl.$replayAll();

  launcher.updateSelectedContent(content, recipients, origin, false,
      callbackMock);
  executeScriptArg.arg();
  mockControl.$verifyAll();
}


function testBadPassphrase() {
  var storage = new goog.testing.storage.FakeMechanism();
  var l1 = new e2e.ext.ExtensionLauncher(storage);
  l1.start('somesecret');
  // generate a key to ensure the keyring isn't empty.
  l1.getContext().generateKey(
      'ECDSA', 256, 'ECDH', 256, 'name', '', 'n@e.c', 253402243200);
  assertThrows('Wrong passphrase should throw exception.', function() {
    var l2 = new e2e.ext.ExtensionLauncher(storage);
    l2.start('fail');
  });
}


function testStart() {
  var passphrase = 'test';
  stubs.set(launcher.pgpContext_, 'setKeyRingPassphrase',
      mockControl.createFunctionMock('setKeyRingPassphrase'));
  launcher.pgpContext_.setKeyRingPassphrase(passphrase);

  stubs.set(launcher.preferences_, 'initDefaults',
      mockControl.createFunctionMock('initDefaults'));
  launcher.preferences_.initDefaults();

  stubs.set(launcher, 'showWelcomeScreen',
      mockControl.createFunctionMock('showWelcomeScreen'));
  launcher.showWelcomeScreen();

  stubs.set(launcher, 'updatePassphraseWarning',
      mockControl.createFunctionMock('updatePassphraseWarning'));
  launcher.updatePassphraseWarning();

  stubs.set(launcher.ctxApi_, 'installApi',
      mockControl.createFunctionMock('installApi'));
  launcher.ctxApi_.installApi();

  mockControl.$replayAll();

  launcher.start(passphrase);
  assertTrue(launcher.started_);

  mockControl.$verifyAll();
}


function testGetLastTab() {
  var tabId = 123;
  var tabs = [{id: tabId}];

  stubs.replace(chrome.tabs, 'query', function(req, callback) {
    callback(tabs);
  });

  stubs.replace(chrome.tabs, 'executeScript', function(a, b, callback) {
    callback();
  });

  var returnedIds = 0;
  launcher.getActiveTab(function(returnedId) {
    assertEquals(tabId, returnedId);
    returnedIds++;
    tabs.splice(0, tabs.length);
  });

  launcher.getActiveTab(function(returnedId) {
    assertEquals(tabId, returnedId);
    returnedIds++;
  });

  assertEquals(2, returnedIds);
}


function testShowWelcomeScreenEnabled() {
  var openedWindow = false;
  stubs.replace(window, 'open', function() {
    openedWindow = true;
  });

  launcher.getPreferences().setWelcomePageEnabled(true);
  launcher.start();
  assertTrue('Failed to open the welcome screen', openedWindow);
}


function testShowWelcomeScreenDisabled() {
  var openedWindow = false;
  stubs.replace(window, 'open', function() {
    openedWindow = true;
  });

  launcher.getPreferences().setWelcomePageEnabled(false);
  launcher.start();
  assertFalse('Incorrectly opening the welcome screen', openedWindow);
}
