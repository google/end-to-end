/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
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
 * @fileoverview Tests for the HelperProxy.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.utils.HelperProxyTest');

goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.utils.TabsHelperProxy');
goog.require('e2e.ext.utils.WebviewHelperProxy');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');

goog.setTestOnly();

var mockControl = null;
var mockmatchers = goog.testing.mockmatchers;
var stubs = new goog.testing.PropertyReplacer();
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
var proxy;

function setUp() {
  mockControl = new goog.testing.MockControl();
  e2e.ext.testingstubs.initStubs(stubs);
  proxy = new e2e.ext.utils.TabsHelperProxy(false);
  stubs.replace(chrome.tabs, 'executeScript', function(a, b, callback) {
    callback(['object']); // Simulate that the script is already present.
  });
  stubs.setPath('chrome.runtime.getBackgroundPage', function(cb) {
    cb();
  });
}

function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
}

function testGetSelectedContentTabs() {
  var givenTabId = 1337;
  proxy = new e2e.ext.utils.TabsHelperProxy(false, givenTabId);
  var mockResult = {
    test: 'true'
  };

  var injectedScript = false;
  stubs.replace(chrome.tabs, 'executeScript', function(a, b, callback) {
    if (b.file == 'helper_binary.js') {
      injectedScript = true;
    }
    callback(['undefined']); // Simulate script is not present yet.
  });

  stubs.replace(chrome.tabs, 'sendMessage', function(tabId, message, cb) {
    assertEquals(givenTabId, tabId);
    assertTrue('enableLookingGlass' in message);
    cb(mockResult);
  });

  asyncTestCase.waitForAsync('waiting for callback');
  proxy.getSelectedContent(function(aResult) {
    assertTrue('Failed to inject content script', injectedScript);
    assertEquals(mockResult, aResult);
    asyncTestCase.continueTesting();
  }, fail);
}

