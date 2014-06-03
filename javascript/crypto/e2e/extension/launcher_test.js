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
 * @fileoverview Unit tests for the End-To-End launcher.
 */

goog.require('e2e.ext.Launcher');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.ui.preferences');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');

var constants = e2e.ext.constants;
var launcher = null;
var mockControl = null;
var mockmatchers = goog.testing.mockmatchers;
var preferences = e2e.ext.ui.preferences;
var stubs = new goog.testing.PropertyReplacer();


function setUp() {
  mockControl = new goog.testing.MockControl();

  stubs.setPath('chrome.browserAction.setBadgeText', function() {});
  stubs.setPath('chrome.browserAction.setTitle', function() {});
  stubs.setPath('chrome.i18n.getMessage', function() {});
  stubs.setPath('chrome.notifications.clear', function() {});
  stubs.setPath('chrome.notifications.create', function() {});
  stubs.setPath('chrome.runtime.onConnect.addListener', function() {});
  stubs.setPath('chrome.runtime.onConnect.removeListener', function() {});
  stubs.setPath('chrome.tabs.onUpdated.addListener', function() {});
  stubs.setPath('chrome.tabs.onRemoved.addListener', function() {});
  stubs.setPath('chrome.tabs.executeScript', function() {});
  stubs.setPath('chrome.tabs.query', function(req, callback) {
    callback([{id: 1}]);
  });
  stubs.setPath('chrome.tabs.sendMessage', function() {});
  localStorage.clear();
  launcher = new e2e.ext.Launcher();
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
  var executeScriptArg = new mockmatchers.SaveArgument(goog.isFunction);
  stubs.setPath('chrome.tabs.executeScript',
      mockControl.createFunctionMock('executeScript'));
  chrome.tabs.executeScript(mockmatchers.ignoreArgument,
      mockmatchers.ignoreArgument, executeScriptArg);

  var messageArg = new mockmatchers.SaveArgument();
  var tabIdArg = new mockmatchers.ArgumentMatcher(goog.isNumber);
  stubs.setPath('chrome.tabs.sendMessage',
      mockControl.createFunctionMock('sendMessage'));
  chrome.tabs.sendMessage(tabIdArg, messageArg);

  var callbackMock = mockControl.createFunctionMock('callbackMock');
  callbackMock();

  mockControl.$replayAll();

  launcher.updateSelectedContent(content, [], origin, false, callbackMock);
  executeScriptArg.arg();
  assertEquals('Sending incorrect content', content, messageArg.arg.value);
  mockControl.$verifyAll();
}


function testBadPassphrase() {
  localStorage.clear();
  var l1 = new e2e.ext.Launcher();
  l1.start('somesecret');
  // generate a key to ensure the keyring isn't empty.
  l1.getContext().generateKey(
      'ECDSA', 256, 'ECDH', 256, 'name', '', 'n@e.c', 253402243200);
  assertThrows('Wrong passphrase should throw exception.', function() {
    var l2 = new e2e.ext.Launcher();
    l2.start('fail');
  });
  localStorage.clear();
}


function testStart() {
  var passphrase = 'test';
  stubs.set(launcher.pgpContext_, 'setKeyRingPassphrase',
      mockControl.createFunctionMock('setKeyRingPassphrase'));
  launcher.pgpContext_.setKeyRingPassphrase(passphrase);

  stubs.setPath('e2e.ext.ui.preferences.initDefaults',
      mockControl.createFunctionMock('initDefaults'));
  e2e.ext.ui.preferences.initDefaults();

  stubs.set(launcher, 'showWelcomeScreen_',
      mockControl.createFunctionMock('showWelcomeScreen_'));
  launcher.showWelcomeScreen_();

  stubs.set(launcher, 'updatePassphraseWarning_',
      mockControl.createFunctionMock('updatePassphraseWarning_'));
  launcher.updatePassphraseWarning_();

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
  launcher.getActiveTab_(function(returnedId) {
    assertEquals(tabId, returnedId);
    returnedIds++;
    tabs.splice(0, tabs.length);
  });

  launcher.getActiveTab_(function(returnedId) {
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

  window.localStorage.removeItem(constants.StorageKey.DISABLE_WELCOME_SCREEN);

  launcher.start();
  assertTrue('Failed to open the welcome screen', openedWindow);
}


function testShowWelcomeScreenDisabled() {
  var openedWindow = false;
  stubs.replace(window, 'open', function() {
    openedWindow = true;
  });

  preferences.setWelcomePageEnabled(false);
  launcher.start();
  assertFalse('Incorrectly opening the welcome screen', openedWindow);
}


function testShowNotification() {
  stubs.replace(window, 'setTimeout', function(callback) {
    callback();
  });

  var notifiedUser = false;
  stubs.replace(chrome.notifications, 'create', function(a, b, callback) {
    notifiedUser = true;
    callback();
  });

  var dismissedNotification = false;
  stubs.replace(chrome.notifications, 'clear', function() {
    dismissedNotification = true;
  });

  var calledCallback = false;
  launcher.showNotification('irrelevant', function() {
    calledCallback = true;
  });

  assertTrue('Failed to notify user', notifiedUser);
  assertTrue('Failed to invoke callback', calledCallback);
  assertTrue('Failed to dismiss notification', dismissedNotification);
}
