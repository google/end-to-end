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
goog.require('e2e.ext.constants');
goog.require('e2e.ext.e2ebind');
goog.require('e2e.ext.gmonkey');
goog.require('e2e.ext.utils.text');
goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.mockmatchers.ArgumentMatcher');
goog.require('goog.testing.mockmatchers.SaveArgument');
goog.setTestOnly();


var constants = e2e.ext.constants;
var helper = null;
var e2ebind = e2e.ext.e2ebind;
var gmonkey = e2e.ext.gmonkey;
var mockControl = null;
var stubs = new goog.testing.PropertyReplacer();


function setUp() {
  mockControl = new goog.testing.MockControl();

  stubs.setPath('chrome.runtime.getURL', function() {});
  stubs.setPath('chrome.runtime.onMessage.addListener', function() {});
  stubs.setPath('chrome.runtime.onMessage.removeListener', function() {});

  helper = new e2e.ext.Helper();
}


function tearDown() {
  stubs.reset();
  helper = null;
}


function testGetActiveElement() {
  assertEquals('Failed to get active element', document.body,
      helper.getActiveElement_());
}


function testGetSelection() {
  assertEquals('Failed to get selection', '', helper.getSelection_());
}


function testSetValue() {
  var removedPortListener = false;
  stubs.replace(chrome.runtime.onMessage, 'removeListener', function() {
    removedPortListener = true;
  });
  var elem = goog.dom.getElement('testDiv');

  helper.setValue_(elem, {
    response: true,
    detach: true,
    value: '<b>\n</b>',
    origin: helper.getOrigin_()
  });

  assertTrue('Failed to remove port listener', removedPortListener);
  assertEquals('<b>\n</b>', elem.innerText);
}


function testSetValueForGmonkey() {
  var message = 'some text';
  var recipients = ['test@example.com'];

  stubs.set(gmonkey, 'setActiveDraft', mockControl.createFunctionMock());
  var setActiveDraftArg =
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    assertTrue(goog.array.equals(recipients, arg));

    return true;
  });
  gmonkey.setActiveDraft(setActiveDraftArg, message);

  stubs.setPath('chrome.runtime.onMessage.removeListener',
      mockControl.createFunctionMock());
  chrome.runtime.onMessage.removeListener(
      goog.testing.mockmatchers.ignoreArgument);

  mockControl.$replayAll();

  helper.setGmonkeyValue_({
    response: true,
    origin: helper.getOrigin_(),
    recipients: recipients,
    value: message,
    detach: true
  });

  mockControl.$verifyAll();
}


function testSetValueForE2ebind() {
  var message = 'some text';
  var recipients = ['test@example.com'];

  stubs.set(e2ebind, 'setDraft', mockControl.createFunctionMock());
  var setDraftArg = new goog.testing.mockmatchers.ArgumentMatcher(
      function(arg) {
        assertArrayEquals(recipients, arg.to);
        assertEquals(message, arg.body);
        return true;
      });
  e2ebind.setDraft(setDraftArg);

  stubs.setPath('chrome.runtime.onMessage.removeListener',
      mockControl.createFunctionMock());
  chrome.runtime.onMessage.removeListener(
      goog.testing.mockmatchers.ignoreArgument);

  mockControl.$replayAll();

  helper.setE2ebindValue_({
    response: true,
    origin: helper.getOrigin_(),
    recipients: recipients,
    value: message,
    detach: true
  });

  mockControl.$verifyAll();
}


function testGetSelectedContentInput() {
  var content = 'some content';

  stubs.set(helper, 'attachSetValueHandler_', mockControl.createFunctionMock());
  helper.attachSetValueHandler_(
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));

  stubs.set(helper, 'getActiveElement_', function() {
    var input = document.createElement('input');
    input.value = content;
    return input;
  });

  var callback = mockControl.createFunctionMock();
  callback(new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    assertEquals(content, arg.selection);

    return true;
  }));

  mockControl.$replayAll();

  helper.getSelectedContent_({editableElem: true}, {}, callback);

  mockControl.$verifyAll();
}


