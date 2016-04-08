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
 * @fileoverview Tests for the generate key panel.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.dialogs.ImportConfirmationTest');

goog.require('e2e.ext.constants');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.ui.dialogs.ImportConfirmation');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.ui.Component');
goog.setTestOnly();

var constants = e2e.ext.constants;
var mockControl = null;
var stubs = new goog.testing.PropertyReplacer();
var parent = null;

var KEYS = [
  {
    uids: ['test123'],
    key: {
      fingerprintHex: '0123456789abcdef',
      secret: false,
      algorithm: 'ECDH'
    },
    subKeys: [{
      fingerprintHex: '0123456789abcdef',
      secret: false,
      algorithm: 'ECDH'
    }]
  },
  {
    uids: ['test456'],
    key: {
      fingerprintHex: '0123456789abcdef',
      secret: false,
      algorithm: 'ECDH'
    },
    subKeys: [{
      fingerprintHex: '0123456789abcdef',
      secret: false,
      algorithm: 'ECDH'
    }]
  }
];


function setUp() {
  document.body.textContent = '';

  mockControl = new goog.testing.MockControl();
  e2e.ext.testingstubs.initStubs(stubs);

  parent = new goog.ui.Component();
  parent.render(document.body);
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
  goog.dispose(parent);
}


function testAllSelected() {
  var callback = mockControl.createFunctionMock();
  callback('');

  var dialog = new e2e.ext.ui.dialogs.ImportConfirmation(KEYS, callback);

  mockControl.$replayAll();

  parent.addChild(dialog, true);
  dialog.invokeCallback(false);

  mockControl.$verifyAll();
}


function testNoneSelected() {
  var callback = mockControl.createFunctionMock();
  callback(undefined);

  var dialog = new e2e.ext.ui.dialogs.ImportConfirmation(KEYS, callback);

  mockControl.$replayAll();

  parent.addChild(dialog, true);
  dialog.invokeCallback(true);

  mockControl.$verifyAll();
}
