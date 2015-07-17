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
 * @fileoverview Tests for the DECRYPT_VERIFY action.
 */

/** @suppress {extraProvide} */
goog.provide('e2e.ext.actions.DecryptVerifyTest');

goog.require('e2e.async.Result');
goog.require('e2e.ext.actions.DecryptVerify');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.testingstubs');
goog.require('e2e.ext.utils');
goog.require('e2e.openpgp.ContextImpl');
goog.require('e2e.openpgp.asciiArmor');
goog.require('e2e.openpgp.block.factory');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.asserts');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers.ArgumentMatcher');
goog.require('goog.testing.storage.FakeMechanism');
goog.setTestOnly();

var constants = e2e.ext.constants;
var mockControl = null;
var stubs = new goog.testing.PropertyReplacer();
var testCase = goog.testing.AsyncTestCase.createAndInstall(document.title);

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

var PRIVATE_KEY_ASCII =
    '-----BEGIN PGP PRIVATE KEY BLOCK-----\n' +
    'Version: GnuPG v1.4.11 (GNU/Linux)\n' +
    '\n' +
    'lQIGBFHMug4BBACW9E+4EJXykFpkdHS1K7nkTFcvFHpnJsbHSB99Px6ib6jusVNJ\n' +
    'SjWhbWlcQXXpwDKRKKItRHE4v2zin89+hWPxQEU4l79S17i8xSXT8o02I4e7cPrj\n' +
    'j1JSyQk2YpIK5zNO7cU1IlVRHrTmvrp8ip9exF9D5UqQGxmXncjtJxsF8wARAQAB\n' +
    '/gkDAgxGSvTcN/9nYDs6DJVcH5zs/RiEw8xwMhVxHepb0D0jHDxWpPxHoT6enWSS\n' +
    'expqlvP6Oclgp0AgUBZNLr1G8i6cFTbH8VP1f+be3isyt/DzBYUE3GEBj/6pg2ft\n' +
    'tRgUs/yWT731BkvK6o3kMBm5OJtOSi6rBwvNgfgA3KLlv4QknOHAFoEZL+CpsjWn\n' +
    'SPE7SdAPIcIiT4aIrIe4RWm0iP1HcCfhoGgvbMlrB9r5uQdlenRxWwhP+Tlik5A9\n' +
    'uYqrAT4Rxb7ce+IDuWPHGOZVIQr4trXegGpCHqfi0DgZ0MOolaSnfcrRDZMy0zAd\n' +
    'HASBijOSPTZiF1aSg/p6ghqBvDwRvRgLv1HNdaObH+LRpr/AI/t0o6AmqWdeuLIG\n' +
    'TctvYIIEZNvThDvYzjcpoxz03qRD3I+b8nuyweKH/2bUSobHc6EacHYSUML8SxRC\n' +
    'TcM/iyDcplK5g1Rul73fhAjw3A9Y6elGiitzmO/oeAi2+Oh7XrUdnaG0BnRlc3Qg\n' +
    'NIi4BBMBAgAiBQJRzLoOAhsDBgsJCAcDAgYVCAIJCgsEFgIDAQIeAQIXgAAKCRAG\n' +
    '/5ysCS2oCL2SA/9EV9j3T/TM3VRD0NvNySHodcxCP1BF0zm/M84I/WHQsGKmHStf\n' +
    'CqqEGruB8E6NHQMJwNp1TzcswuxE0wiTJiXKe3w3+GZhPHdW5zcgiMKKYLn80Tk6\n' +
    'fUMx1zVZtXlSBYCN5Op/axjQRyb+fGnXOhmboqQodYaWS7qhJWQJilH6ip0CBgRR\n' +
    'zLoOAQQAw0zLIR7cmIS5lgu+/dxZThZebZHBH3RSiUZt9JP/cpMuHLs//13uLlzO\n' +
    '9kmkyNQ34ulCM+WbhU8cN25wF2r/kleEOHWaNIW+I1PGGkHwy+E7Eae7juoqsXfJ\n' +
    '5bIfSZwShOhZPwluRaDGWd/8hJt6avduFL9gGZTunWn4F3nMqjUAEQEAAf4JAwIM\n' +
    'Rkr03Df/Z2BQOTPSVVkZoaZ2FC7fly+54YG9jWBCAwR6P8Os8Cp1BM8BG+E6jL3b\n' +
    'X7djq70YwF9t1NMas2sXviGfAZEpZZnjQYfcl6EsvBciDspzYQKiSdndCehuoA4g\n' +
    'QYJ0M9XzBtCaCJ7ti2azTNAYYtw0vWkvGfgzWxw6IbLttHRIWEdvBMul+u2NzPhy\n' +
    'x8MpulrIyAER0SgaE0oJlHm8LfjV/qJd4Gpb9NG9QmdFrpPrIvDFh/mJC6CyqdVU\n' +
    'ZfahmuzfFANMEZehsrFHZmpIAzfrv5BBppVV4/vVVuoR74ohcur36sqiSZPI4pkg\n' +
    'LE7BR0A4PGdSRroZZFB4djV+6dIM0LKwqb+d50UUsJy7JIyIFHZAR70tEIfyyF0I\n' +
    '7ZzlmO9ebwy/XiJnxYuVKh3M1q97b7lGlVGD4hvi37jv+YYqLe4Rd4T9Ho+qM33T\n' +
    'OfVHAfr6v5YhlnaMYfKC7407kWA9bRnItdjy/m5br05bncH7iJ8EGAECAAkFAlHM\n' +
    'ug4CGwwACgkQBv+crAktqAhENwQAkMY/nds36KgzwfMPpxtBaq8GbrUqY1r8lBl6\n' +
    'a/bi8qeOuEgQmIxM2OpVPtL04c1c1hLflPCi1SQUlCIh3DkEGQIcy0/wxUZdCvZK\n' +
    '0mF5nZSq6tez3CwqbeOA4nBOLwbxho50VqxBpR4qypYrB2ipykxlwiqudEe0sE2b\n' +
    '1KwNtVw=\n' +
    '=wHzz\n' +
    '-----END PGP PRIVATE KEY BLOCK-----';