function testGetSelectedContentEditable() {
  var content = 'some content';

  stubs.set(helper, 'attachSetValueHandler_', mockControl.createFunctionMock());
  helper.attachSetValueHandler_(
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));


  stubs.replace(e2e.ext.Helper.prototype, 'getActiveElement_', function() {
    var div = document.createElement('div');
    div.innerText = content;
    div.contentEditable = true;
    return div;
  });

  var callback = mockControl.createFunctionMock();
  callback(new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    assertEquals(content, arg.selection);

    return true;
  }));

  mockControl.$replayAll();

  helper.getSelectedContent_({editableElem: true}, {}, callback);

  mockControl.$verifyAll();
}


function testGetSelectedContentStatic() {
  var content = 'some content';
  stubs.replace(e2e.ext.Helper.prototype, 'getActiveElement_', function() {
    var div = document.createElement('div');
    div.innerText = content;
    return div;
  });

  var gotSelection = false;
  helper.getSelectedContent_({}, {}, function(resp) {
    assertEquals(0, resp.selection.length);
    gotSelection = true;
  });
  assertTrue(gotSelection);
}


function testSelectedContentGmonkey() {
  var content = 'some content';
  stubs.set(helper, 'getSelection_', function() {
    return content;
  });

  stubs.set(helper, 'isGmail_', function() {
    return true;
  });

  stubs.set(gmonkey, 'hasActiveDraft', mockControl.createFunctionMock());

  var matcher = new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    assertEquals(content, arg.selection);
    return true;
  });
  var callback = mockControl.createFunctionMock('callback');
  callback(matcher);

  mockControl.$replayAll();
  helper.getSelectedContent_({}, {}, callback);
  mockControl.$verifyAll();
}


function testSelectedContentE2ebind() {
  var content = 'some content';
  stubs.set(helper, 'getSelection_', function() {
    return content;
  });

  stubs.set(helper, 'isYmail_', function() {
    return true;
  });

  stubs.set(e2ebind, 'hasDraft', mockControl.createFunctionMock());

  var matcher = new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    assertEquals(content, arg.selection);
    return true;
  });
  var callback = mockControl.createFunctionMock('callback');
  callback(matcher);

  mockControl.$replayAll();
  helper.getSelectedContent_({}, {}, callback);
  mockControl.$verifyAll();
}


function testInstallLookingGlass() {
  var selectionBody = 'some text';

  stubs.set(gmonkey, 'isAvailable', function(callback) { callback(true); });
  stubs.set(gmonkey, 'hasActiveDraft', mockControl.createFunctionMock());
  var hasDraftArg = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  gmonkey.hasActiveDraft(hasDraftArg);

  stubs.set(gmonkey, 'getCurrentMessage', mockControl.createFunctionMock());
  var getCurrentMessageArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  gmonkey.getCurrentMessage(getCurrentMessageArg);

  stubs.setPath(
      'e2e.ext.utils.text.getPgpAction', mockControl.createFunctionMock());
  e2e.ext.utils.text.getPgpAction(selectionBody, true)
      .$returns(constants.Actions.DECRYPT_VERIFY);

  stubs.set(helper, 'getOrigin_', function() {
    return 'https://mail.google.com';
  });

  var callbackMock = mockControl.createFunctionMock();
  var callbackArg =
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    assertEquals(constants.Actions.NO_OP, arg.action);

    return true;
  });
  callbackMock(callbackArg);

  mockControl.$replayAll();

  helper.getSelectedContent_({
    pgpAction: 'irrelevant',
    editableElem: true,
    enableLookingGlass: true
  }, null, callbackMock);

  hasDraftArg.arg(false);

  var contentElem = document.createElement('div');
  contentElem.innerText = selectionBody;
  getCurrentMessageArg.arg(contentElem);

  mockControl.$verifyAll();
}


function testAttachSetValueHandler() {
  var handler = goog.nullFunction;

  stubs.setPath('chrome.runtime.onMessage.removeListener',
      mockControl.createFunctionMock());
  chrome.runtime.onMessage.removeListener(
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));

  stubs.setPath('chrome.runtime.onMessage.addListener',
      mockControl.createFunctionMock());
  chrome.runtime.onMessage.addListener(handler);

  mockControl.$replayAll();

  helper.setValueHandler_ = goog.nullFunction;
  helper.attachSetValueHandler_(handler);

  mockControl.$verifyAll();
}


