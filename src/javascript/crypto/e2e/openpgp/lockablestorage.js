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
 * @fileoverview Class to provide storage container that is optionally encrypted
 * and authenticated.
 */

goog.provide('e2e.openpgp.LockableStorage');

goog.require('e2e');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Aes');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.ciphermode.Cfb');
goog.require('e2e.hash.Sha1');
goog.require('e2e.openpgp.IteratedS2K');
goog.require('e2e.random');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.crypt.Hmac');
goog.require('goog.crypt.Sha256');
goog.require('goog.crypt.base64');
goog.require('goog.object');



/**
 * Class to provide a storage container optionally encrypted and authenticated
 * in the persistent storage. Uses any Closure storage mechanism backend.
 * Encryption and HMAC keys are derived from a passphrase.
 * If needed, the passphrase is obtained asynchronously via a passphrase
 * callback function to unlock the container. The container can be locked at
 * runtime to force prompting for a passphrase before allowing access to the
 * data.
 * @param {!goog.storage.mechanism.Mechanism} storageMechanism persistent
 *    storage mechanism.
 * @param {function(): !e2e.async.Result<string>=} opt_passphraseCallback
 *    Callback used to deliver the passphrase.
 * @param {string=} opt_storageKeyName The storage's key under which the user
 *    data is stored in storageMechanism.
 * @param {string=} opt_saltKeyName The storage's key under which the salt is
 *    stored in storageMechanism.
 * @constructor
 */
e2e.openpgp.LockableStorage = function(storageMechanism,
    opt_passphraseCallback, opt_storageKeyName, opt_saltKeyName) {
  /**
   * The persistent storage mechanism.
   * @private {!goog.storage.mechanism.Mechanism}
   */
  this.storage_ = storageMechanism;
  /**
   * The callback used to ask for a passphrase if the storage needs to be
   * unlocked.
   * @private {(function(): !e2e.async.Result<string>|undefined)}
   */
  this.passphraseCallback_ = opt_passphraseCallback;
  /**
   * Local copy of the decrypted data. Null when the storage is locked.
   * Undefined if the storage has not yet been read.
   * @private {Object|undefined}
   */
  this.decryptedData_;
  /**
   * The passphrase used to encrypt the storage.
   * @private {string}
   */
  this.passphrase_ = '';
  /**
   * The storage's key under which the user data is stored.
   * @private {string}
   */
  this.storageKey_ = opt_storageKeyName ||
      e2e.openpgp.LockableStorage.DEFAULT_STORAGE_KEY_;
  /**
   * The storage's key under which the salt is stored base64 encoded.
   * @private {string}
   */
  this.saltKey_ = opt_saltKeyName ||
      e2e.openpgp.LockableStorage.DEFAULT_SALT_KEY_;
  /**
   * Async result that will be resolved when the storage have been read from.
   * Errors are ignored, as at that time the correct passphrase might not be
   * available. This will be explicitly handled during unlock() calls.
   * @private {!e2e.async.Result<boolean>}
   */
  this.whenReady_ = this.readPersisted_().addErrback(goog.nullFunction);
};


/**
 * Returns a result that will be resolved with the LockableStorage when the
 * underlying storage has been read from. Use this to avoid race conditions that
 * the constructor may introduce.
 * @param {!goog.storage.mechanism.Mechanism} storageMechanism persistent
 *    storage mechanism.
 * @param {function(): !e2e.async.Result<string>=} opt_passphraseCallback
 *    Callback used to deliver the passphrase.
 * @param {string=} opt_storageKeyName The storage's key under which the user
 *    data is stored in storageMechanism.
 * @param {string=} opt_saltKeyName The storage's key under which the salt is
 *    stored in storageMechanism.
 * @return {!e2e.async.Result<!e2e.openpgp.LockableStorage>} The storage ready
 * to be used (check if it needs unlocking with isLocked()).
 */
e2e.openpgp.LockableStorage.launch = function(storageMechanism,
    opt_passphraseCallback, opt_storageKeyName, opt_saltKeyName) {
  var storage = new e2e.openpgp.LockableStorage(storageMechanism,
      opt_passphraseCallback, opt_storageKeyName, opt_saltKeyName);
  var returnStorage = function() {
    return storage;
  };
  return /** @type {!e2e.async.Result.<!e2e.openpgp.LockableStorage>} */ (
      storage.whenReady_.addCallbacks(returnStorage, returnStorage));
};


