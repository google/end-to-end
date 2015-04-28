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
 * @fileoverview Unit tests for the End-To-End launcher.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.LauncherTest');

goog.require('e2e.async.Result');
goog.require('e2e.ext.ExtensionLauncher');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.openpgp.ContextImpl');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.storage.FakeMechanism');
goog.setTestOnly();

var constants = e2e.ext.constants;
var launcher = null;
var mockControl = null;
var mockmatchers = goog.testing.mockmatchers;
var stubs = new goog.testing.PropertyReplacer();
var fakeStorage;
var context;

function setUp() {
  fakeStorage = new goog.testing.storage.FakeMechanism();
  mockControl = new goog.testing.MockControl();
  e2e.ext.testingstubs.initStubs(stubs);
  context = new e2e.openpgp.ContextImpl(fakeStorage);

  launcher = new e2e.ext.ExtensionLauncher(context, fakeStorage);
  launcher.getPreferences().setWelcomePageEnabled(false);
  launcher.start();
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
  launcher = null;
}


function testBadPassphrase() {
  var storage = new goog.testing.storage.FakeMechanism();
  var l1 = new e2e.ext.ExtensionLauncher(launcher.getContext(), storage);
  l1.start('somesecret');
  // generate a key to ensure the keyring isn't empty.
  l1.getContext().generateKey(
      'ECDSA', 256, 'ECDH', 256, 'name', '', 'n@e.c', 253402243200);
  assertThrows('Wrong passphrase should throw exception.', function() {
    var l2 = new e2e.ext.ExtensionLauncher(l1.getContext(), storage);
    l2.start('fail');
  });
}


function testStart() {
  var passphrase = 'test';
  stubs.set(launcher.pgpContext_, 'setKeyRingPassphrase', function(p) {
    assertEquals(passphrase, p);
    return e2e.async.Result.toResult(undefined);
  });

  stubs.set(launcher.preferences_, 'initDefaults',
      mockControl.createFunctionMock('initDefaults'));
  launcher.preferences_.initDefaults();

  stubs.set(launcher, 'showWelcomeScreen',
      mockControl.createFunctionMock('showWelcomeScreen'));
  launcher.showWelcomeScreen();

  stubs.set(launcher, 'updatePassphraseWarning',
      mockControl.createFunctionMock('updatePassphraseWarning'));
  launcher.updatePassphraseWarning();

  stubs.set(launcher.ctxApi_, 'installApi',
      mockControl.createFunctionMock('installApi'));
  launcher.ctxApi_.installApi();

  mockControl.$replayAll();

  launcher.start(passphrase);
  assertTrue(launcher.started_);

  mockControl.$verifyAll();
}


function testShowWelcomeScreenEnabled() {
  var openedWindow = false;
  stubs.replace(launcher, 'createWindow', function() {
    openedWindow = true;
  });

  launcher.getPreferences().setWelcomePageEnabled(true);
  launcher.start();
  assertTrue('Failed to open the welcome screen', openedWindow);
}


function testShowWelcomeScreenDisabled() {
  var openedWindow = false;
  stubs.replace(launcher, 'createWindow', function() {
    openedWindow = true;
  });

  launcher.getPreferences().setWelcomePageEnabled(false);
  launcher.start();
  assertFalse('Incorrectly opening the welcome screen', openedWindow);
}
