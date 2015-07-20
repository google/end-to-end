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
 * @fileoverview Implements a key ring that exposes basic key management
 *    features such as generating, searching, importing, exporting keys, etc.
 *    The key ring shall be stored in Chrome's local storage, and shall be
 *    encrypted if the user provides a passphrase.
 */

goog.provide('e2e.openpgp.KeyRing');

goog.require('e2e');
goog.require('e2e.Hkdf');
goog.require('e2e.algorithm.KeyLocations');
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.hash.Sha256');
goog.require('e2e.openpgp');
goog.require('e2e.openpgp.DummyS2k');
goog.require('e2e.openpgp.EncryptedCipher');
goog.require('e2e.openpgp.KeyClient');
goog.require('e2e.openpgp.Mpi');
goog.require('e2e.openpgp.block.TransferablePublicKey');
goog.require('e2e.openpgp.block.TransferableSecretKey');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.keygenerator');
goog.require('e2e.openpgp.packet.PublicKey');
goog.require('e2e.openpgp.packet.PublicSubkey');
goog.require('e2e.openpgp.packet.SecretKey');
goog.require('e2e.openpgp.packet.SecretSubkey');
goog.require('e2e.openpgp.packet.Signature');
goog.require('e2e.openpgp.packet.SignatureSub');
goog.require('e2e.openpgp.packet.UserId');
goog.require('e2e.random');
goog.require('e2e.signer.Algorithm');
goog.require('goog.array');
goog.require('goog.async.DeferredList');
goog.require('goog.crypt.base64');
goog.require('goog.iter');
goog.require('goog.object');
goog.require('goog.structs.Map');



/**
 * Implements a key ring that exposes basic key management features such as
 * generating, searching, importing, exporting keys, etc. The key ring shall
 * be stored in browser's local storage, and shall be encrypted if the user
 * provides a passphrase.
 * @param {!e2e.openpgp.LockableStorage} lockableStorage persistent
 *    storage mechanism.
 * @param {string=} opt_keyServerUrl The optional http key server url. If not
 *    specified then only support key operation locally.
 * @constructor
 */
e2e.openpgp.KeyRing = function(lockableStorage, opt_keyServerUrl) {
  this.localStorage_ = lockableStorage;
  if (goog.isDefAndNotNull(opt_keyServerUrl)) {
    this.keyClient_ = new e2e.openpgp.KeyClient(opt_keyServerUrl);
  }
  this.pubKeyRing_ = new goog.structs.Map();
  this.privKeyRing_ = new goog.structs.Map();
};


/**
 * Initializes the KeyRing object.
 * @param {!e2e.openpgp.LockableStorage} lockableStorage persistent
 *    storage mechanism.
 * @param {string=} opt_keyServerUrl The optional http key server url. If not
 *    specified then only support key operation locally.
 * @return {!goog.async.Deferred.<!e2e.openpgp.KeyRing>} The initialized
 *    keyring.
 */
e2e.openpgp.KeyRing.launch = function(lockableStorage, opt_keyServerUrl) {
  var keyRing = new e2e.openpgp.KeyRing(lockableStorage, opt_keyServerUrl);
  var returnKeyRing = function() {
    return keyRing;
  };
  return /** @type {!goog.async.Deferred.<!e2e.openpgp.KeyRing>} */ (
      keyRing.init_().addCallbacks(returnKeyRing, returnKeyRing));
};


/**
 * The local storage to persist key data.
 * @type {!e2e.openpgp.LockableStorage}
 * @private
 */
e2e.openpgp.KeyRing.prototype.localStorage_;


/**
 * The public key ring. It's a map keyed by email. The values are lists of
 * block.TransferablePublicKey objects associated with this email.
 * @type {!e2e.openpgp.TransferableKeyMap}
 * @private
 */
e2e.openpgp.KeyRing.prototype.pubKeyRing_;


/**
 * The private key ring. It's a map keyed by email. The values are lists of
 * block.TransferableSecretKey objects associated with this email.
 * @type {!e2e.openpgp.TransferableKeyMap}
 * @private
 */
e2e.openpgp.KeyRing.prototype.privKeyRing_;


/**
 * The key client instance that searches for and adds public keys to/from
 *    the http key server.
 * @type {e2e.openpgp.KeyClient}
 * @private
 */
e2e.openpgp.KeyRing.prototype.keyClient_ = null;