/**
 * The default storage's key under which the user data is stored.
 * @const
 * @private
 */
e2e.openpgp.LockableStorage.DEFAULT_STORAGE_KEY_ = 'LockableStorage';


/**
 * The version of the LockableStorage encryption format.
 * @const
 * @private
 */
e2e.openpgp.LockableStorage.VERSION_ = 1;


/**
 * Indicator that the LockableStorage is stored unencrypted.
 * @const
 * @private
 */
e2e.openpgp.LockableStorage.UNENCRYPTED_ = 'U';


/**
 * Indicator that the LockableStorage is stored encrypted.
 * @const
 * @private
 */
e2e.openpgp.LockableStorage.ENCRYPTED_ = 'E';


/**
 * Size in bytes of the HMAC output.
 * @const
 * @private
 */
e2e.openpgp.LockableStorage.HMAC_SIZE_ = 32;


/**
 * Size in bytes for the HMAC key. Must be <= HASH_BLOCK_SIZE_.
 * @const
 * @private
 */
e2e.openpgp.LockableStorage.HMAC_KEY_SIZE_ = 16;


/**
 * The default storage's key under which the salt is stored base64 encoded.
 * @const
 * @private
 */
e2e.openpgp.LockableStorage.DEFAULT_SALT_KEY_ = 'Salt';


/**
 * Size in bytes for the Iterated and Salted s2k salt, as specified in
 * https://tools.ietf.org/html/rfc4880#section-3.7.1.3
 * @const
 * @private
 */
e2e.openpgp.LockableStorage.SALT_SIZE_ = 8;


/**
 * Sets the passphrase callback.
 * @param {function(): !e2e.async.Result<string>} passphraseCallback
 */
e2e.openpgp.LockableStorage.prototype.setPassphraseCallback = function(
    passphraseCallback) {
  this.passphraseCallback_ = passphraseCallback;
};


/**
 * Checks if persisted storage is encrypted.
 * @return {!e2e.async.Result<boolean>}
 */
e2e.openpgp.LockableStorage.prototype.isEncrypted = function() {
  var serialized = this.storage_.get(this.storageKey_);
  return e2e.async.Result.toResult(goog.isString(serialized) &&
      this.isSerializationEncrypted_(serialized));
};


/**
 * Checks if the given serialization is encrypted.
 * @param  {string}  serializedData
 * @return {boolean} True iff the serialized data hints that it's encrypted.
 * @private
 */
e2e.openpgp.LockableStorage.prototype.isSerializationEncrypted_ = function(
    serializedData) {
  return serializedData.charAt(0) == e2e.openpgp.LockableStorage.ENCRYPTED_;
};


/**
 * Internal implementation of readPersisted.
 * @return {boolean|e2e.async.Result<boolean>} True iff the persistent storage
 *     is encrypted.
 * @private
 */
e2e.openpgp.LockableStorage.prototype.readPersistedInternal_ = function() {
  // TODO(koto): Add support for truly async storage backends, dropping
  // dependency on (sync) goog.storage.
  var serialized = this.storage_.get(this.storageKey_);
  // Mark the storage as locked (deserialize will unlock it).
  this.decryptedData_ = null;
  if (!goog.isString(serialized)) {
    // No serialized data was found. This is the first use for the given
    // backend, initialize with an empty object.
    this.decryptedData_ = {};
    return this.persist_();
  }
  var isEncrypted = this.isSerializationEncrypted_(serialized);
  serialized = serialized.substr(1);
  if (!isEncrypted) {
    this.deserialize_(serialized);
    return false;
  }
  if (this.passphrase_) {
    serialized = this.decrypt_(serialized);
    this.deserialize_(serialized);
    return true;
  }
  throw new Error('No passphrase given, but the storage is encrypted.');
};


/**
 * Reads and deserializes data in a persistent storage, optionally decrypting
 * it if the passphrase is known.
 * @return {!e2e.async.Result<boolean>} Async result, notifying the caller if
 *     the persistent storage is encrypted.
 * @private
 */