function testDisplayDuringReadGmonkey() {
  var selectionBody = 'some text';

  stubs.set(gmonkey, 'isAvailable', function(callback) { callback(true); });
  stubs.set(gmonkey, 'hasActiveDraft', mockControl.createFunctionMock());
  var hasDraftArg = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  gmonkey.hasActiveDraft(hasDraftArg);

  stubs.set(gmonkey, 'getCurrentMessage', mockControl.createFunctionMock());
  var getCurrentMessageArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  gmonkey.getCurrentMessage(getCurrentMessageArg);

  var callbackMock = mockControl.createFunctionMock();
  var callbackArg =
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    assertEquals(constants.Actions.ENCRYPT_SIGN, arg.action);
    assertEquals(selectionBody, arg.selection);
    assertEquals(0, arg.recipients.length);

    return true;
  });
  callbackMock(callbackArg);

  stubs.set(helper, 'getOrigin_', function() {
    return 'https://mail.google.com';
  });

  mockControl.$replayAll();

  helper.getSelectedContent_({
    pgpAction: 'irrelevant',
    editableElem: true
  }, null, callbackMock);

  hasDraftArg.arg(false);
  getCurrentMessageArg.arg({
    innerText: selectionBody
  });

  mockControl.$verifyAll();
}


function testDisplayDuringWriteGmonkey() {
  var selectionBody = 'some text';
  var recipients = ['test@example.com'];

  stubs.set(gmonkey, 'isAvailable', function(callback) { callback(true); });
  stubs.set(helper, 'attachSetValueHandler_', mockControl.createFunctionMock());
  helper.attachSetValueHandler_(
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));

  stubs.set(gmonkey, 'hasActiveDraft', mockControl.createFunctionMock());
  var hasDraftArg = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  gmonkey.hasActiveDraft(hasDraftArg);

  stubs.set(gmonkey, 'getActiveDraft', mockControl.createFunctionMock());
  var getActiveDraftArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  gmonkey.getActiveDraft(getActiveDraftArg);

  var callbackMock = mockControl.createFunctionMock();
  var callbackArg =
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    assertEquals(constants.Actions.ENCRYPT_SIGN, arg.action);
    assertEquals(selectionBody, arg.selection);
    assertTrue(goog.array.equals(recipients, arg.recipients));

    return true;
  });
  callbackMock(callbackArg);

  stubs.set(helper, 'getOrigin_', function() {
    return 'https://mail.google.com';
  });

  mockControl.$replayAll();

  helper.getSelectedContent_({
    pgpAction: 'irrelevant',
    editableElem: true
  }, null, callbackMock);

  hasDraftArg.arg(true);
  getActiveDraftArg.arg(recipients, selectionBody);

  mockControl.$verifyAll();
}


function testDisplayDuringReadE2ebind() {
  var selectionBody = 'some text';

  stubs.set(e2ebind, 'started_', true);
  window.config = {signer: 'yan@example.com'};
  stubs.set(e2ebind, 'hasDraft', mockControl.createFunctionMock());

  var hasDraftArg = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  e2ebind.hasDraft(hasDraftArg);

  stubs.set(e2ebind, 'getCurrentMessage', mockControl.createFunctionMock());
  var getCurrentMessageArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  e2ebind.getCurrentMessage(getCurrentMessageArg);

  var callbackMock = mockControl.createFunctionMock();
  var callbackArg =
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    assertEquals(constants.Actions.ENCRYPT_SIGN, arg.action);
    assertEquals(selectionBody, arg.selection);
    assertEquals(0, arg.recipients.length);

    return true;
  });
  callbackMock(callbackArg);

  stubs.set(helper, 'getOrigin_', function() {
    return 'https://us-mg999.mail.yahoo.com';
  });

  mockControl.$replayAll();

  helper.getSelectedContent_({
    pgpAction: 'irrelevant',
    editableElem: true
  }, null, callbackMock);

  hasDraftArg.arg(false);
  getCurrentMessageArg.arg({
    text: selectionBody
  });

  mockControl.$verifyAll();
}