/**
 * ECC key generation seed
 * @type {e2e.ByteArray}
 * @private
 */
e2e.openpgp.KeyRing.prototype.eccSeed_;


/**
 * number of keys generated from ECC generation seed
 * @type {number}
 * @private
 */
e2e.openpgp.KeyRing.prototype.eccCount_;


/**
 * Size in bytes for the ECC key generation seed.
 * @const
 */
e2e.openpgp.KeyRing.ECC_SEED_SIZE = 16;


/**
 * Key name in LockableStorage to use for the public keyring.
 * @type {string}
 * @private
 * @const
 */
e2e.openpgp.KeyRing.PUB_KEYRING_KEY_ = 'pubKey';


/**
 * Key name in LockableStorage to use for the private keyring.
 * @type {string}
 * @private
 * @const
 */
e2e.openpgp.KeyRing.PRIV_KEYRING_KEY_ = 'privKey';


/**
 * Key name in LockableStorage to use for the ECC seed.
 * @type {string}
 * @private
 * @const
 */
e2e.openpgp.KeyRing.ECC_SEED_KEY_ = 'eccSeed';


/**
 * Key name in LockableStorage to use for the ECC counter.
 * @type {string}
 * @private
 * @const
 */
e2e.openpgp.KeyRing.ECC_COUNT_KEY_ = 'eccCount';


/**
 * @param {string} passphrase Change the passphrase for encrypting the KeyRing
 *     when stored locally. Empty string for unencrypted.
 * @return {!e2e.async.Result} Async result resolved when the data has
 * persisted.
 */
e2e.openpgp.KeyRing.prototype.changePassphrase = function(passphrase) {
  return this.localStorage_.setPassphrase(passphrase);
};


/**
 * Imports a key block to the key ring.
 * @param {!e2e.openpgp.block.TransferableKey} keyBlock The key block to
 *     import.
 * @param {!e2e.ByteArray=} opt_passphrase The passphrase to use to
 *     import the key.
 * @return {!goog.async.Deferred<boolean>} If the key import was successful.
 */
e2e.openpgp.KeyRing.prototype.importKey = function(
    keyBlock, opt_passphrase) {
  var result = e2e.async.Result.toResult(undefined);
  return result.addCallback(function() {
    var keys = [keyBlock.keyPacket].concat(keyBlock.subKeys);
    var keyRing;
    if (keyBlock instanceof e2e.openpgp.block.TransferablePublicKey) {
      keyRing = this.pubKeyRing_;
    } else if (keyBlock instanceof e2e.openpgp.block.TransferableSecretKey) {
      keyRing = this.privKeyRing_;
    } else {
      return false;
    }
    // This will throw on signature verification failures.
    keyBlock.processSignatures();
    var uids = keyBlock.getUserIds();
    goog.array.removeDuplicates(uids);
    var importedKeysResults = goog.async.DeferredList.gatherResults(
        goog.array.map(uids, function(uid) {
          return this.importKey_(uid, keyBlock, keyRing, opt_passphrase);
        }, this));
    return importedKeysResults.addCallback(function(importedKeys) {
      // Return false if any key failed to import
      // (e.g. when it already existed).
      return (importedKeys.indexOf(false) > -1);
    });
  }, this);
};


/**
 * Generates and imports to the key ring a master ECDSA key pair and a
 * subordinate ECDH key pair.
 * @param {string} email The email to associate the key to.
 * @return {e2e.async.Result.<!Array.<!e2e.openpgp.block.TransferableKey>>}
 * The generated public key and secret key in an array.
 */
e2e.openpgp.KeyRing.prototype.generateECKey = function(email) {
  return this.generateKey(email, e2e.signer.Algorithm.ECDSA, 256,
      e2e.cipher.Algorithm.ECDH, 256);
};


/**
 * Generates the next key in the sequence based on the ECC generation seed
 * @param {number} keyLength Length in bits of the key.
 * @private
 * @return {!e2e.ByteArray} Deterministic privKey based on ECC seed.
 */
e2e.openpgp.KeyRing.prototype.getNextKey_ = function(keyLength) {
  if (!this.eccSeed_) {
    this.eccSeed_ = e2e.random.getRandomBytes(
        e2e.openpgp.KeyRing.ECC_SEED_SIZE);
    this.eccCount_ = 0;
  }

  if (++this.eccCount_ > 0x7F) {
    throw new e2e.openpgp.error.UnsupportedError('Too many ECC keys generated');
  }

  if (keyLength % 8) {
    throw new e2e.openpgp.error.UnsupportedError(
        'Key length is not a multiple of 8');
  }

  return new e2e.Hkdf(new e2e.hash.Sha256()).getHKDF(this.eccSeed_,
      e2e.dwordArrayToByteArray([this.eccCount_]), keyLength / 8);

};