e2e.openpgp.LockableStorage.prototype.readPersisted_ = function() {
  // Creates a result and immediately calls readPersistedInternal_ - this allows
  // to easily catch the errors thrown in the errback.
  return e2e.async.Result.toResult(undefined).addCallback(
      this.readPersistedInternal_, this);
};


/**
 * Checks if the storage is currently locked and needs a passphrase to be
 * unlocked.
 * @return {boolean}
 */
e2e.openpgp.LockableStorage.prototype.isLocked = function() {
  return goog.isNull(this.decryptedData_);
};


/**
 * Persists the (optionally encrypted) data in the storage mechanism.
 * @return {!e2e.async.Result<boolean>} Result to resolve with true iff
 * the storage is encrypted (false otherwise).
 * @private
 */
e2e.openpgp.LockableStorage.prototype.persist_ = function() {
  var serialized = this.serialize_();
  var shouldEncrypt = Boolean(this.passphrase_);
  if (shouldEncrypt) {
    var encrypted = this.encrypt_(serialized);
    this.storage_.set(this.storageKey_,
        e2e.openpgp.LockableStorage.ENCRYPTED_ + encrypted);
  } else {
    this.storage_.set(this.storageKey_,
        e2e.openpgp.LockableStorage.UNENCRYPTED_ + serialized);
  }
  return e2e.async.Result.toResult(shouldEncrypt);
};


/**
 * Deserializes private and public data from a string.
 * @param {string} s The serialized data.
 * @private
 */
e2e.openpgp.LockableStorage.prototype.deserialize_ = function(s) {
  try {
    this.decryptedData_ = /** @type {Object} */ (JSON.parse(s)) || {};
  } catch (ex) {
    throw new Error('Invalid serialization: ' + ex.message);
  }
};


/**
 * Decrypts a string with a passphrase.
 * @param {string} ciphertext String to decrypt.
 * @return {string}
 * @private
 */
e2e.openpgp.LockableStorage.prototype.decrypt_ = function(ciphertext) {
  var decoded = goog.crypt.base64.decodeStringToByteArray(ciphertext);
  var digestSaved = decoded.splice(0, e2e.openpgp.LockableStorage.HMAC_SIZE_);
  var ciphers = this.prepareCiphers_();
  var digest = ciphers.hmac.getHmac(decoded);
  if (!e2e.compareByteArray(digest, digestSaved)) {
    throw new Error('HMAC does not match! Storage modified or ' +
        'invalid passphrase.');
  }
  var version = decoded.shift();
  if (version != e2e.openpgp.LockableStorage.VERSION_) {
    throw new Error('Unknown LockableStorage version');
  }
  var iv = decoded.splice(0, ciphers.blockSize);
  var plaintext = e2e.async.Result.getValue(
      ciphers.cipher.decrypt(decoded, iv));
  return e2e.byteArrayToString(plaintext);
};


/**
 * Prepares the ciphers for the encryption/decryption based on the passphrase.
 * The algorithms choice here replicates what legacy KeyRing object uses, to
 * keep the backwards-compatibility. In the future, new schemes can be used,
 * using the version field to distinguish them.
 * @private
 * @return {{cipher: !e2e.ciphermode.CipherMode,
 *     hmac: !goog.crypt.Hmac,
 *     blockSize: number}} Prepared cipher objects.
 */
e2e.openpgp.LockableStorage.prototype.prepareCiphers_ = function() {
  goog.asserts.assert(this.passphrase_, 'Passphrase not set');
  // TODO(adhintz) Cache the s2k result instead of the passphrase.
  var salt = this.getOrCreateSalt_();
  var s2k = new e2e.openpgp.IteratedS2K(
      new e2e.hash.Sha1, salt, 96);
  var aes = new e2e.cipher.Aes(e2e.cipher.Algorithm.AES128);
  var doubleKey = s2k.getKey(
      e2e.stringToByteArray(this.passphrase_),
      (aes.keySize + e2e.openpgp.LockableStorage.HMAC_KEY_SIZE_));
  var key = {};
  key.key = doubleKey.splice(0, aes.keySize);
  var hmacKey = doubleKey;
  aes.setKey(key);
  return {
    cipher: new e2e.ciphermode.Cfb(aes),
    hmac: new goog.crypt.Hmac(new goog.crypt.Sha256(), hmacKey),
    blockSize: aes.blockSize
  };
};


