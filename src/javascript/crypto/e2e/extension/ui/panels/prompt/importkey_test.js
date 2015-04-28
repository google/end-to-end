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
goog.provide('e2e.ext.ui.panels.prompt.ImportKeyTest');

goog.require('e2e.ext.ExtensionLauncher');
goog.require('e2e.ext.actions.Executor');
goog.require('e2e.ext.actions.GetKeyDescription');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.ui.panels.prompt.ImportKey');
goog.require('e2e.openpgp.ContextImpl');
goog.require('goog.dom');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.mockmatchers.SaveArgument');
goog.require('goog.testing.storage.FakeMechanism');
goog.setTestOnly();

var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(document.title);
asyncTestCase.stepTimeout = 2000;

var constants = e2e.ext.constants;
var launcher = null;
var mockControl = null;
var panel = null;
var stubs = new goog.testing.PropertyReplacer();

var PUBLIC_KEY_ASCII =
    '-----BEGIN PGP PUBLIC KEY BLOCK-----\n' +
    'Version: GnuPG v1.4.11 (GNU/Linux)\n' +
    '\n' +
    'mI0EUcy6DgEEAJb0T7gQlfKQWmR0dLUrueRMVy8UemcmxsdIH30/HqJvqO6xU0lK\n' +
    'NaFtaVxBdenAMpEooi1EcTi/bOKfz36FY/FARTiXv1LXuLzFJdPyjTYjh7tw+uOP\n' +
    'UlLJCTZikgrnM07txTUiVVEetOa+unyKn17EX0PlSpAbGZedyO0nGwXzABEBAAG0\n' +
    'BnRlc3QgNIi4BBMBAgAiBQJRzLoOAhsDBgsJCAcDAgYVCAIJCgsEFgIDAQIeAQIX\n' +
    'gAAKCRAG/5ysCS2oCL2SA/9EV9j3T/TM3VRD0NvNySHodcxCP1BF0zm/M84I/WHQ\n' +
    'sGKmHStfCqqEGruB8E6NHQMJwNp1TzcswuxE0wiTJiXKe3w3+GZhPHdW5zcgiMKK\n' +
    'YLn80Tk6fUMx1zVZtXlSBYCN5Op/axjQRyb+fGnXOhmboqQodYaWS7qhJWQJilH6\n' +
    'iriNBFHMug4BBADDTMshHtyYhLmWC7793FlOFl5tkcEfdFKJRm30k/9yky4cuz//\n' +
    'Xe4uXM72SaTI1Dfi6UIz5ZuFTxw3bnAXav+SV4Q4dZo0hb4jU8YaQfDL4TsRp7uO\n' +
    '6iqxd8nlsh9JnBKE6Fk/CW5FoMZZ3/yEm3pq924Uv2AZlO6dafgXecyqNQARAQAB\n' +
    'iJ8EGAECAAkFAlHMug4CGwwACgkQBv+crAktqAhENwQAkMY/nds36KgzwfMPpxtB\n' +
    'aq8GbrUqY1r8lBl6a/bi8qeOuEgQmIxM2OpVPtL04c1c1hLflPCi1SQUlCIh3DkE\n' +
    'GQIcy0/wxUZdCvZK0mF5nZSq6tez3CwqbeOA4nBOLwbxho50VqxBpR4qypYrB2ip\n' +
    'ykxlwiqudEe0sE2b1KwNtVw=\n' +
    '=nHBL\n' +
    '-----END PGP PUBLIC KEY BLOCK-----';


function setUp() {
  mockControl = new goog.testing.MockControl();
  e2e.ext.testingstubs.initStubs(stubs);

  launcher = new e2e.ext.ExtensionLauncher(
      new e2e.openpgp.ContextImpl(new goog.testing.storage.FakeMechanism()),
      new goog.testing.storage.FakeMechanism());
  launcher.start();
  stubs.setPath('chrome.runtime.getBackgroundPage', function(callback) {
    callback({launcher: launcher});
  });

  panel = new e2e.ext.ui.panels.prompt.ImportKey(
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
  stubs.setPath('e2e.ext.actions.GetKeyDescription.prototype.execute',
      mockControl.createFunctionMock('execute'));
  var keyDescriptionArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  e2e.ext.actions.GetKeyDescription.prototype.execute(
      goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument,
      panel,
      keyDescriptionArg,
      goog.testing.mockmatchers.ignoreArgument);

  stubs.replace(chrome.notifications, 'create',
      mockControl.createFunctionMock('create'));
  var notificationArg =
      new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  chrome.notifications.create(
      goog.testing.mockmatchers.ignoreArgument,
      goog.testing.mockmatchers.ignoreArgument,
      notificationArg);

  mockControl.$replayAll();

  panel.setContentInternal({
    request: true,
    selection: PUBLIC_KEY_ASCII
  });
  panel.render(document.body);
  panel.importKey_();

  keyDescriptionArg.arg('');
  asyncTestCase.waitForAsync('waiting for key to be imported');
  window.setTimeout(function() {
    notificationArg.arg();

    mockControl.$verifyAll();
    asyncTestCase.continueTesting();
  }, 500);
}