/**
 * Generates and imports to the key ring a master signing key and a subordinate
 * encryption key.
 * @param {string} email The email to associate the key with.
 * @param {!e2e.signer.Algorithm} keyAlgo Algorithm of the master key.
 *     It must be one of the digital signature algorithms.
 * @param {number} keyLength Length in bits of the master key.
 * @param {e2e.cipher.Algorithm} subkeyAlgo Algorithm of the subkey.
 *     It must be one of the cipher algorithms.
 * @param {number} subkeyLength Length in bits of the subkey.
 * @param {!e2e.algorithm.KeyLocations=} opt_keyLocation Where should the key be
 *     stored? (default to JS)
 * @return {e2e.async.Result.<!Array.<!e2e.openpgp.block.TransferableKey>>}
 * The generated public key and secret key in an array.
 */
e2e.openpgp.KeyRing.prototype.generateKey = function(email,
                                                     keyAlgo,
                                                     keyLength,
                                                     subkeyAlgo,
                                                     subkeyLength,
                                                     opt_keyLocation) {
  var keyData = {
    'pubKey': new Array(),
    'privKey': new Array()
  };
  if (!goog.isDef(opt_keyLocation)) {
    opt_keyLocation = e2e.algorithm.KeyLocations.JAVASCRIPT;
  }

  if (opt_keyLocation == e2e.algorithm.KeyLocations.JAVASCRIPT) {
    var fingerprint;
    if (keyAlgo == e2e.signer.Algorithm.ECDSA &&
        keyLength == 256) {
      var ecdsa = e2e.openpgp.keygenerator.newEcdsaWithP256(
          this.getNextKey_(keyLength));
      this.extractKeyData_(keyData, ecdsa);
      fingerprint = keyData.pubKey[0].fingerprint;
    }
    if (subkeyAlgo == e2e.cipher.Algorithm.ECDH &&
        subkeyLength == 256) {
      var ecdh = e2e.openpgp.keygenerator.newEcdhWithP256(
          this.getNextKey_(subkeyLength));
      this.extractKeyData_(keyData, ecdh, true);
    }
    return e2e.async.Result.toResult(this.certifyKeys_(email, keyData));
  } else if (opt_keyLocation == e2e.algorithm.KeyLocations.WEB_CRYPTO) {
    if (keyAlgo == e2e.signer.Algorithm.RSA) {
      if ((keyLength != 4096 && keyLength != 8192) ||
          subkeyAlgo != e2e.cipher.Algorithm.RSA || subkeyLength != keyLength) {
        throw new e2e.openpgp.error.UnsupportedError(
            'WebCrypto RSA keyLength must be 4096 or 8192');
      }
      return e2e.openpgp.keygenerator.newWebCryptoRsaKeys(
          keyLength).addCallback(
          function(ciphers) {
            this.extractKeyData_(keyData, ciphers[0]);
            this.extractKeyData_(keyData, ciphers[1]);
            return this.certifyKeys_(email, keyData);
          });
    }
  } else if (opt_keyLocation == e2e.algorithm.KeyLocations.HARDWARE) {
    // TODO(user): https://code.google.com/p/end-to-end/issues/detail?id=130
    throw new e2e.openpgp.error.UnsupportedError(
        'Hardware keygen not supported yet');
  }
  // Should never happen.
  throw new e2e.openpgp.error.UnsupportedError(
      'Unsupported key type or length.');
};


/**
 * @param {string} email The email to associate the key with.
 * @param {{privKey: Array, pubKey: Array}} keyData
 * @return {!Array.<!e2e.openpgp.block.TransferableKey>}
 * @private
 */