/**
 * Serializes the storage data to a string.
 * @return {string}
 * @private
 */
e2e.openpgp.LockableStorage.prototype.serialize_ = function() {
  return JSON.stringify(this.decryptedData_ || {});
};


/**
 * Encrypts a string with a passphrase.
 * @param {string} plaintext String to encrypt.
 * @return {string}
 * @private
 */
e2e.openpgp.LockableStorage.prototype.encrypt_ = function(plaintext) {
  goog.asserts.assert(this.passphrase_, 'passphrase not set');
  var ciphers = this.prepareCiphers_();
  var iv = e2e.random.getRandomBytes(ciphers.blockSize);
  var ciphertext = e2e.async.Result.getValue(ciphers.cipher.encrypt(
      e2e.stringToByteArray(plaintext), iv));
  var formatted = goog.array.concat(
      e2e.openpgp.LockableStorage.VERSION_,
      iv,
      ciphertext);
  var digest = ciphers.hmac.getHmac(formatted);
  formatted = goog.array.concat(digest, formatted);
  return goog.crypt.base64.encodeByteArray(formatted);
};


/**
 * Removes the passphrase and the decrypted data from the cache. Storage will
 * need to be unlocked before the data can be used.
 */
e2e.openpgp.LockableStorage.prototype.lock = function() {
  this.decryptedData_ = null;
  this.passphrase_ = '';
};


/**
 * Encrypts the data in persistent storage with a key derived from a given
 * passphrase. If the passphrase is an empty string, the storage will be
 * unencrypted. To protect the caller from destroying the data, LockableStorage
 * needs to be unlocked at the time of calling this method.
 * @param {string} passphrase The new passphrase.
 * @return {!e2e.async.Result<boolean>} Is the storage encrypted after changing
 *     the passphrase.
 */
e2e.openpgp.LockableStorage.prototype.setPassphrase = function(passphrase) {
  if (this.isLocked()) {
    return e2e.async.Result.toError(new Error(
        'Cannot set the passphrase on a locked LockableStorage.'));
  }
  this.passphrase_ = passphrase;
  return this.persist_();
};


/**
 * Returns a passphrase.
 * @return {string} The passphrase.
 */
e2e.openpgp.LockableStorage.prototype.getPassphrase = function() {
  return this.passphrase_;
};


/**
 * Retrieves a data stored under a given key. Will trigger unlock() and ask for
 * a passphrase if needed.
 * @param  {string} key Data key
 * @return {!e2e.async.Result<*>} Data stored under a given key.
 */
e2e.openpgp.LockableStorage.prototype.get = function(key) {
  return this.unlock().addCallback(function() {
    return e2e.async.Result.toResult(this.decryptedData_[key]);
  }, this);
};


/**
 * Retrieves a data stored under multiple keys. Will trigger unlock() and ask
 * for a passphrase if needed.
 * @param  {Array<string>} keys Data keys
 * @return {!e2e.async.Result<Object.<string,*>>} Data stored under given keys.
 */
e2e.openpgp.LockableStorage.prototype.getMultiple = function(keys) {
  return this.unlock().addCallback(function() {
    var obj = {};
    goog.array.forEach(keys, function(key) {
      obj[key] = this.decryptedData_[key];
    }, this);
    return e2e.async.Result.toResult(obj);
  }, this);
};


/**
 * Removes a data stored under a given key. Will trigger unlock() and ask for
 * a passphrase if needed. Errback will be triggerred if unlocking failed
 * (e.g. when user returned an error from the passphrase callback).
 * @param  {string} key
 * @return {!e2e.async.Result<undefined>} Result ready when the data is
 *     persisted.
 */
e2e.openpgp.LockableStorage.prototype.remove = function(key) {
  return this.unlock().addCallback(function() {
    delete this.decryptedData_[key];
    return this.persist_();
  }, this);
};


/**
 * Removes a data stored under multiple keys. Will trigger unlock() and ask for
 * a passphrase if needed. Errback will be triggerred if unlocking failed
 * (e.g. when user returned an error from the passphrase callback).
 * @param  {!Array.<string>} keys
 * @return {!e2e.async.Result<undefined>} Result ready when the data is
 *     persisted.
 */
