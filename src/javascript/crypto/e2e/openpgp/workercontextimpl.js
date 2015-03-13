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

goog.require('e2e.async.Result');
goog.require('e2e.messaging.AsyncRespondingChannel');
goog.require('e2e.openpgp.Context');
goog.require('e2e.openpgp.ContextService');
goog.require('goog.messaging.BufferedChannel');
goog.require('goog.messaging.PortChannel');



/**
 * OpenPGP Context implementation, that relays all operations to a
 * {@link ContextService} installed in a WebWorker thread over a {@link
 * e2e.messaging.AsyncRespondingChannel}. Use to unblock UI thread when using
 * OpenPGP Context.
 * @implements {e2e.openpgp.Context}
 * @param {string} workerBootstrapPath Path to a worker bootstrap file that
 *     registers a ContextService over an AsyncRespondingChannel.
 * @constructor
 */
e2e.openpgp.WorkerContextImpl = function(workerBootstrapPath) {
  /**
   * @type {!WebWorker}
   * @private
   */
  this.worker_;
  /**
   * @type {e2e.messaging.AsyncRespondingChannel}
   * @private
   */
  this.channel_ = null;
  this.initWorker_(workerBootstrapPath);
  this.initChannel_();
};


/**
 * Creates a WebWorker thread.
 * @param {string} workerBootstrapPath Path to worker.
 * @private
 * @suppress {invalidCasts} Worker is a WebWorker.
 */
e2e.openpgp.WorkerContextImpl.prototype.initWorker_ = function(
    workerBootstrapPath) {
  this.worker_ = /** @type {!WebWorker} */ (new Worker(workerBootstrapPath));
};


/**
 * Sets up a messaging channel with the worker.
 * @private
 */
e2e.openpgp.WorkerContextImpl.prototype.initChannel_ = function() {
  this.channel_ = new e2e.messaging.AsyncRespondingChannel(
      new goog.messaging.BufferedChannel(
          new goog.messaging.PortChannel(this.worker_)));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.hasPassphrase = function() {
  return /** @type {!e2e.async.Result.<boolean>} */ (
      this.sendRequest_('hasPassphrase', []));
};


/** @override */
e2e.openpgp.WorkerContextImpl.prototype.armorOutput = true;


/** @override */
e2e.openpgp.WorkerContextImpl.prototype.setArmorHeader = function(name, value) {
  this.sendBlindRequest_('setArmorHeader', [name, value]);
};


/** @override */
e2e.openpgp.WorkerContextImpl.prototype.keyServerUrl = null;


/**
 * Sends a request to the worker service and returns an async result object.
 * @param {string} name Call name.
 * @param {Array<*>} params Call parameters.
 * @return {!e2e.async.Result} Result object that will be resolved with the
 *     service response.
 * @private
 */
e2e.openpgp.WorkerContextImpl.prototype.sendRequest_ = function(name, params) {
  var result = new e2e.async.Result();
  this.channel_.send(e2e.openpgp.ContextService.SERVICE_NAME,
      {
        name: name,
        params: params
      }, function(res) {
        result.callback(res);
      });
  return result;
};


/**
 * Sends a request to the worker service, ignoring the response processing.
 * @param {string} name Call name.
 * @param {Array<*>} params Call parameters.
 * @private
 */
e2e.openpgp.WorkerContextImpl.prototype.sendBlindRequest_ = function(name,
    params) {
  this.channel_.send(e2e.openpgp.ContextService.SERVICE_NAME,
      {
        name: name,
        params: params
      }, goog.nullFunction);
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.setKeyRingPassphrase = function(
    passphrase) {
  this.sendBlindRequest_('setKeyRingPassphrase', [passphrase]);
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.changeKeyRingPassphrase = function(
    passphrase) {
  this.sendBlindRequest_('changeKeyRingPassphrase', [passphrase]);
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.isKeyRingEncrypted = function() {
  return /** @type {!e2e.async.Result.<boolean>} */ (
      this.sendRequest_('isKeyRingEncrypted', []));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.getKeyDescription = function(key) {
  return /** @type {!e2e.openpgp.KeyResult} */ (
      this.sendRequest_('getKeyDescription', [key]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.importKey = function(
    passphraseCallback, key) {
  // TODO(koto): handle callbacks locally.
  return /** @type {!e2e.openpgp.ImportKeyResult} */ (
      this.sendRequest_('importKey', [null, key]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.generateKey = function(
    keyAlgo, keyLength, subkeyAlgo, subkeyLength,
    name, comment, email, expirationDate) {
  return /** @type {!e2e.openpgp.GenerateKeyResult} */ (
      this.sendRequest_('generateKey', [
        keyAlgo, keyLength, subkeyAlgo, subkeyLength,
        name, comment, email, expirationDate]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.encryptSign = function(
    plaintext, options, encryptionKeys, passphrases, opt_signatureKey) {
  return /** @type {!e2e.openpgp.EncryptSignResult} */ (
      this.sendRequest_('encryptSign', [
        plaintext, options, encryptionKeys, passphrases, opt_signatureKey
      ]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.verifyDecrypt = function(
    passphraseCallback, encryptedMessage) {
  // TODO(koto): handle callbacks locally.
  return /** @type {!e2e.openpgp.VerifyDecryptResult} */ (
      this.sendRequest_('verifyDecrypt', [
        null, encryptedMessage]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.searchPublicKey = function(uid) {
  return /** @type {!e2e.openpgp.KeyResult} */ (
      this.sendRequest_('searchPublicKey', [uid]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.searchPrivateKey = function(uid) {
  return /** @type {!e2e.openpgp.KeyResult} */ (
      this.sendRequest_('searchPrivateKey', [uid]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.searchKey = function(uid) {
  return /** @type {!e2e.openpgp.KeyResult} */ (
      this.sendRequest_('searchKey', [uid]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.getAllKeys = function(opt_priv) {
  return /** @type {!e2e.async.Result.<!e2e.openpgp.KeyRingMap>} */ (
      this.sendRequest_('getAllKeys', [opt_priv]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.deleteKey = function(uid) {
  this.sendBlindRequest_('deleteKey', [uid]);
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.exportKeyring = function(armored) {
  return /** @type {!e2e.async.Result.<!e2e.ByteArray|string>} */ (
      this.sendRequest_('exportKeyring', [armored]));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.getKeyringBackupData = function() {
  return /** @type {!e2e.async.Result.<e2e.openpgp.KeyringBackupInfo>} */ (
      this.sendRequest_('getKeyringBackupData', []));
};


/** @inheritDoc */
e2e.openpgp.WorkerContextImpl.prototype.restoreKeyring = function(data, email) {
  return /** @type {!e2e.async.Result.<undefined>} */ (
      this.sendRequest_('restoreKeyring', [data, email]));
};