e2e.openpgp.KeyRing.prototype.certifyKeys_ = function(email, keyData) {
  if (keyData['pubKey'].length == 2 && keyData['privKey'].length == 2) {
    // TODO(evn): Move this code to a .construct.
    var primaryKey = keyData['privKey'][0];
    var uid = new e2e.openpgp.packet.UserId(email);
    uid.certifyBy(primaryKey);
    keyData['privKey'][1].bindTo(
        primaryKey,
        e2e.openpgp.packet.Signature.SignatureType.SUBKEY,
        e2e.openpgp.packet.SignatureSub.KeyFlags.ENCRYPT_COMMUNICATION |
        e2e.openpgp.packet.SignatureSub.KeyFlags.ENCRYPT_STORAGE);
    keyData['pubKey'][1].bindTo(
        primaryKey,
        e2e.openpgp.packet.Signature.SignatureType.SUBKEY,
        e2e.openpgp.packet.SignatureSub.KeyFlags.ENCRYPT_COMMUNICATION |
        e2e.openpgp.packet.SignatureSub.KeyFlags.ENCRYPT_STORAGE
    );

    var privKeyBlock = new e2e.openpgp.block.TransferableSecretKey();
    privKeyBlock.keyPacket = primaryKey;
    privKeyBlock.subKeys.push(keyData['privKey'][1]);
    privKeyBlock.userIds.push(uid);

    var pubKeyBlock = new e2e.openpgp.block.TransferablePublicKey();
    pubKeyBlock.keyPacket = keyData['pubKey'][0];
    pubKeyBlock.subKeys.push(keyData['pubKey'][1]);
    pubKeyBlock.userIds.push(uid);

    this.importKey_(email, pubKeyBlock, this.pubKeyRing_);
    this.importKey_(email, privKeyBlock, this.privKeyRing_);

    // Imports the generated public key to the key server.
    if (this.keyClient_ != null) {
      this.keyClient_.importPublicKey(pubKeyBlock);
    }
    return [pubKeyBlock, privKeyBlock];
  }
  // Should never happen.
  throw new e2e.openpgp.error.UnsupportedError(
      'Unsupported key type or length.');
};


/**
 * Obtains the key with a given keyId.
 * @param {!e2e.ByteArray} keyId The key id to search for.
 * @return {?e2e.openpgp.packet.PublicKey} The key packet with that key id or
 *     null.
 */
e2e.openpgp.KeyRing.prototype.getPublicKey = function(keyId) {
  return /** @type {e2e.openpgp.packet.PublicKey} */ (this.getKey_(keyId));
};


/**
 * Obtains a secret key with a given keyId.
 * @param {!e2e.ByteArray} keyId The key id to search for.
 * @return {?e2e.openpgp.packet.SecretKey} The secret key with that key id or
 *     null.
 */
e2e.openpgp.KeyRing.prototype.getSecretKey = function(keyId) {
  return /** @type {e2e.openpgp.packet.SecretKey} */ (this.getKey_(
      keyId, true));
};


/**
 * Obtains the key with a given keyId. If opt_secret is set, it only returns
 * secret keys.
 * @param {!e2e.ByteArray} keyId The key id to search for.
 * @param {boolean=} opt_secret Whether to search the private key ring.
 * @return {?e2e.openpgp.packet.Key} The key packet with that key id or null.
 * @private
 */
e2e.openpgp.KeyRing.prototype.getKey_ = function(keyId, opt_secret) {
  var keyRing = opt_secret ? this.privKeyRing_ : this.pubKeyRing_;
  var result;
  // Using goog.array.find to break on first match.
  goog.array.find(goog.array.flatten(keyRing.getValues()), function(key) {
    if (e2e.compareByteArray(keyId, key.keyPacket.keyId)) {
      result = key.keyPacket;
      return true;
    }
    return Boolean(goog.array.find(key.subKeys, function(subKey) {
      if (e2e.compareByteArray(keyId, subKey.keyId)) {
        result = subKey;
        return true;
      }
      return false;
    }));
  });
  return result || null;
};


/**
 * Obtains a key block corresponding to the given key object or null.
 * @param {!e2e.openpgp.Key} keyObject
 * @return {?e2e.openpgp.block.TransferableKey}
 */
e2e.openpgp.KeyRing.prototype.getKeyBlock = function(keyObject) {
  var fingerprint = keyObject.key.fingerprint;
  var secret = keyObject.key.secret;
  var keyRing = secret ? this.privKeyRing_ : this.pubKeyRing_;
  var ret = goog.array.find(
      goog.array.flatten(keyRing.getValues()),
      function(keyBlock) {
        return e2e.compareByteArray(keyBlock.keyPacket.fingerprint,
            fingerprint);
      });
  return this.lockSecretKey_(ret);
};


