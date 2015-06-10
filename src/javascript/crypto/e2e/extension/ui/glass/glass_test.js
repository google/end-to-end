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
 * @fileoverview Tests for the looking glass.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.GlassTest');

goog.require('e2e.ext.constants');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.ui.Glass');
goog.require('e2e.random');
goog.require('goog.style');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.mockmatchers.ArgumentMatcher');
goog.require('goog.testing.mockmatchers.SaveArgument');
goog.setTestOnly();

var constants = e2e.ext.constants;
var mockControl = null;
var stubs = null;


function setUp() {
  stubs = new goog.testing.PropertyReplacer();
  mockControl = new goog.testing.MockControl();

  e2e.ext.testingstubs.initStubs(stubs);
  stubs.setPath('chrome.runtime.getURL', function() {
    return 'chrome-extension://abcd';
  });
  stubs.setPath('window.setTimeout', function(callback) {
    callback();
  });
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
}


function testRender() {
  var encryptedText = 'encrypted text';
  var plainText = 'plain text';

  var port = {
    onMessage: {
      addListener: mockControl.createFunctionMock('addListener')
    },
    onDisconnect: {
      addListener: mockControl.createFunctionMock('addListener')
    },
    disconnect: mockControl.createFunctionMock('disconnect'),
    postMessage: mockControl.createFunctionMock('postMessage')
  };

  var callbackArg = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  port.onMessage.addListener(callbackArg);
  port.disconnect();
  port.postMessage(new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    assertEquals(encryptedText, arg.content);
    assertEquals(constants.Actions.DECRYPT_VERIFY, arg.action);
    return true;
  }));
  port.onDisconnect.addListener(
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));

  stubs.setPath(
      'chrome.runtime.connect', mockControl.createFunctionMock('connect'));
  chrome.runtime.connect().$returns(port);

  stubs.setPath('e2e.random.getRandomBytes',
      mockControl.createFunctionMock('getRandomBytes'));
  e2e.random.getRandomBytes(1, [0]).$returns([1]).$times(2);

  mockControl.$replayAll();

  var glass = new e2e.ext.ui.Glass(encryptedText);
  glass.decorate(document.documentElement);
  callbackArg.arg({
    content: plainText
  });

  assertContains(plainText, document.body.innerText);
  goog.dispose(glass);
  mockControl.$verifyAll();
}


function testScroll() {
  var encryptedText = 'encrypted text';
  var plainText = 'plain text';
  var port = {
    onMessage: {
      addListener: mockControl.createFunctionMock('addListener')
    },
    onDisconnect: {
      addListener: mockControl.createFunctionMock('addListener')
    },
    disconnect: goog.nullFunction,
    postMessage: goog.nullFunction
  };

  var callbackArg = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  port.onMessage.addListener(callbackArg);
  port.disconnect();
  port.postMessage(goog.testing.mockmatchers.ignoreArgument);
  port.onDisconnect.addListener(
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));

  stubs.setPath(
      'chrome.runtime.connect', mockControl.createFunctionMock('connect'));
  chrome.runtime.connect().$returns(port);

  mockControl.$replayAll();

  var glass = new e2e.ext.ui.Glass(encryptedText);
  glass.decorate(document.documentElement);
  callbackArg.arg({
    content: plainText
  });

  var fieldset = document.querySelector('fieldset');
  goog.style.setStyle(fieldset, 'position', 'absolute');
  var originalPosition = goog.style.getPosition(fieldset);
  var originalY = originalPosition.y;

  glass.scroll_({deltaY: 5});
  var newPosition = goog.style.getPosition(fieldset);
  assertTrue(originalY > newPosition.y);
  goog.dispose(glass);

  mockControl.$verifyAll();
}
