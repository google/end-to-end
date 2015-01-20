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
 * @fileoverview Tests for the common utility methods.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.utilsTest');

goog.require('e2e.ext.constants');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.utils');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers.ArgumentMatcher');
goog.require('goog.testing.mockmatchers.SaveArgument');
goog.setTestOnly();

var constants = e2e.ext.constants;
var mockControl = null;
var stubs = new goog.testing.PropertyReplacer();
var testCase = goog.testing.AsyncTestCase.createAndInstall();
var utils = e2e.ext.utils;


function setUp() {
  mockControl = new goog.testing.MockControl();
  e2e.ext.testingstubs.initStubs(stubs);
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
}


function testWrite() {
  var filename = 'temp1.txt';
  var content = 'some content';
  var createdFile = false;

  utils.writeToFile(content, function(fileUrl) {
    createdFile = true;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', fileUrl, false);
    xhr.send();
    assertEquals('Failed to store contents', content, xhr.responseText);
  });

  testCase.waitForAsync('waiting for file to be created');
  window.setTimeout(function() {
    assertTrue('Failed to create file', createdFile);
    testCase.continueTesting();
  }, 500);
}


function testRead() {
  var content = 'some content';
  var readFile = false;
  var file = new Blob([content], {type: 'text/plain'});
  testCase.waitForAsync('waiting for file to be read');
  utils.readFile(file, function(readContents) {
    readFile = true;
    assertEquals('Failed to read contents', content, readContents);
    testCase.continueTesting();
  });
}


function testShowNotification() {
  var delayedCb = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  stubs.replace(window, 'setTimeout', mockControl.createFunctionMock());
  window.setTimeout(delayedCb, constants.NOTIFICATIONS_DELAY);

  var notifiedCb = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  stubs.setPath(
      'chrome.notifications.create', mockControl.createFunctionMock());
  chrome.notifications.create(
      constants.ElementId.NOTIFICATION_SUCCESS,
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertEquals('some text', arg.message);
        return true;
      }),
      notifiedCb);

  stubs.setPath('chrome.notifications.clear', mockControl.createFunctionMock());
  chrome.notifications.clear(
      constants.ElementId.NOTIFICATION_SUCCESS, goog.nullFunction);

  var doneCb = mockControl.createFunctionMock();
  doneCb();

  mockControl.$replayAll();
  utils.showNotification('some text', doneCb);
  notifiedCb.arg();
  delayedCb.arg();
  mockControl.$verifyAll();
}


function testIsContentScript() {
  stubs.setPath('chrome.runtime', {
    getURL: goog.nullFunction
  });

  assertTrue(utils.isContentScript());

  stubs.setPath('chrome.runtime', {
    getURL: goog.nullFunction,
    getBackgroundPage: goog.nullFunction
  });

  assertFalse(utils.isContentScript());
}


function testIsChromeExtensionWindow() {
  var stubWindow = {};
  stubs.set(stubWindow, 'chrome', {
    runtime: {
      getManifest: function() {return {}}
    }
  });

  stubs.set(stubWindow, 'location', {
    protocol: 'chrome-extension:'
  });

  assertTrue(utils.isChromeExtensionWindow(stubWindow));
  assertFalse(utils.isChromeAppWindow(stubWindow));
  assertFalse(utils.isContentScript());
}

function testIsChromeAppWindow() {
  var stubWindow = {};
  stubs.set(stubWindow, 'chrome', {
    runtime: {
      getManifest: function() {return {app: {}}}
    }
  });

  stubs.set(stubWindow, 'location', {
    protocol: 'chrome-extension:'
  });

  assertTrue(utils.isChromeAppWindow(stubWindow));
  assertFalse(utils.isChromeExtensionWindow(stubWindow));
  assertFalse(utils.isContentScript());
}