/**
 * Locks a TransferableSecretKey with keyring passphrase. Used to prevent
 * exporting unencrypted secret keys. Operates on a copy of key argument.
 * @param {!e2e.openpgp.block.TransferableKey} key
 * @return {?e2e.openpgp.block.TransferableKey}
 * @private
 */
e2e.openpgp.KeyRing.prototype.lockSecretKey_ = function(key) {
  if (!key) {
    return key;
  }
  // Only let SecretKeys out if they are encrypted.
  if (key instanceof e2e.openpgp.block.TransferableSecretKey) {
    var serialized = key.serialize();
    var parsed = /** @type {!e2e.openpgp.block.TransferableSecretKey} */ (
        e2e.openpgp.block.factory.parseByteArrayTransferableKey(serialized));
    parsed.processSignatures();
    parsed.unlock();
    var success = false;
    if (this.localStorage_.getPassphrase()) {
      success = parsed.lock(e2e.stringToByteArray(
          this.localStorage_.getPassphrase()));
    } else {
      success = parsed.lock();
    }
    return success ? parsed : null;
  }
  return key;
};


/**
 * Obtains a key block having a key with the given key ID or null.
 * @param {!e2e.ByteArray} keyId
 * @param {boolean=} opt_secret Whether to search the private key ring.
 * @return {e2e.openpgp.block.TransferableKey}
 */
e2e.openpgp.KeyRing.prototype.getKeyBlockById = function(keyId,
    opt_secret) {
  var keyRing = opt_secret ? this.privKeyRing_ : this.pubKeyRing_;
  var ret = goog.array.find(
      goog.array.flatten(keyRing.getValues()),
      function(keyBlock) {
        return keyBlock.hasKeyById(keyId);
      }) || null;
  return this.lockSecretKey_(ret);
};


/**
 * Defines the status of a state machine to decode EME encoded messages.
 * @enum {number}
 */
e2e.openpgp.KeyRing.Type = {
  'PUBLIC': 0,
  'PRIVATE': 1,
  'ALL': 2
};


/**
 * Searches a public or private key from an email.
 * @param {string} email The email to search for, or empty to search all.
 * @param {e2e.openpgp.KeyRing.Type=} opt_type Key type to search for.
 * @return {?Array.<!e2e.openpgp.block.TransferableKey>} An array of keys for
 *     the given email or null if not found.
 */
e2e.openpgp.KeyRing.prototype.searchKey = function(email, opt_type) {
  if (!opt_type || opt_type == e2e.openpgp.KeyRing.Type.PUBLIC) {
    return this.searchKey_(this.pubKeyRing_, email);
  }
  if (opt_type == e2e.openpgp.KeyRing.Type.PRIVATE) {
    return this.searchKey_(this.privKeyRing_, email);
  }
  if (opt_type == e2e.openpgp.KeyRing.Type.ALL) {
    var keys = [];
    var priv = this.searchKey_(this.privKeyRing_, email);
    if (priv) {  // Do this to avoid having a null element.
      goog.array.extend(keys, priv);
    }
    var pub = this.searchKey_(this.pubKeyRing_, email);
    if (pub) {
      goog.array.extend(keys, pub);
    }
    return keys;
  }
  return null;
};


/**
 * Searches a public or private key from email asynchronously. The search is
 *    first performed locally. If the key is not found locally and we're
 *    searching for public key, then searches the public key in the http key
 *    server and imports the the found key to keyring.
 * @param {string} email The email to search for, or empty to search all.
 * @param {e2e.openpgp.KeyRing.Type=} opt_type Key type to search for.
 * @return {!e2e.async.Result.<!Array.<!e2e.openpgp.block.TransferableKey>>}
 *    An array of keys for the given email or [] if not found.
 */
e2e.openpgp.KeyRing.prototype.searchKeyLocalAndRemote = function(email,
    opt_type) {
  var resultKeys = new e2e.async.Result();
  var localKeys = this.searchKey(email, opt_type);
  if (localKeys != null) {
    resultKeys.callback(localKeys);
  } else if (opt_type == e2e.openpgp.KeyRing.Type.PUBLIC) {
    this.searchPublicKeyRemote_(email).addCallback(function(pubKeys) {
      resultKeys.callback(pubKeys);
    });
  } else {
    resultKeys.callback([]);
  }
  return resultKeys;
};


/**
 * Gets all of the keys in the keyring.
 * @param {boolean=} opt_priv If true, fetch only private keys.
 * @return {!e2e.openpgp.TransferableKeyMap} A clone of the key ring maps.
 */
