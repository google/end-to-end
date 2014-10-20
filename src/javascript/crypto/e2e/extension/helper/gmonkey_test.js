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
var gmonkey = e2e.ext.gmonkey;
var stubs = new goog.testing.PropertyReplacer();
var RECIPIENTS = ['test@example.com' , 't2@example.com', 'cc@example.com'];


function setUp() {
  stubs.setPath('chrome.runtime.getURL', function(filename) {
    return './' + filename;
  });
  document.documentElement.id = 'test_id';
  draft = {
    to: 'test@example.com, "we <ird>>\'>, <a@a.com>, n<ess" <t2@example.com>' +
        ', "inv\"<alid <invalid@example.com>, fails#e2e.regexp.vali@dation.com',
    cc: 'cc@example.com',
    body: 'some text<br>with new<br>lines',
    getTo: function() { return this.to; },
    setTo: function(value) { this.to = value; },
    getCc: function() { return this.cc; },
    setCc: function(value) { this.cc = value; },
    getBody: function() { return this.body; },
    setBody: function(value) { this.body = value; }
  };
  api = {
    getContentElement: function() { return document.documentElement; },
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
    assertEquals('test_id', result);
    asyncTestCase.continueTesting();
  }, 500);
}


function testIsAvailable() {
  asyncTestCase.waitForAsync('Waiting for the call to gmonkey to complete.');
  gmonkey.isAvailable(function(isAvailable) {
    assertTrue(isAvailable);
    asyncTestCase.continueTesting();
  });
}


function testGetCurrentMessage() {
  var elem = null;
  gmonkey.getCurrentMessage(function(res) {
    elem = res;
  });

  asyncTestCase.waitForAsync('Waiting for the call to gmonkey to complete.');

  window.setTimeout(function() {
    assertEquals(document.documentElement, elem);
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
  gmonkey.setActiveDraft(['foo@example.com', 'noemail', '<a@>',
    'first,"""last <bar@example.com>'], 'secret message');

  asyncTestCase.waitForAsync('Waiting for the call to gmonkey to complete.');
  window.setTimeout(function() {
    assertEquals('foo@example.com, "first,last" <bar@example.com>', draft.to);
    assertEquals('secret message', draft.body);
    asyncTestCase.continueTesting();
  }, 500);
}
