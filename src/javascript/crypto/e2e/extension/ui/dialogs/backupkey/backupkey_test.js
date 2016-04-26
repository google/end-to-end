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
 * @fileoverview Tests for the minimized keyring management UI.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.dialogs.BackupKeyTest');

goog.require('e2e.async.Result');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.ui.dialogs.BackupKey');
goog.require('goog.crypt.base64');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.setTestOnly();

var dialog = null;
var stubs = new goog.testing.PropertyReplacer();
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();


function setUp() {
  mockControl = new goog.testing.MockControl();
  e2e.ext.testingstubs.initStubs(stubs);

  stubs.setPath('chrome.runtime.getBackgroundPage', function(callback) {
    callback({
      launcher: {
        getContext: function() {
          return {
            getKeyringBackupData: function() {
              return e2e.async.Result.toResult({
                seed: [1, 2, 3, 4, 5],
                count: 2,
                timestamp: new Date(0)
              });
            }
          };
        }
      }
    });
  });

  dialog = new e2e.ext.ui.dialogs.BackupKey();
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();

  goog.dispose(dialog);
  dialog = null;
}


function testOutputVersion() {
  /* Version bit must be zero, marks assumption that ECDSA + ECDH keys are
   * are always generated in pairs by the application */
  asyncTestCase.waitForAsync('Waiting for dialog to be populated with key');
  dialog.getBackupCode_().addCallback(function(code) {
    assertEquals(goog.crypt.base64.decodeStringToByteArray(code)[0] & 0x80, 0);
    asyncTestCase.continueTesting();
  });
}


function testGetKeyCode() {
  asyncTestCase.waitForAsync('Waiting for dialog to be populated with key');
  dialog.getBackupCode_().addCallback(function(code) {
    assertEquals(code, goog.crypt.base64.encodeByteArray(
        [1, 1, 2, 3, 4, 5]));
    asyncTestCase.continueTesting();
  });
}