e2e.openpgp.KeyRing.prototype.getAllKeys = function(opt_priv) {
  if (opt_priv) {
    return this.privKeyRing_.clone();
  }
  var keys = this.pubKeyRing_.clone();
  var ids = this.privKeyRing_.getKeys();
  var values = this.privKeyRing_.getValues();
  for (var i = 0; i < ids.length; i++) {
    keys.set(ids[i], goog.array.concat(values[i], keys.get(ids[i], [])));
  }
  return keys;
};


/**
 * Deletes all keys for an email address.
 * @param {string} email The email to delete keys for.
 */
e2e.openpgp.KeyRing.prototype.deleteKey = function(email) {
  this.privKeyRing_.remove(email);
  this.pubKeyRing_.remove(email);
  this.persist_();
};


/**
 * @return {boolean} True if there is a correct keyring passphrase set.
 */
e2e.openpgp.KeyRing.prototype.hasPassphrase = function() {
  return !this.localStorage_.isLocked();
};


/**
 * @return {!e2e.async.Result<boolean>} True if the keyring is encrypted in
 *     persistent storage.
 */
e2e.openpgp.KeyRing.prototype.isEncrypted = function() {
  return this.localStorage_.isEncrypted();
};


/**
 * Resets the key ring. Use with care, as this shall delete all keys.
 * @return {!e2e.async.Result}
 */
e2e.openpgp.KeyRing.prototype.reset = function() {
  var keysToRemove = [
    e2e.openpgp.KeyRing.PUB_KEYRING_KEY_,
    e2e.openpgp.KeyRing.PRIV_KEYRING_KEY_,
    e2e.openpgp.KeyRing.ECC_SEED_KEY_,
    e2e.openpgp.KeyRing.ECC_COUNT_KEY_
  ];

  this.pubKeyRing_ = new goog.structs.Map();
  this.privKeyRing_ = new goog.structs.Map();
  return this.localStorage_.removeMultiple(keysToRemove);
};


/**
 * Searches a key in a key ring from an email.
 * @param {!e2e.openpgp.TransferableKeyMap} keyRing The key ring to search.
 * @param {string} email The email to search for.
 * @return {Array.<!e2e.openpgp.block.TransferableKey>} An array of keys for
 *     that user id or null.
 * @private
 */
e2e.openpgp.KeyRing.prototype.searchKey_ = function(keyRing, email) {
  return keyRing.get(email) ?
      goog.array.clone(keyRing.get(email)) : null;
};


/**
  * Searches a public key remotely by email.
  * @param {string} email The email to search for.
  * @return {!e2e.async.Result.<!Array.<!e2e.openpgp.block.TransferableKey>>}
  *     An array of public keys for that email or [] if not found.
  * @private
  */
e2e.openpgp.KeyRing.prototype.searchPublicKeyRemote_ = function(email) {
  var resultPubKeys = new e2e.async.Result();
  if (this.keyClient_ == null) {
    resultPubKeys.callback([]);
  } else {
    this.keyClient_.searchPublicKey(email).addCallback(function(pubKeys) {
      resultPubKeys.callback(pubKeys);

      // Imports the public keys into local keyring. The key client should have
      // verified the public key's consistency proof.
      if (pubKeys.length != 0) {
        goog.array.forEach(pubKeys, function(pubKey) {
          this.importKey(pubKey);
        }, this);
      }
    }, this);
  }
  return resultPubKeys;
};


/**
 * Imports a new key associated with an email to the key ring. Does not add the
 * key if there is already a matching key ID.
 * @param {string} email The email associated with the key.
 * @param {!e2e.openpgp.block.TransferableKey} keyBlock The key to import.
 * @param {!e2e.openpgp.TransferableKeyMap} keyRing The keyring to add the keys
 *     to.
 * @param {!e2e.ByteArray=} opt_passphrase The passphrase used to
 *     protect the key.
 * @return {e2e.async.Result<boolean>} If the key import was successful.
 *     False if the key for a given email address with the same ID already
 *     exists in a keyring.
 * @private
 */