e2e.openpgp.LockableStorage.prototype.removeMultiple = function(keys) {
  return this.unlock().addCallback(function() {
    goog.array.forEach(keys, function(key) {
      delete this.decryptedData_[key];
    }, this);
    return this.persist_();
  }, this);
};


/**
 * Sets a data stored under a given key. Will trigger unlock() and ask for
 * a passphrase if needed.
 * @param  {string} key
 * @param {*} value
 * @return {!e2e.async.Result<undefined>} Result ready when the data is
 *     persisted.
 */
e2e.openpgp.LockableStorage.prototype.set = function(key, value) {
  return this.unlock().addCallback(function() {
    this.decryptedData_[key] = value;
    return this.persist_();
  }, this);
};


/**
 * Sets a data into persistent storage. Will trigger unlock() and ask for
 * a passphrase if needed.
 * @param  {Object} values Object containing all values to persist.
 * @return {!e2e.async.Result<undefined>} Result ready when the data is
 *     persisted.
 */
e2e.openpgp.LockableStorage.prototype.setMultiple = function(values) {
  return this.unlock().addCallback(function() {
    goog.object.forEach(values, function(value, key) {
      this.decryptedData_[key] = value;
    }, this);
    return this.persist_();
  }, this);
};


/**
 * Tries to unlock the storage mechanism. If needed, this will trigger
 * passphrase callbacks until a correct passphrase has been given.
 * @return {!e2e.async.Result} The result resolved after the storage is
 *     successfully unlocked.
 */
e2e.openpgp.LockableStorage.prototype.unlock = function() {
  // Data not yet read from the storage.
  if (!goog.isDef(this.decryptedData_)) {
    return this.readPersisted_().addCallback(this.unlock, this);
  }
  return this.tryPassphrase_(this.passphrase_);
};


/**
 * Tries to unlock the storage mechanism once with a given passphrase. If the
 * passphrase is correct (or the storage is already unlocked), success callback
 * will be called. If the passphrase is incorrect, errback will be called
 * instead.
 * @param  {string} passphraseTry
 * @return {!e2e.async.Result}
 */
e2e.openpgp.LockableStorage.prototype.unlockWithPassphrase = function(
    passphraseTry) {
  if (!this.isLocked()) {
    return e2e.async.Result.toResult(true);
  }
  this.passphrase_ = passphraseTry;
  return this.readPersisted_();
};


/**
 * Triggers a passhprase callback.
 * @return {!e2e.async.Result} The result that will be resolved
 * when the storage has been unlocked.
 * @private
 */
e2e.openpgp.LockableStorage.prototype.askPassphrase_ = function() {
  if (!goog.isFunction(this.passphraseCallback_)) {
    return e2e.async.Result.toError(
        new Error('No passphrase callback was given.'));
  }
  return this.passphraseCallback_().addCallback(this.tryPassphrase_, this);
};


/**
 * Tries to decrypt a storage with a single passphrase. If that's unsuccessful,
 * asks for passphrase again.
 * @param  {string} passphraseTry The passphrase.
 * @return {!e2e.async.Result} The result that will be resolved when the storage
 * has been unlocked.
 * @private
 */
e2e.openpgp.LockableStorage.prototype.tryPassphrase_ = function(passphraseTry) {
  // TODO(koto): Check error type. Some passphrases might be correct, but e.g.
  // underlying storage is broken, so the user should be notified instead.
  return this.unlockWithPassphrase(passphraseTry).addErrback(
      this.askPassphrase_, this);
};


/**
 * Gets current salt or generates one if needed.
 * @return {!e2e.ByteArray}
 * @private
 */
e2e.openpgp.LockableStorage.prototype.getOrCreateSalt_ = function() {
  var serialized = this.storage_.get(this.saltKey_);
  var salt;
  if (serialized) {
    salt = goog.crypt.base64.decodeStringToByteArray(serialized);
  } else {
    salt = e2e.random.getRandomBytes(
        e2e.openpgp.LockableStorage.SALT_SIZE_);
    serialized = goog.crypt.base64.encodeByteArray(salt);
    this.storage_.set(this.saltKey_, serialized);
  }
  return salt;
};
