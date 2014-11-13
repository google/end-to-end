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
 * @fileoverview Tests for the wrapper of the gmonkey API.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.gmonkeyTest');

goog.require('e2e.ext.gmonkey');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var api = null;
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
var draft = null;
var gmonkey = null;
var stubs = new goog.testing.PropertyReplacer();
var RECIPIENTS = ['test@example.com' , 't2@example.com', 'cc@example.com'];
var TEST_CONTENT = 'TEST';

function setUp() {
  gmonkey = new e2e.ext.gmonkey();
  stubs.setPath('chrome.runtime.getURL', function(filename) {
    return './' + filename;
  });
  document.documentElement.id = 'test_id';
  draft = {
    to: [{address: 'test@example.com'},
      {name: 'we <ird>>\'>, <a@a.com>, n<ess', address: 't2@example.com'},
      {name: 'inv\"<alid <invalid@example.com>'},
      {address: 'fails#e2e.regexp.vali@dation.com'}],
    cc: [{address: 'cc@example.com'}],

    body: 'some text<br>with new<br>lines',
    getToEmails: function() { return this.to; },
    setToEmails: function(value) { this.to = value; },
    getCcEmails: function() { return this.cc; },
    setCcEmails: function(value) { this.cc = value; },
    getPlainTextBody: function() { return this.body.replace(/\<br\>/g, '\n'); },
    setBody: function(value) { this.body = value; }
  };
  api = {
    getContentElement: function() { return document.documentElement; },
    getPlainTextContent: function() { return TEST_CONTENT; },
    getCurrentMessage: function() { return api; },
    getMainWindow: function() { return api; },
    getOpenDraftMessages: function() { return [draft]; },
    getActiveMessage: function() { return api; }
  };
  stubs.setPath('gmonkey.load', function(version, callback) {
    callback(api);
  });
}


function testGmonkeyCall() {
  var result = '';
  gmonkey.callGmonkey_('getCurrentMessage', function(res) {
    result = res;
  });

  asyncTestCase.waitForAsync('Waiting for the call to gmonkey to complete.');

  window.setTimeout(function() {
    assertEquals('test_id', result.id);
    assertEquals(TEST_CONTENT, result.body);
    asyncTestCase.continueTesting();
  }, 500);
}


function testIsAvailableOnGmail() {
  stubs.setPath('e2e.ext.utils.text.isGmailOrigin', function() {return true;});

  asyncTestCase.waitForAsync('Waiting for the call to gmonkey to complete.');

  gmonkey.isAvailable(function(isAvailable) {
    assertTrue(isAvailable);
    asyncTestCase.continueTesting();
  });
}


function testIsNotAvailableOutsideGmail() {
  stubs.setPath('e2e.ext.utils.text.isGmailOrigin', function() {return false;});

  asyncTestCase.waitForAsync('Waiting for the call to gmonkey to complete.');

  gmonkey.isAvailable(function(isAvailable) {
    assertFalse(isAvailable);
    asyncTestCase.continueTesting();
  });
}


function testGetCurrentMessage() {
  var elemId = null;
  var messageContent = null;
  gmonkey.getCurrentMessage(function(id, content) {
    elemId = id;
    messageContent = content;
  });

  asyncTestCase.waitForAsync('Waiting for the call to gmonkey to complete.');

  window.setTimeout(function() {
    assertEquals(document.documentElement.id, elemId);
    assertEquals(TEST_CONTENT, messageContent);
    asyncTestCase.continueTesting();
  }, 500);
}


function testGetActiveDraft() {
  var recipients = null;
  var body = null;

  stubs.set(api, 'getContentElement', function() {
    return {innerText: draft.body};
  });

  gmonkey.getActiveDraft(function(recp, msg) {
    recipients = recp;
    body = msg;
  });

  asyncTestCase.waitForAsync('Waiting for the call to gmonkey to complete.');

  window.setTimeout(function() {
    assertArrayEquals(RECIPIENTS, recipients);
    assertEquals(draft.body.replace(/\<br\>/g, '\n'), body);
    asyncTestCase.continueTesting();
  }, 500);
}