function testGetSelectedContentTabsSecondTime() {
  var proxy = new e2e.ext.utils.TabsHelperProxy(false);

  stubs.replace(chrome.tabs, 'executeScript', function(a, b, callback) {
    assertFalse('file' in b);
    callback(['object']); // Simulate that the script is already present.
  });

  stubs.replace(chrome.tabs, 'sendMessage', function(tabId, message, cb) {
    assertEquals(e2e.ext.testingstubs.TAB_ID, tabId);
    assertTrue('enableLookingGlass' in message);
    cb();
  });

  asyncTestCase.waitForAsync('waiting for callback');
  proxy.getSelectedContent(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testTabsEmptyResponseTriggersError() {
  stubs.setPath('chrome.runtime.lastError', new Error('test error'));
  stubs.replace(chrome.tabs, 'sendMessage', function(tabId, message, cb) {
    cb(); // Return with no results will check chrome.runtime.lastError
  });

  asyncTestCase.waitForAsync('waiting for callback');
  proxy.getSelectedContent(fail, function(error) {
    assertTrue(error instanceof Error);
    assertEquals('test error', error.message);
    asyncTestCase.continueTesting();
  });
}


function testTabsErrorResponseTriggersError() {
  stubs.replace(chrome.tabs, 'sendMessage', function(tabId, message, cb) {
    cb(new Error('test error')); // Return error
  });

  asyncTestCase.waitForAsync('waiting for callback');
  proxy.getSelectedContent(fail, function(error) {
    assertTrue(error instanceof Error);
    assertEquals('test error', error.message);
    asyncTestCase.continueTesting();
  });
}


function testTabsErrorResponseTriggersError() {
  stubs.replace(chrome.tabs, 'sendMessage', function(tabId, message, cb) {
    cb(new Error('test error')); // Return error
  });

  asyncTestCase.waitForAsync('waiting for callback');
  proxy.getSelectedContent(fail, function(error) {
    assertTrue(error instanceof Error);
    assertEquals('test error', error.message);
    asyncTestCase.continueTesting();
  });
}


function testFailureToExecuteScriptTriggersError() {
  stubs.replace(chrome.tabs, 'executeScript', function(tabId, codeParams, cb) {
    stubs.setPath('chrome.runtime.lastError', new Error('test error'));
    cb();
  });

  asyncTestCase.waitForAsync('waiting for callback');
  proxy.getSelectedContent(fail, function(error) {
    assertTrue(error instanceof Error);
    assertEquals('test error', error.message);
    stubs.replace(chrome.tabs, 'executeScript',
        function(tabId, codeParams, cb) {
          stubs.setPath('chrome.runtime.lastError', undefined);
          // No lastError, but undefined results.
          cb();
        });
    asyncTestCase.waitForAsync('waiting for 2nd callback');
    proxy.getSelectedContent(fail, function(error) {
      assertTrue(error instanceof Error);
      assertEquals('Content script injection failed.', error.message);
      asyncTestCase.continueTesting();
    });
  });
}


function testFailureToGetActiveTabTriggersError() {
  stubs.setPath('chrome.tabs.query', function(params, cb) {
    cb([]);
  });

  asyncTestCase.waitForAsync('waiting for callback');
  proxy.getSelectedContent(fail, function(error) {
    assertTrue(error instanceof Error);
    assertEquals('Cannot determine the active tab.', error.message);
    asyncTestCase.continueTesting();
  });
}


function testGetSelectedContentWebview() {
  var webview = {};
  var proxy = new e2e.ext.utils.WebviewHelperProxy(false, webview);
  var injectedScript = false;
  var messageSent = false;
  var listenerAttached = false;
  var listenerFunction = null;
  var testResponse = 'test-response';

  stubs.setPath('chrome.runtime.onMessage.hasListener', function() {
    return false;
  });
  stubs.setPath('chrome.runtime.onMessage.addListener', function(cb) {
    listenerAttached = true;
    listenerFunction = cb;
  });

  stubs.set(webview, 'executeScript', function(callParams, callback) {
    if (callParams.file == 'helper_binary.js') {
      injectedScript = true;
    }
    if (callParams.code && callParams.code.indexOf('handleAppRequest') >= 0) {
      messageSent = true;
      assertTrue(goog.isFunction(listenerFunction));
      listenerFunction({
        requestId: proxy.pendingCallbacks_.getKeys()[0],
        response: testResponse
      }, {id: e2e.ext.testingstubs.RUNTIME_ID});
    }
    if (goog.isFunction(callback)) {
      callback(['undefined']); // Simulate script is not present yet.
    }
  });

  asyncTestCase.waitForAsync('Get selected content');
  proxy.getSelectedContent(function(response) {
    assertTrue('s', injectedScript);
    assertTrue('Failed to query content script for selected content',
        messageSent);
    assertTrue('Failed to attach message listener', listenerAttached);
    assertEquals(testResponse, response);
    asyncTestCase.continueTesting();
  });
}


function testUpdateSelectedContentWebview() {
  var webview = {};
  var proxy = new e2e.ext.utils.WebviewHelperProxy(false, webview);
  var messageSent = false;
  var listenerAttached = false;
  var listenerFunction = null;
  var testResponse = 'test-response';
  var content = 'some text';
  var origin = 'http://www.example.com';
  var recipients = ['a@example.com'];

  stubs.replace(proxy, 'sendMessageImpl', function(payload, cb, errorCb) {
    assertEquals(content, payload.value);
    assertEquals(origin, payload.origin);
    assertArrayEquals(recipients, payload.recipients);
    cb();
  });
  stubs.setPath('chrome.runtime.onMessage.hasListener', function() {
    return true;
  });
  stubs.set(webview, 'executeScript', function(callParams, callback) {
    if (goog.isFunction(callback)) {
      callback(['undefined']);
    }
  });

  asyncTestCase.waitForAsync('Update selected content');
  proxy.updateSelectedContent(content, recipients, origin, false,
      function(response) {
        asyncTestCase.continueTesting();
      });
}



function testHelperNotInjectedTwiceWebview() {
  var webview = {};
  var proxy = new e2e.ext.utils.WebviewHelperProxy(false, webview);
  var messageSent = false;
  var listenerAttached = false;
  var listenerFunction = null;
  var testResponse = 'test-response';
  var content = 'some text';
  var origin = 'http://www.example.com';
  var recipients = ['a@example.com'];

  stubs.replace(proxy, 'sendMessageImpl', function(payload, cb, errorCb) {
    cb();
  });
  stubs.setPath('chrome.runtime.onMessage.hasListener', function() {
    return true;
  });
  stubs.set(webview, 'executeScript', function(callParams, callback) {
    if (callParams.file == 'helper_binary.js') {
      fail();
    }
    if (goog.isFunction(callback)) {
      callback(['object']);
    }
  });

  asyncTestCase.waitForAsync('Update selected content');
  proxy.updateSelectedContent(content, recipients, origin, false,
      function(response) {
        asyncTestCase.continueTesting();
      });
}


function testWebsiteRequests() {
  var webview = {};
  var extensionId = 123;
  stubs.setPath('chrome.runtime.id', extensionId);
  var proxy = new e2e.ext.utils.WebviewHelperProxy(false, webview);
  var req = {
    request: true,
    id: 'foo'
  };
  proxy.setWebsiteRequestHandler(function(request) {
    assertObjectEquals(req, request);
    asyncTestCase.continueTesting();
  });
  asyncTestCase.waitForAsync('Waiting for request processing');
  proxy.boundListener_(req, {id: extensionId});
}
