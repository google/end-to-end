/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
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
 * @fileoverview Definition of the e2e.openpgp.WorkerContextImpl class.
 */
goog.provide('e2e.openpgp.WorkerContextImpl');

goog.require('e2e.async.Client');
goog.require('e2e.async.Result');
goog.require('e2e.openpgp.Context');



/**
 * OpenPGP Context implementation, that relays all operations to a
 * {@link ContextService} available over a {@link MessagePort}. Use to create
 * a WebWorker and unblock the UI thread when using OpenPGP Context.
 * @implements {e2e.openpgp.Context}
 * @param {!MessagePort} port Port to use to communicate with the
 *     ContextService.
 * @constructor
 * @extends {e2e.async.Client}
 */
e2e.openpgp.WorkerContextImpl = function(port) {
  goog.base(this, port);
};
goog.inherits(e2e.openpgp.WorkerContextImpl, e2e.async.Client);


/**
 * Name of the service to connect to.
 * @type {string}
 */
e2e.openpgp.WorkerContextImpl.SERVICE_NAME = 'e2e.openpgp.ContextService';


/**
 * Launches the worker context implementation. Connects to a ContextService
 * entangled with a Peer and waits for that service's Context to initialize.
 * WorkerContextImpl resolved in the result is then ready to accept requests.
 * @param {!e2e.async.Peer} peer Peer that is connected to the ContextService
 *   implementation.
 * @return {!e2e.async.Result.<!e2e.openpgp.WorkerContextImpl>} The context.
 */
e2e.openpgp.WorkerContextImpl.launch = function(peer) {
  var result = new e2e.async.Result();
  peer.findService(e2e.openpgp.WorkerContextImpl.SERVICE_NAME, {}).addCallback(
      function(response) {
        try {
          var contextImpl = new e2e.openpgp.WorkerContextImpl(response.port);
          result.callback(contextImpl);
        } catch (e) {
          result.errback(e.message);
        }
      }, result.errback);
  return result;
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.hasPassphrase = function() {
  return /** @type {!e2e.async.Result.<boolean>} */ (
      this.deferredCall('hasPassphrase', []));
};


/** @override */
e2e.openpgp.WorkerContextImpl.prototype.armorOutput = true;


/** @override */
e2e.openpgp.WorkerContextImpl.prototype.setArmorHeader = function(name, value) {
  return /** @type {!e2e.async.Result.<undefined>} */ (
      this.deferredCall('setArmorHeader', [name, value]));
};


/** @override */
e2e.openpgp.WorkerContextImpl.prototype.keyServerUrl = null;


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.setKeyRingPassphrase = function(
    passphrase) {
  return /** @type {!e2e.async.Result.<undefined>} */ (
      this.deferredCall('setKeyRingPassphrase', [passphrase]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.changeKeyRingPassphrase = function(
    passphrase) {
  return /** @type {!e2e.async.Result.<undefined>} */ (
      this.deferredCall('changeKeyRingPassphrase', [passphrase]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.isKeyRingEncrypted = function() {
  return /** @type {!e2e.async.Result.<boolean>} */ (
      this.deferredCall('isKeyRingEncrypted', []));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.getKeyDescription = function(key) {
  return /** @type {!e2e.openpgp.KeyResult} */ (
      this.deferredCall('getKeyDescription', [key]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.importKey = function(
    passphraseCallback, key) {
  return /** @type {!e2e.openpgp.ImportKeyResult} */ (
      this.deferredCall('importKey', [passphraseCallback, key]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.generateKey = function(
    keyAlgo, keyLength, subkeyAlgo, subkeyLength,
    name, comment, email, expirationDate) {
  return /** @type {!e2e.openpgp.GenerateKeyResult} */ (
      this.deferredCall('generateKey', [
        keyAlgo, keyLength, subkeyAlgo, subkeyLength,
        name, comment, email, expirationDate]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.encryptSign = function(
    plaintext, options, encryptionKeys, passphrases, opt_signatureKey) {
  return /** @type {!e2e.openpgp.EncryptSignResult} */ (
      this.deferredCall('encryptSign', [
        plaintext, options, encryptionKeys, passphrases, opt_signatureKey
      ]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.verifyDecrypt = function(
    passphraseCallback, encryptedMessage) {
  return /** @type {!e2e.openpgp.VerifyDecryptResult} */ (
      this.deferredCall('verifyDecrypt', [
        passphraseCallback, encryptedMessage]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.searchPublicKey = function(uid) {
  return /** @type {!e2e.openpgp.KeyResult} */ (
      this.deferredCall('searchPublicKey', [uid]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.searchPrivateKey = function(uid) {
  return /** @type {!e2e.openpgp.KeyResult} */ (
      this.deferredCall('searchPrivateKey', [uid]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.searchKey = function(uid) {
  return /** @type {!e2e.openpgp.KeyResult} */ (
      this.deferredCall('searchKey', [uid]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.getAllKeys = function(opt_priv) {
  return /** @type {!e2e.async.Result.<!e2e.openpgp.KeyRingMap>} */ (
      this.deferredCall('getAllKeys', [opt_priv]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.deleteKey = function(uid) {
  return /** @type {!e2e.async.Result.<undefined>} */ (
      this.deferredCall('deleteKey', [uid]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.exportKeyring = function(armored) {
  return /** @type {!e2e.async.Result.<!e2e.ByteArray|string>} */ (
      this.deferredCall('exportKeyring', [armored]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.getKeyringBackupData = function() {
  return /** @type {!e2e.async.Result.<e2e.openpgp.KeyringBackupInfo>} */ (
      this.deferredCall('getKeyringBackupData', []));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.restoreKeyring = function(data, email) {
  return /** @type {!e2e.async.Result.<undefined>} */ (
      this.deferredCall('restoreKeyring', [data, email]));
};