function testSetActiveDraft() {
  asyncTestCase.waitForAsync('Waiting for the call to gmonkey to complete.');

  gmonkey.setActiveDraft(['foo@example.com', 'noemail', '<a@>',
    'first,"""last <bar@example.com>'], 'secret message', function(success) {
    assertArrayEquals([
      {address: 'foo@example.com', name: undefined},
      {address: 'bar@example.com', name: undefined}
    ], draft.to);
    assertEquals('secret message', draft.body);
    assertTrue(success);
    asyncTestCase.continueTesting();
  });
}


function testInputIsEditable() {
  var elem = document.getElementById('testInput');
  assertTrue(gmonkey.isEditable_(elem));
}


function testContentEditableIsEditable() {
  var elem = document.getElementById('testEditable');
  assertTrue(gmonkey.isEditable_(elem));
}


function testGetActiveElement() {
  assertEquals('Failed to get active element', document.body,
      gmonkey.getActiveElement_());
}


function testGetActiveSelection() {
  assertEquals('Failed to get selection', '', gmonkey.getActiveSelection_());
  var el = document.createElement('div');
  var sel = window.getSelection();
  var range = document.createRange();
  el.textContent = 'some text';
  document.body.appendChild(el);
  range.selectNodeContents(el);
  sel.addRange(range);
  assertEquals('Incorrect selection', el.textContent,
      gmonkey.getActiveSelection_());
  document.body.removeChild(el);
}


function testGetSelectedContentGmonkey() {
  var text = 'some content';

  asyncTestCase.waitForAsync('Waiting for the call to gmonkey to complete.');
  gmonkey.getSelectedContentGmonkey_(function(recipients, content, canInject) {
    assertArrayEquals(RECIPIENTS, recipients);
    assertEquals(draft.body.replace(/\<br\>/g, '\n'), content);
    assertEquals(true, canInject);
    asyncTestCase.continueTesting();
  });
}


function testGetSelectedContentNativeEditable() {
  var text = 'some content';

  stubs.replace(e2e.ext.gmonkey.prototype, 'getActiveElement_', function() {
    var div = document.createElement('div');
    div.innerText = text;
    div.contentEditable = true;
    return div;
  });

  asyncTestCase.waitForAsync('Waiting for the call to gmonkey to complete.');
  gmonkey.getSelectedContentNative_(function(recipients, content, canInject) {
    assertArrayEquals([], recipients);
    assertEquals(text, content);
    assertEquals(true, canInject);
    asyncTestCase.continueTesting();
  });
}


function testGetSelectedContentNativeInput() {
  var text = 'some content';
  stubs.replace(e2e.ext.gmonkey.prototype, 'getActiveElement_', function() {
    var input = document.createElement('input');
    input.value = text;
    return input;
  });

  asyncTestCase.waitForAsync('Waiting for the call to gmonkey to complete.');
  gmonkey.getSelectedContentNative_(function(recipients, content, canInject) {
    assertArrayEquals([], recipients);
    assertEquals(text, content);
    assertEquals(true, canInject);
    asyncTestCase.continueTesting();
  });
}


function testGetSelectedContentNativeStatic() {
  var text = 'some content';
  stubs.replace(e2e.ext.gmonkey.prototype, 'getActiveElement_', function() {
    var div = document.createElement('div');
    div.innerText = text;
    return div;
  });

  asyncTestCase.waitForAsync('Waiting for the call to gmonkey to complete.');
  gmonkey.getSelectedContentNative_(function(recipients, content, canInject) {
    assertArrayEquals([], recipients);
    assertEquals(text, content);
    assertEquals(false, canInject);
    asyncTestCase.continueTesting();
  });
}