function testDisplayDuringWriteE2ebind() {
  var selectionBody = 'some text';
  var recipients = ['test@example.com'];

  stubs.set(e2ebind, 'started_', true);
  window.config = {signer: 'yan@example.com'};

  stubs.set(helper, 'attachSetValueHandler_', mockControl.createFunctionMock());
  helper.attachSetValueHandler_(
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));

  stubs.set(e2ebind, 'hasDraft', mockControl.createFunctionMock());
  var hasDraftArg = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  e2ebind.hasDraft(hasDraftArg);

  stubs.set(e2ebind, 'getDraft', mockControl.createFunctionMock());
  var getDraftArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  e2ebind.getDraft(getDraftArg);

  var callbackMock = mockControl.createFunctionMock();
  var callbackArg =
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    assertEquals(constants.Actions.ENCRYPT_SIGN, arg.action);
    assertEquals(selectionBody, arg.selection);
    assertTrue(goog.array.equals(recipients, arg.recipients));

    return true;
  });
  callbackMock(callbackArg);

  stubs.set(helper, 'getOrigin_', function() {
    return 'https://us-mg5.mail.yahoo.com';
  });

  mockControl.$replayAll();

  helper.getSelectedContent_({
    pgpAction: 'irrelevant',
    editableElem: true
  }, null, callbackMock);

  hasDraftArg.arg({has_draft: true});
  getDraftArg.arg({
    to: recipients,
    body: selectionBody,
    cc: [],
    bcc: []
  });

  mockControl.$verifyAll();
}


function testOrigin() {
  assertEquals(window.location.origin, helper.getOrigin_());
}


function testHelperRunsOnce() {
  var callbackMock = mockControl.createFunctionMock();
  callbackMock(goog.testing.mockmatchers.ignoreArgument);

  mockControl.$replayAll();

  helper.getSelectedContent_({}, {}, callbackMock);
  assertFalse(helper.isDisposed());

  helper.getSelectedContent_({}, {}, callbackMock);
  assertTrue(helper.isDisposed());

  mockControl.$verifyAll();
}


function testE2eBindStarts() {
  stubs.set(helper, 'isYmail_', function() {
    return true;
  });

  stubs.set(e2ebind, 'start', function() {
    e2ebind.started_ = true;
  });

  helper.runOnce();

  assertTrue(e2ebind.isStarted());
}


function testInputIsEditable() {
  var elem = document.getElementById('testInput');
  assertTrue(helper.isEditable_(elem));
}


function testContentEditableIsEditable() {
  var elem = document.getElementById('testEditable');
  assertTrue(helper.isEditable_(elem));
}


function testEnableLookingGlass() {
  var selectionBody = 'some text';

  stubs.set(gmonkey, 'getCurrentMessage', mockControl.createFunctionMock());
  var getCurrentMessageArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  gmonkey.getCurrentMessage(getCurrentMessageArg);

  stubs.setPath(
      'e2e.ext.utils.text.getPgpAction', mockControl.createFunctionMock());
  e2e.ext.utils.text.getPgpAction(selectionBody, true)
      .$returns(constants.Actions.DECRYPT_VERIFY);

  stubs.setPath('chrome.runtime.getURL', mockControl.createFunctionMock());
  chrome.runtime.getURL('glass.html');

  stubs.set(helper, 'getOrigin_', function() {
    return 'https://mail.google.com';
  });

  mockControl.$replayAll();

  helper.enableLookingGlass_();

  var contentElem = document.createElement('div');
  contentElem.innerText = selectionBody;
  getCurrentMessageArg.arg(contentElem);

  assertNotNull(contentElem.querySelector('iframe'));

  mockControl.$verifyAll();
}


function testGetActiveElementNoGmonkey() {
  var content = 'some content';

  stubs.set(helper, 'getActiveElement_', function() {
    var input = document.createElement('input');
    input.value = content;
    return input;
  });

  stubs.set(gmonkey, 'isAvailable', function(callback) { callback(false); });

  stubs.set(helper, 'getOrigin_', function() {
    return 'https://mail.google.com';
  });

  var callback = mockControl.createFunctionMock();
  callback(new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
    assertEquals(content, arg.selection);

    return true;
  }));

  mockControl.$replayAll();

  helper.getSelectedContent_({editableElem: false}, {}, callback);

  mockControl.$verifyAll();
}