e2e.openpgp.KeyRing.prototype.importKey_ = function(
    email, keyBlock, keyRing, opt_passphrase) {
  var emailKeyBlocks = [], addKey = false;
  var keys = [keyBlock.keyPacket].concat(keyBlock.subKeys);
  goog.array.forEach(keys, function(key) {
    if (key instanceof e2e.openpgp.packet.SecretKey) {
      key.cipher.unlockKey(opt_passphrase);
      // Re-lock the key in plaintext.
      key.cipher.lockKey();
    }
  });
  if (keyRing.containsKey(email)) {
    emailKeyBlocks = keyRing.get(email);
    addKey = !goog.array.some(emailKeyBlocks, function(emailKeyBlock) {
      return goog.isDef(keyBlock.keyPacket.keyId) && e2e.compareByteArray(
          emailKeyBlock.keyPacket.keyId, keyBlock.keyPacket.keyId);
    });
    // TODO(evn): Merge information when the key block is already in keyring.
  } else {
    addKey = true;
  }
  if (addKey) {
    keyRing.set(email, emailKeyBlocks.concat([keyBlock]));
    return this.persist_().addCallback(function() {
      return true;
    });
  }
  return e2e.async.Result.toResult(false);
};


/**
 * Persists key data to local storage.
 * @private
 * @return {!e2e.async.Result} Asynchronous result.
 */
e2e.openpgp.KeyRing.prototype.persist_ = function() {
  var obj = {};
  obj[e2e.openpgp.KeyRing.PUB_KEYRING_KEY_] =
      this.keyRingToObject_(this.pubKeyRing_);
  obj[e2e.openpgp.KeyRing.PRIV_KEYRING_KEY_] =
      this.keyRingToObject_(this.privKeyRing_);
  obj[e2e.openpgp.KeyRing.ECC_SEED_KEY_] = this.eccSeed_;
  obj[e2e.openpgp.KeyRing.ECC_COUNT_KEY_] = this.eccCount_;
  return this.localStorage_.setMultiple(obj);
};


/**
 * Serializes a key ring to an object.
 * @param {!e2e.openpgp.TransferableKeyMap} keyRing The key ring to be
 *     serialized.
 * @return {!Object}
 * @private
 */
e2e.openpgp.KeyRing.prototype.keyRingToObject_ = function(keyRing) {
  var obj = {};
  goog.iter.forEach(keyRing.getKeys(), function(k) {
    var v = goog.array.map(keyRing.get(k), function(e) {
      // each element is an instance of e2e.openpgp.block.TransferableKey.
      return goog.crypt.base64.encodeByteArray(e.serialize());
    });
    obj[k] = v;
  });
  return obj;
};


/**
 * Initializes the keyring - reads key data from local storage to memory.
 * @private
 * @return {!goog.async.Deferred}
 */
e2e.openpgp.KeyRing.prototype.init_ = function() {
  var keysToGet = [
    e2e.openpgp.KeyRing.PUB_KEYRING_KEY_,
    e2e.openpgp.KeyRing.PRIV_KEYRING_KEY_,
    e2e.openpgp.KeyRing.ECC_SEED_KEY_,
    e2e.openpgp.KeyRing.ECC_COUNT_KEY_
  ];

  return this.localStorage_.getMultiple(keysToGet).addCallbacks(function(data) {
    this.pubKeyRing_ = this.objectToPubKeyRing_(
        /** @type {!e2e.openpgp.SerializedKeyRing} */ (
        data[e2e.openpgp.KeyRing.PUB_KEYRING_KEY_]));
    this.privKeyRing_ = this.objectToPrivKeyRing_(
        /** @type {!e2e.openpgp.SerializedKeyRing} */ (
        data[e2e.openpgp.KeyRing.PRIV_KEYRING_KEY_]));
    this.eccSeed_ = /** @type {e2e.ByteArray} */ (
        data[e2e.openpgp.KeyRing.ECC_SEED_KEY_]),
    this.eccCount_ = /** @type {number} */ (
        data[e2e.openpgp.KeyRing.ECC_COUNT_KEY_]);
  }, null, this);
};


/**
 * Deserializes a private key ring from an object.
 * @param {!e2e.openpgp.SerializedKeyRing} s The serialized key ring.
 * @return {!e2e.openpgp.TransferableKeyMap}
 * @private
 */
e2e.openpgp.KeyRing.prototype.objectToPrivKeyRing_ = function(s) {
  var obj = goog.object.map(s, function(keys, uid) {
    return goog.array.map(keys, function(key) {
      var block = e2e.openpgp.block.factory.parseByteArrayTransferableKey(
          goog.crypt.base64.decodeStringToByteArray(key));
      if (!(block instanceof e2e.openpgp.block.TransferableSecretKey)) {
        throw new Error('Unexpected block in keyring.');
      }
      block.processSignatures();
      block.unlock();
      return block;
    });
  });
  return new goog.structs.Map(obj);
};


