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
 * @fileoverview Unit tests for the encryption panel for the prompt UI.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.ui.panels.prompt.DecryptVerifyTest');

goog.require('e2e.ext.Launcher');
goog.require('e2e.ext.actions.DecryptVerify');
goog.require('e2e.ext.actions.Executor');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.ui.panels.prompt.DecryptVerify');
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
var launcher = null;
var mockControl = null;
var panel = null;
var stubs = new goog.testing.PropertyReplacer();


function setUp() {
  window.localStorage.clear();
  mockControl = new goog.testing.MockControl();

  stubs.setPath('chrome.browserAction.setBadgeText', goog.nullFunction);
  stubs.setPath('chrome.browserAction.setTitle', goog.nullFunction);
  stubs.setPath('chrome.i18n.getMessage', function(msg) {
    return msg;
  });
  stubs.setPath('chrome.extension.getURL', goog.nullFunction);
  stubs.setPath('chrome.notifications.create', goog.nullFunction);
  stubs.setPath('chrome.runtime.onConnect.addListener', goog.nullFunction);
  stubs.setPath('chrome.runtime.onConnect.removeListener', goog.nullFunction);
  stubs.setPath('chrome.tabs.query', goog.nullFunction);
  stubs.setPath('chrome.tabs.onUpdated.addListener', goog.nullFunction);
  stubs.setPath('chrome.tabs.onRemoved.addListener', goog.nullFunction);

  launcher = new e2e.ext.Launcher();
  launcher.start();
  stubs.setPath('chrome.runtime.getBackgroundPage', function(callback) {
    callback({launcher: launcher});
  });

  panel = new e2e.ext.ui.panels.prompt.DecryptVerify(
      new e2e.ext.actions.Executor(goog.nullFunction),
      'irrelevant',
      goog.nullFunction);

  if (!goog.dom.getElement(constants.ElementId.CALLBACK_DIALOG)) {
    var dialogHolder = document.createElement('div');
    dialogHolder.id = constants.ElementId.CALLBACK_DIALOG;
    document.body.appendChild(dialogHolder);
  }
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
  goog.dispose(panel);
}


function testRender() {
  var plaintext = 'plaintext message';
  var encrypted = 'encrypted message';

  var decryptCb = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  stubs.setPath('e2e.ext.actions.DecryptVerify.prototype.execute',
      mockControl.createFunctionMock('decryptVerify'));
  e2e.ext.actions.DecryptVerify.prototype.execute(
      goog.testing.mockmatchers.ignoreArgument,
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertEquals(encrypted, arg.content);
        return true;
      }),
      panel,
      decryptCb,
      new goog.testing.mockmatchers.ArgumentMatcher(goog.isFunction));

  mockControl.$replayAll();

  panel.setContentInternal({
    request: true,
    selection: encrypted
  });
  panel.render(document.body);
  panel.decryptVerify_();

  decryptCb.arg(plaintext);
  assertEquals(plaintext, document.querySelector('textarea').value);
  mockControl.$verifyAll();
}
