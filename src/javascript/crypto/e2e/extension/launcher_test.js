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
goog.require('e2e.openpgp.error.WrongPassphraseError');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.storage.FakeMechanism');
goog.setTestOnly();

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
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
  asyncTestCase.waitForAsync('Waiting for start (1).');
  var prefStorage = new goog.testing.storage.FakeMechanism();
  var keyringStorage = new goog.testing.storage.FakeMechanism();
  var context1 = new e2e.openpgp.ContextImpl(keyringStorage);
  var l1 = new e2e.ext.ExtensionLauncher(context1, prefStorage);
  l1.start().addCallbacks(function() {
    asyncTestCase.waitForAsync('Waiting for passphrase change.');
    return context1.changeKeyRingPassphrase('some');
  }, fail).addCallbacks(function() {
    asyncTestCase.waitForAsync('Waiting for key generation.');
    // generate a key to ensure the keyring isn't empty.
    return l1.getContext().generateKey(
        'ECDSA', 256, 'ECDH', 256, 'name', '', 'n@e.c', 253402243200);
  }, fail).addCallbacks(function() {
    asyncTestCase.waitForAsync('Waiting for start (2).');
    // Simulate a new launcher, with a new context, reusing the encrypted
    // storage.
    var l2 = new e2e.ext.ExtensionLauncher(
        new e2e.openpgp.ContextImpl(keyringStorage), prefStorage);
    return l2.start('fail');
  }, fail).addCallbacks(fail, function(e) {
    assertTrue(e instanceof e2e.openpgp.error.WrongPassphraseError);
    asyncTestCase.continueTesting();
  });
}


function testStart() {
  var passphrase = 'test';
  stubs.set(launcher.pgpContext_, 'initializeKeyRing', function(p) {
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