/**
 * Deserializes a public key ring from an object.
 * @param {!e2e.openpgp.SerializedKeyRing} s The serialized key ring.
 * @return {!e2e.openpgp.TransferableKeyMap}
 * @private
 */
e2e.openpgp.KeyRing.prototype.objectToPubKeyRing_ = function(s) {
  var obj = goog.object.map(s, function(keys, uid) {
    return goog.array.map(keys, function(key) {
      var block = e2e.openpgp.block.factory.parseByteArrayTransferableKey(
          goog.crypt.base64.decodeStringToByteArray(key));
      if (!(block instanceof e2e.openpgp.block.TransferablePublicKey)) {
        throw new Error('Unexpected block in keyring.');
      }
      block.processSignatures();
      return block;
    });
  });
  return new goog.structs.Map(obj);
};


/**
 * Backs up the ECC key generation seed and key count
 * @return {e2e.openpgp.KeyringBackupInfo}
 */
e2e.openpgp.KeyRing.prototype.getKeyringBackupData = function() {
  return {
    seed: this.eccSeed_,
    count: this.eccCount_
  };
};


/**
 * Restores serialized data from ECC key backup
 * @param {e2e.openpgp.KeyringBackupInfo} data
 *     serialized data to restore
 * @param {string} email The email to associate with restored keys.
 */
e2e.openpgp.KeyRing.prototype.restoreKeyring = function(data, email) {
  this.eccSeed_ = data.seed;
  this.eccCount_ = 0;

  if (data.count % 2) {
    throw new e2e.error.InvalidArgumentsError('Keys must be restored in pairs');
  }

  for (var i = 0; i < data.count / 2; i++) {
    this.generateECKey(email);
  }
};


/**
 * Extracts serialized key data contained in a crypto object.
 * @param {{privKey: Array, pubKey: Array}} keyData The map
 *     to store the extracted data.
 * @param {!e2e.cipher.Cipher|!e2e.signer.Signer} cryptor
 *     The crypto object to extract key material.
 * @param {boolean=} opt_subKey Whether the key is a subkey. Defaults to false.
 * @param {boolean=} opt_isJS Whether the key material is stored in JS.
 *                            Default to true.
 * @private
 */
e2e.openpgp.KeyRing.prototype.extractKeyData_ = function(
    keyData, cryptor, opt_subKey, opt_isJS) {
  var version = 0x04;
  var timestamp = 0;
  var publicConstructor = opt_subKey ?
      e2e.openpgp.packet.PublicSubkey : e2e.openpgp.packet.PublicKey;
  var secretConstructor = opt_subKey ?
      e2e.openpgp.packet.SecretSubkey : e2e.openpgp.packet.SecretKey;
  var pubKey = new publicConstructor(
      version, timestamp, cryptor);
  var serializedPubKey = pubKey.serializePacketBody();

  if (!goog.isDef(opt_isJS)) {
    opt_isJS = true;
  }
  var serializedPrivKey;
  if (opt_isJS) {
    // privKey is MPI, needs to serialize to get the right byte array.
    var privKey = e2e.openpgp.Mpi.serialize(cryptor.getKey()['privKey']);
    serializedPrivKey = goog.array.flatten(
        serializedPubKey,
        /* key is not encrypted individually. */
        e2e.openpgp.EncryptedCipher.KeyDerivationType.PLAINTEXT,
        privKey,
        e2e.openpgp.calculateNumericChecksum(privKey));
  } else {
    // Use dummy s2k
    var s2k = new e2e.openpgp.DummyS2k(new e2e.hash.Sha256,
        [0x45, 0x32, 0x45],
        e2e.openpgp.DummyS2k.E2E_modes.WEB_CRYPTO);
    serializedPrivKey = goog.array.flatten(
        serializedPubKey,
        e2e.openpgp.EncryptedCipher.KeyDerivationType.S2K_CHECKSUM,
        s2k.serialize(), [0], [0]);
  }

  privKey = secretConstructor.parse(serializedPrivKey);
  privKey.cipher.unlockKey();
  keyData['privKey'].push(privKey);
  keyData['pubKey'].push(
      publicConstructor.parse(serializedPubKey));
};