var USER_ID = 'test 4';


function setUp() {
  mockControl = new goog.testing.MockControl();

  e2e.ext.testingstubs.initStubs(stubs);
  testCase.stepTimeout = 2000;
}


function tearDown() {
  stubs.reset();
  mockControl.$tearDown();
}


function testExecute() {
  var pgpContext = new e2e.openpgp.ContextImpl(
      new goog.testing.storage.FakeMechanism());
  // No passphrase.
  e2e.async.Result.getValue(pgpContext.initializeKeyRing(''));

  var pwdCallback = function(uid) {
    return e2e.async.Result.toResult('test');
  };
  var plaintext = 'some secret message.';

  var errorCallback = mockControl.createFunctionMock('errorCallback');
  var callback = mockControl.createFunctionMock('callback');
  callback(plaintext);

  var action = new e2e.ext.actions.DecryptVerify();
  var encryptionKey = e2e.openpgp.block.factory.parseByteArrayMulti(
      e2e.openpgp.asciiArmor.parse(PUBLIC_KEY_ASCII).data)[0];

  // Ensure that the signers of the message are verified.
  stubs.setPath('e2e.ext.utils.showNotification',
      mockControl.createFunctionMock('showNotification'));
  e2e.ext.utils.showNotification(
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertContains('promptDecryptionSuccessMsg', arg);
        assertContains('promptVerificationSuccessMsg', arg);
        assertContains(USER_ID, arg);
        return true;
      }), goog.nullFunction);

  mockControl.$replayAll();

  testCase.waitForAsync('Importing private key.');
  pgpContext.importKey(pwdCallback, PRIVATE_KEY_ASCII).addCallback(function() {
    testCase.waitForAsync('Importing public key.');
    pgpContext.importKey(pwdCallback, PUBLIC_KEY_ASCII).addCallback(function() {
      testCase.waitForAsync('Fetching encryption keys.');
      pgpContext.searchPublicKey(USER_ID).addCallback(function(encryptionKeys) {
        testCase.waitForAsync('Fetching signing keys.');
        pgpContext.searchPrivateKey(USER_ID).addCallback(function(signingKeys) {
          testCase.waitForAsync('Encrypting message.');
          pgpContext.encryptSign(
              plaintext, [], encryptionKeys, [], signingKeys[0]).
              addCallback(function(result) {
                testCase.waitForAsync('Decrypting message.');
                action.execute(pgpContext, {
                  content: result,
                  passphraseCallback: pwdCallback
                }, null, function(result) {
                  callback(result);
                  mockControl.$verifyAll();
                  testCase.continueTesting();
                }, errorCallback);
              }).addErrback(fail);
        }).addErrback(fail);
      }).addErrback(fail);
    }).addErrback(fail);
  }).addErrback(fail);
}

function testExecuteClearsign() {
  var pgpContext = new e2e.openpgp.ContextImpl(
      new goog.testing.storage.FakeMechanism());
  // No passphrase.
  e2e.async.Result.getValue(pgpContext.initializeKeyRing(''));

  var pwdCallback = function(uid) {
    return e2e.async.Result.toResult('test');
  };
  var plaintext = 'some clearsign message.';

  var errorCallback = mockControl.createFunctionMock('errorCallback');
  var callback = mockControl.createFunctionMock('callback');
  callback(plaintext);

  var action = new e2e.ext.actions.DecryptVerify();
  var encryptionKey = e2e.openpgp.block.factory.parseByteArrayMulti(
      e2e.openpgp.asciiArmor.parse(PUBLIC_KEY_ASCII).data)[0];

  // Ensure that the signers of the message are verified.
  stubs.setPath('e2e.ext.utils.showNotification',
      mockControl.createFunctionMock('showNotification'));
  e2e.ext.utils.showNotification(
      new goog.testing.mockmatchers.ArgumentMatcher(function(arg) {
        assertContains('promptMessageNotEncryptedMsg', arg);
        assertContains('promptVerificationSuccessMsg', arg);
        assertContains(USER_ID, arg);
        return true;
      }), goog.nullFunction);

  mockControl.$replayAll();

  testCase.waitForAsync('Importing private key.');
  pgpContext.importKey(pwdCallback, PRIVATE_KEY_ASCII).addCallback(function() {
    testCase.waitForAsync('Importing public key.');
    pgpContext.importKey(pwdCallback, PUBLIC_KEY_ASCII).addCallback(function() {
      testCase.waitForAsync('Fetching signing keys.');
      pgpContext.searchPrivateKey(USER_ID).addCallback(function(signingKeys) {
        testCase.waitForAsync('Encrypting message.');
        pgpContext.encryptSign(
            plaintext, [], [], [], signingKeys[0]).
            addCallback(function(result) {
              testCase.waitForAsync('Verifying clearsign message.');
              action.execute(pgpContext, {
                content: result,
                passphraseCallback: pwdCallback
              }, null, function(result) {
                callback(result);
                mockControl.$verifyAll();
                testCase.continueTesting();
              }, errorCallback);
            }).addErrback(fail);
      }).addErrback(fail);
    }).addErrback(fail);
  }).addErrback(fail);
}
