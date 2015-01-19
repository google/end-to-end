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
 * @fileoverview Tests for the IMPORT_KEY action.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.actions.ImportKeyTest');

goog.require('e2e.ext.actions.GetKeyDescription');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.openpgp.ContextImpl');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.mockmatchers.SaveArgument');
goog.require('goog.testing.storage.FakeMechanism');
goog.require('goog.ui.Component');
goog.setTestOnly();

var constants = e2e.ext.constants;
var mockControl = null;
var stubs = new goog.testing.PropertyReplacer();
var testCase = goog.testing.AsyncTestCase.createAndInstall();
var storage;

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
  storage = new goog.testing.storage.FakeMechanism();

  var dialogContainer = document.createElement('div');
  dialogContainer.id = constants.ElementId.CALLBACK_DIALOG;
  document.body.appendChild(dialogContainer);
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
}


function testExecute() {
  var parentUi = new goog.ui.Component();
  parentUi.render(document.body);

  var pgpContext = new e2e.openpgp.ContextImpl(storage);
  pgpContext.setKeyRingPassphrase(''); // No passphrase.
  var request = {
    content: PUBLIC_KEY_ASCII,
    passphraseCallback: goog.nullFunction
  };
  var errorCallback = mockControl.createFunctionMock('errorCallback');
  var callback = mockControl.createFunctionMock('callback');
  callback(goog.testing.mockmatchers.ignoreArgument);

  stubs.setPath('e2e.ext.actions.GetKeyDescription.prototype.execute',
      mockControl.createFunctionMock('execute'));
  var keyDescArg = new goog.testing.mockmatchers.SaveArgument(goog.isFunction);
  e2e.ext.actions.GetKeyDescription.prototype.execute(
      pgpContext, request, parentUi, keyDescArg, errorCallback);

  mockControl.$replayAll();
  var action = new e2e.ext.actions.GetKeyDescription();
  action.execute(pgpContext, request, parentUi, callback, errorCallback);
  keyDescArg.arg('');

  testCase.waitForAsync('waiting for key to be imported');
  window.setTimeout(function() {
    mockControl.$verifyAll();

    goog.dispose(parentUi);
    testCase.continueTesting();
  }, 500);
}
