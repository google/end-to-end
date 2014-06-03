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
 * @fileoverview Unit tests for the End-To-End helper.
 */

goog.require('e2e.ext.Helper');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.gmonkey');
goog.require('goog.Uri');
goog.require('goog.dom');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');


var constants = e2e.ext.constants;
var helper = null;
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


function testSetValueForGmail() {
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

  helper.setGmailValue_({
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


function testSelectedContentPriority() {
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


function testInstallLookingGlass() {
  var selectionBody = 'some text';

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

  var callbackMock = mockControl.createFunctionMock();
  var callbackArg =
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertEquals(constants.Actions.NO_OP, arg.action);

        return true;
      });
  callbackMock(callbackArg);

  mockControl.$replayAll();

  helper.currentUri_ = new goog.Uri('https://mail.google.com/irrelevant');
  helper.getSelectedContent_({
    pgpAction: 'irrelevant',
    editableElem: true
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


function testDisplayDuringRead() {
  var selectionBody = 'some text';

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

  mockControl.$replayAll();

  helper.currentUri_ = new goog.Uri('https://mail.google.com/irrelevant');
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


function testDisplayDuringWrite() {
  var selectionBody = 'some text';
  var recipients = ['test@example.com'];

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

  mockControl.$replayAll();

  helper.currentUri_ = new goog.Uri('https://mail.google.com/irrelevant');
  helper.getSelectedContent_({
    pgpAction: 'irrelevant',
    editableElem: true
  }, null, callbackMock);

  hasDraftArg.arg(true);
  getActiveDraftArg.arg(recipients, selectionBody);

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

  mockControl.$replayAll();

  helper.currentUri_ = new goog.Uri('https://mail.google.com/irrelevant');
  helper.enableLookingGlass_();

  var contentElem = document.createElement('div');
  contentElem.innerText = selectionBody;
  getCurrentMessageArg.arg(contentElem);

  assertNotNull(contentElem.querySelector('iframe'));

  mockControl.$verifyAll();
}
