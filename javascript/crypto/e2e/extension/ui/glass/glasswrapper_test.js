// Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Tests for the looking glass wrapper.
 */

goog.require('e2e.ext.ui.GlassWrapper');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
var elem = null;
var mockControl = null;
var stubs = null;
var wrapper = null;


function setUp() {
  mockControl = new goog.testing.MockControl();
  stubs = new goog.testing.PropertyReplacer();

  elem = document.createElement('div');
  elem.appendChild(document.createTextNode('some text'));
  elem.appendChild(document.createElement('p'));
  document.body.appendChild(elem);

  wrapper = new e2e.ext.ui.GlassWrapper(elem);
}


function tearDown() {
  goog.dispose(wrapper);
  document.body.removeChild(elem);

  wrapper = null;
  elem = null;

  stubs.reset();
  mockControl.$tearDown();
}

function testInstallAndRemoveGlass() {
  stubs.setPath(
      'chrome.runtime.getURL', mockControl.createFunctionMock('getURL'));
  chrome.runtime.getURL('glass.html').$returns(window.location.href);
  chrome.runtime.getURL('').$returns('*');

  stubs.setPath('goog.crypt.base64.encodeString',
      mockControl.createFunctionMock('encodeString'));
  goog.crypt.base64.encodeString('some text\n', true);
  mockControl.$replayAll();

  assertEquals(2, elem.childNodes.length);

  wrapper.installGlass();
  assertEquals(1, elem.childNodes.length);
  assertNotNull(elem.querySelector('iframe'));

  asyncTestCase.waitForAsync('Waiting for glass to be installed.');
  window.setTimeout(function() {
    asyncTestCase.continueTesting();
    wrapper.removeGlass();
    assertEquals(2, elem.childNodes.length);
    assertEquals('some text\n', elem.innerText);

    mockControl.$verifyAll();
  }, 500);
}
