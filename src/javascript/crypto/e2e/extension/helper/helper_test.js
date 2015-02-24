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
 * @fileoverview Unit tests for the End-To-End helper.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.HelperTest');

goog.require('e2e.ext.Helper');
goog.require('e2e.ext.WebsiteApi');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.utils.text');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers.ArgumentMatcher');
goog.require('goog.testing.mockmatchers.SaveArgument');
goog.setTestOnly();

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
var constants = e2e.ext.constants;
var helper = null;
var mockControl = null;
var stubs = new goog.testing.PropertyReplacer();
var api;

function setUp() {
  api = new e2e.ext.WebsiteApi();

  mockControl = new goog.testing.MockControl();

  stubs.setPath('chrome.runtime.getURL', function() {});
  stubs.setPath('chrome.runtime.onMessage.addListener', function() {});
  stubs.setPath('chrome.runtime.onMessage.removeListener', function() {});

  helper = new e2e.ext.Helper(api);
}


function tearDown() {
  stubs.reset();
  helper = null;
  api = null;
  mockControl.$tearDown();
}

function testSetValue() {
  var elem = goog.dom.getElement('testDiv');
  stubs.set(api, 'lastActiveElement_', elem);

  helper.setValue_({
    recipients: [],
    response: true,
    send: true,
    value: '<b>\n</b>',
    origin: helper.getOrigin_()
  }, function(isSuccess) {
    assertTrue(isSuccess);
  });

  assertEquals('<b>\n</b>', elem.innerText);
}

function testErrorHandler() {
  var called = false;
  stubs.replace(console, 'error', function() {
    called = true;
  });
  helper.setValue_({
    recipients: [],
    response: true,
    send: true,
    value: '<b>\n</b>',
    origin: helper.getOrigin_()
  }, function(error) {
    assertTrue(error instanceof Error);
    assertTrue(called);
  });
}

function testDisplay() {
  var selectionBody = 'some text';
  var recipients = ['test@example.com'];

  stubs.set(api, 'getSelectedContent', mockControl.createFunctionMock());
  var getSelectedContentArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  var getSelectedContentArg2 =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);

  api.getSelectedContent(getSelectedContentArg, getSelectedContentArg2);

  var callbackMock = mockControl.createFunctionMock();
  var callbackArg =
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertEquals(constants.Actions.ENCRYPT_SIGN, arg.action);
        assertEquals(selectionBody, arg.selection);
        assertTrue(goog.array.equals(recipients, arg.recipients));

        return true;
      });

  callbackMock(callbackArg);

  mockControl.$replayAll();

  helper.getSelectedContent_({
    pgpAction: 'irrelevant'
  }, callbackMock);

  getSelectedContentArg.arg(recipients, selectionBody, true);

  mockControl.$verifyAll();
}

function testOrigin() {
  assertEquals(window.location.origin, helper.getOrigin_());
}

function testEnableLookingGlass() {
  var selectionBody = 'some text';
  var elemId = 'some-id';
  var elemSelector = '#some-id';

  stubs.set(api, 'getCurrentMessage', mockControl.createFunctionMock());
  var getCurrentMessageArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  var getCurrentMessageArg2 =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);

  api.getCurrentMessage(getCurrentMessageArg, getCurrentMessageArg2);

  stubs.setPath(
      'e2e.ext.utils.text.getPgpAction', mockControl.createFunctionMock());
  e2e.ext.utils.text.getPgpAction(selectionBody)
      .$returns(constants.Actions.DECRYPT_VERIFY);

  stubs.setPath('chrome.runtime.getURL', mockControl.createFunctionMock());
  chrome.runtime.getURL('glass.html');

  stubs.set(helper, 'getOrigin_', function() {
    return 'https://mail.google.com';
  });

  mockControl.$replayAll();

  helper.enableLookingGlass_();

  var contentElem = document.createElement('div');
  document.body.appendChild(contentElem);
  contentElem.id = elemId;
  contentElem.innerText = selectionBody;
  getCurrentMessageArg.arg(elemSelector);
  assertNotNull(contentElem.querySelector('iframe'));
  mockControl.$verifyAll();
  document.body.removeChild(contentElem);
}

function testWebsiteRequests() {
  stubs.setPath('chrome.runtime.sendMessage', function(target, message) {
    assertEquals('test', target);
    assertEquals('body', message.selection);
    assertEquals(location.origin, message.origin);
    assertEquals(true, message.canSaveDraft);
    assertEquals(true, message.canInject);
    assertEquals('test subject', message.subject);
    assertEquals(true, message.request);
    assertArrayEquals(['example@example.com'], message.recipients);
    helper.disableWebsiteRequests();
    assertNull(helper.api_.websiteRequestForwarder_);
    asyncTestCase.continueTesting();
  });
  stubs.setPath('chrome.runtime.id', 'test');

  helper.enableWebsiteRequests();
  asyncTestCase.waitForAsync('Waiting for request processing');
  helper.api_.websiteRequestForwarder_({
    id: 'foo',
    call: 'openCompose',
    args: {
      body: 'body',
      recipients: ['example@example.com'],
      subject: 'test subject'
    }
  });
}
