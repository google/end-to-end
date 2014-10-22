/**
 * @license
 * Copyright 2014 Yahoo Inc. All rights reserved.
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
 * @fileoverview Tests for the wrapper of the e2ebind API.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.e2ebindTest');

goog.require('e2e.ext.Helper');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.constants.e2ebind.requestActions');
goog.require('e2e.ext.e2ebind');
goog.require('goog.asserts');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.mockmatchers.ArgumentMatcher');
goog.require('goog.testing.mockmatchers.SaveArgument');

goog.setTestOnly();

var actions = e2e.ext.constants.e2ebind.requestActions;
var api = null;
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
var constants = e2e.ext.constants;
var draft = null;
var e2ebind = e2e.ext.e2ebind;
var stubs = new goog.testing.PropertyReplacer();
var RECIPIENTS = ['test@example.com' , 't2@example.com', 'cc@example.com'];
var mockControl = null;
var providerRequestHandler = goog.nullFunction;


function setUp() {
  window.config = {};
  mockControl = new goog.testing.MockControl();

  stubs.setPath('chrome.runtime.getURL', function(filename) {
    return './' + filename;
  });
  document.documentElement.id = 'test_id';

  // Simulate the provider listener
  window.addEventListener('message', function(msg) {
    var data = window.JSON.parse(msg.data);
    if (msg.source === window.self &&
        data.api === 'e2ebind' &&
        data.source === 'E2E') {
      data.source = 'provider';
      data = providerRequestHandler(data);
      window.postMessage(JSON.stringify(data), window.location.origin);
    }
  });

  draft = {
    to: 'test@example.com, "we <ird>>\'>, <a@a.com>, n<ess" <t2@example.com>' +
        ', "inv\"<alid <invalid@example.com>, fails#e2e.regexp.vali@dation.com',
    cc: 'cc@example.com',
    bcc: 'bcc@example.com',
    body: 'some text<br>with new<br>lines',
    from: 'yan@example.com',
    subject: 'encrypted msg'
  };
}


function tearDown() {
  stubs.reset();
  e2ebind.stop_();
  window.helper = null;
  window.onmessage = null;
}


function testStart() {
  assertEquals(undefined, e2ebind.messagingTable);
  e2ebind.start();
  goog.asserts.assertInstanceof(e2ebind.messagingTable,
                                e2ebind.MessagingTable_);
}


function testMessagingTableAddAndGet() {
  var mt = new e2ebind.MessagingTable_();
  var action = 'irrelevant';
  var hash = mt.add(action, goog.nullFunction);
  var entry = mt.get(hash, action);
  assertEquals(entry.action, action);
  assertEquals(entry.callback, goog.nullFunction);
}


function testIsStarted() {
  assertFalse(e2ebind.isStarted());
  e2ebind.started_ = true;
  assertTrue(e2ebind.isStarted());
}


function testE2ebindIconClick() {
  var clickHandled = false;

  stubs.replace(e2ebind, 'sendExtensionRequest_', function(request, cb) {
    if (request.action === constants.Actions.GET_KEYRING_UNLOCKED) {
      cb({content: true, completedAction: request.action});
    }
  });
  stubs.replace(e2ebind, 'hasDraft', function() {
    clickHandled = true;
  });

  e2ebind.start();

  var icon = document.createElement('div');
  icon.id = constants.ElementId.E2EBIND_ICON;
  document.body.appendChild(icon);
  icon.click();

  asyncTestCase.waitForAsync('Waiting for e2ebind icon click handler.');
  window.setTimeout(function() {
    assertTrue(clickHandled);
    asyncTestCase.continueTesting();
  }, 500);
}


function testSendRequest() {
  var action = 'irrelevant';

  providerRequestHandler = function(data) {
    return data;
  };

  stubs.set(e2ebind, 'messageHandler_', function(response) {
    var data = window.JSON.parse(response.data);

    if (data.source === 'E2E') { return; }

    assertEquals(window.self, response.source);
    assertEquals('e2ebind', data.api);
    assertEquals('provider', data.source);

    e2ebind.handleProviderResponse_(data);
  });


  e2ebind.start();

  asyncTestCase.waitForAsync('Waiting for request to be sent by e2ebind');
  e2ebind.sendRequest(action, null, function(response) {
    asyncTestCase.continueTesting();
  });
}


function testProviderRequestToStart() {
  var signer = 'irrelevant';
  stubs.replace(e2ebind, 'validateSigner_', mockControl.createFunctionMock());

  var validateSignerArg = new goog.testing.mockmatchers.ArgumentMatcher(
      function(arg) {
        assertEquals(signer, arg);
        return true;
      });
  var callbackArg = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);

  e2ebind.validateSigner_(validateSignerArg, callbackArg);

  mockControl.$replayAll();

  e2ebind.handleProviderRequest_({
    action: actions.START,
    args: {signer: signer, version: 0, read_glass_enabled: true}
  });

  assertTrue(e2ebind.started_);
  assertEquals(window.config.signer, signer);
  assertEquals(window.config.version, '0');
  assertTrue(window.config.read_glass_enabled);
  assertFalse(window.config.compose_glass_enabled);

  mockControl.$verifyAll();
}


function testProviderRequestToInstallReadGlass() {
  window.config.read_glass_enabled = true;
  window.valid = true;
  e2ebind.started_ = true;
  window.helper = new e2e.ext.Helper();

  var s1 = '#s1';
  var s2 = '#s2';
  var div1 = document.createElement('div');
  var div2 = document.createElement('div');
  div1.id = 's1';
  div2.id = 's2';
  var text1 = '-----BEGIN PGP MESSAGE-----';
  var text2 = 'foo';
  document.body.appendChild(div1);
  document.body.appendChild(div2);

  stubs.replace(e2ebind, 'sendResponse_', mockControl.createFunctionMock());
  var successArg = new goog.testing.mockmatchers.ArgumentMatcher(
      function(arg) {
        assertTrue(arg);
        return true;
      });
  var requestArg = new goog.testing.mockmatchers.ArgumentMatcher(
      function(arg) {
        assertEquals(actions.INSTALL_READ_GLASS, arg.action);
        return true;
      });
  e2ebind.sendResponse_(goog.testing.mockmatchers.ignoreArgument,
                        requestArg, successArg);

  mockControl.$replayAll();

  e2ebind.handleProviderRequest_({
    action: actions.INSTALL_READ_GLASS,
    args: {messages: [{elem: s1, text: text1}, {elem: s2, text: text2}]}
  });

  assertEquals(div1.lookingGlass.originalText_, text1);
  assertEquals(div2.lookingGlass, undefined);
  div1.lookingGlass.disposeInternal();
  mockControl.$verifyAll();
}


function testProviderRequestToSetSigner() {
  var signer = 'yzhu@yahoo-inc.com';
  e2ebind.started_ = true;

  stubs.replace(e2ebind, 'validateSigner_', function(s, cb) {
    cb(s === signer);
  });

  stubs.replace(e2ebind, 'sendResponse_', mockControl.createFunctionMock());
  var successArg = new goog.testing.mockmatchers.ArgumentMatcher(
      function(arg) {
        assertTrue(arg);
        return true;
      });
  var validityArg = new goog.testing.mockmatchers.ArgumentMatcher(
      function(arg) {
        assertTrue(arg.valid);
        return true;
      });
  e2ebind.sendResponse_(validityArg, goog.testing.mockmatchers.ignoreArgument,
                        successArg);
  mockControl.$replayAll();

  e2ebind.handleProviderRequest_({
    action: actions.SET_SIGNER,
    args: {signer: signer}
  });

  assertEquals(signer, window.config.signer);
  assertTrue(window.valid);
  mockControl.$verifyAll();
}


function testProviderRequestToValidateSigner() {
  var signer = 'yzhu@yahoo-inc.com';
  e2ebind.started_ = true;

  stubs.replace(e2ebind, 'sendExtensionRequest_', function(request, cb) {
    var response = {};
    response.completedAction = request.action;
    if (request.action === constants.Actions.LIST_ALL_UIDS &&
        request.content === 'private') {
      response.content = ['yzhu@yahoo-inc.com', 'yan@example.com'];
    }
    cb(response);
  });
  stubs.replace(e2ebind, 'sendResponse_', mockControl.createFunctionMock());
  var successArg = new goog.testing.mockmatchers.ArgumentMatcher(
      function(arg) {
        assertTrue(arg);
        return true;
      });
  var validityArg = new goog.testing.mockmatchers.ArgumentMatcher(
      function(arg) {
        assertTrue(arg.valid);
        return true;
      });
  e2ebind.sendResponse_(validityArg, goog.testing.mockmatchers.ignoreArgument,
                        successArg);
  mockControl.$replayAll();

  e2ebind.handleProviderRequest_({
    action: actions.VALIDATE_SIGNER,
    args: {signer: signer}
  });
  mockControl.$verifyAll();
}


function testProviderRequestToValidateRecipients() {
  e2ebind.started_ = true;
  window.valid = true;

  stubs.replace(e2ebind, 'sendExtensionRequest_', function(request, cb) {
    var response = {};
    response.completedAction = request.action;
    if (request.action === constants.Actions.LIST_ALL_UIDS &&
        request.content === 'public') {
      response.content = ['yzhu@yahoo-inc.com', 'yan@example.com',
        'cc@example.com'];
    }
    cb(response);
  });
  stubs.replace(e2ebind, 'sendResponse_', mockControl.createFunctionMock());

  var successArg = new goog.testing.mockmatchers.ArgumentMatcher(
      function(arg) {
        assertTrue(arg);
        return true;
      });
  var resultsArg = new goog.testing.mockmatchers.ArgumentMatcher(
      function(arg) {
        assertArrayEquals(arg.results,
                          [{valid: false, recipient: 'test@example.com'},
                           {valid: false, recipient: 't2@example.com'},
                           {valid: true, recipient: 'cc@example.com'}]);
        return true;
      });
  e2ebind.sendResponse_(resultsArg, goog.testing.mockmatchers.ignoreArgument,
                        successArg);
  mockControl.$replayAll();

  e2ebind.handleProviderRequest_({
    action: actions.VALIDATE_RECIPIENTS,
    args: {recipients: RECIPIENTS}
  });
  mockControl.$verifyAll();
}


function testGetCurrentMessage() {
  var action = constants.e2ebind.responseActions.GET_CURRENT_MESSAGE;
  var text = 'some text';

  providerRequestHandler = function(data) {
    data.success = true;
    data.result = {text: text};
    return data;
  };

  e2ebind.start();

  asyncTestCase.waitForAsync('waiting for e2ebind to get current message');
  e2ebind.getCurrentMessage(function(response) {
    assertEquals(response.text, text);
    asyncTestCase.continueTesting();
  });
}


function testHasDraft() {
  var action = constants.e2ebind.responseActions.HAS_DRAFT;
  providerRequestHandler = function(data) {
    data.success = true;
    data.result = {has_draft: true};
    return data;
  };

  e2ebind.start();

  asyncTestCase.waitForAsync('waiting for hasDraft');
  e2ebind.hasDraft(function(response) {
    assertTrue(response);
    asyncTestCase.continueTesting();
  });
}


function testGetDraft() {
  var action = constants.e2ebind.responseActions.GET_DRAFT;
  providerRequestHandler = function(data) {
    data.success = true;
    data.result = draft;
    return data;
  };

  e2ebind.start();

  asyncTestCase.waitForAsync('waiting for getDraft');
  e2ebind.getDraft(function(response) {
    assertEquals(draft.to, response.to);
    assertEquals(draft.bcc, response.bcc);
    assertEquals(draft.cc, response.cc);
    assertEquals(draft.body, response.body);
    assertEquals(draft.subject, response.subject);
    asyncTestCase.continueTesting();
  });
}


function testSetDraft() {
  var action = constants.e2ebind.responseActions.SET_DRAFT;
  providerRequestHandler = function(data) {
    var response = data.args;
    assertEquals(draft.to, response.to);
    assertEquals(draft.bcc, response.bcc);
    assertEquals(draft.cc, response.cc);
    assertEquals(draft.body, response.body);
    assertEquals(draft.subject, response.subject);
    asyncTestCase.continueTesting();
    return data;
  };

  e2ebind.start();

  asyncTestCase.waitForAsync('waiting for setDraft');
  e2ebind.setDraft(draft);
}
