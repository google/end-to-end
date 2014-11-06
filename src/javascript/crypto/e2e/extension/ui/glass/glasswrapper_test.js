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
 * @fileoverview Tests for the looking glass wrapper.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.GlassWrapperTest');

goog.require('e2e.ext.ui.GlassWrapper');
goog.require('e2e.openpgp.asciiArmor');
goog.require('goog.crypt.base64');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
var elem = null;
var mockControl = null;
var originalContent = 'Here is some text to display';
var stubs = null;
var wrapper = null;


function setUp() {
  mockControl = new goog.testing.MockControl();
  stubs = new goog.testing.PropertyReplacer();

  elem = document.createElement('div');
  elem.appendChild(document.createTextNode(originalContent));
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
  stubs.setPath('e2e.openpgp.asciiArmor.extractPgpBlock',
      mockControl.createFunctionMock('extractPgpBlock'));
  e2e.openpgp.asciiArmor.extractPgpBlock(originalContent).$returns('some text');
  stubs.setPath(
      'chrome.runtime.getURL', mockControl.createFunctionMock('getURL'));
  chrome.runtime.getURL('glass.html').$returns('data:text/html');
  chrome.runtime.getURL('').$returns('*');

  stubs.setPath('goog.crypt.base64.encodeString',
      mockControl.createFunctionMock('encodeString'));
  goog.crypt.base64.encodeString('some text', true);
  mockControl.$replayAll();

  assertEquals(1, elem.childNodes.length);

  asyncTestCase.waitForAsync('Waiting for glass to be installed.');
  wrapper.installGlass(function() {
    assertEquals(5, elem.childNodes.length);
    assertNotNull(elem.querySelector('iframe'));
    assertContains('Here is', elem.innerText);
    assertContains('to display', elem.innerText);
    wrapper.removeGlass();
    assertEquals(1, elem.childNodes.length);
    assertEquals(originalContent, elem.innerText);
    mockControl.$verifyAll();
    asyncTestCase.continueTesting();
  });
}
