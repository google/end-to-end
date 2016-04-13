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
goog.require('e2e.async.Result');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.openpgp.KeyClient');
goog.require('e2e.openpgp.KeyGenerator');
goog.require('e2e.openpgp.block.TransferablePublicKey');
goog.require('e2e.openpgp.block.TransferableSecretKey');
goog.require('e2e.openpgp.block.factory');
goog.require('e2e.openpgp.error.MissingPassphraseError');
goog.require('e2e.openpgp.error.WrongPassphraseError');
goog.require('e2e.openpgp.packet.SecretKey');
goog.require('e2e.signer.Algorithm');
goog.require('goog.array');
goog.require('goog.async.DeferredList');
goog.require('goog.crypt.base64');
goog.require('goog.functions');
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
  this.keyGenerator_ = new e2e.openpgp.KeyGenerator();
  /** @private {boolean} */
  this.initialized_ = false;
};


/**
 * Creates and initializes the KeyRing object with an unlocked storage.
 * @param {!e2e.openpgp.LockableStorage} lockableStorage persistent
 *    storage mechanism. Storage must already be unlocked, otherwise this method
 *    will return a {@link e2e.openpgp.error.MissingPassphraseError}.
 * @param {string=} opt_keyServerUrl The optional http key server url. If not
 *    specified then only support key operation locally.
 * @return {!goog.async.Deferred.<!e2e.openpgp.KeyRing>} The initialized
 *    keyring.
 */
e2e.openpgp.KeyRing.launch = function(lockableStorage, opt_keyServerUrl) {
  var keyRing = new e2e.openpgp.KeyRing(lockableStorage, opt_keyServerUrl);
  var returnKeyRing = goog.functions.constant(keyRing);
  return /** @type {!goog.async.Deferred.<!e2e.openpgp.KeyRing>} */ (
      keyRing.initialize().addCallback(returnKeyRing));
};


/**
 * The local storage to persist key data.
 * @type {!e2e.openpgp.LockableStorage}
 * @private
 */
e2e.openpgp.KeyRing.prototype.localStorage_;


/**
 * The public key ring. It's a map keyed by OpenPGP User ID. The values are
 * lists of block.TransferablePublicKey objects associated with this User ID.
 *
 * See {@link https://tools.ietf.org/html/rfc4880#section-5.11}.
 *
 * @type {!e2e.openpgp.TransferableKeyMap}
 * @private
 */
e2e.openpgp.KeyRing.prototype.pubKeyRing_;


/**
 * The private key ring. It's a map keyed by OpenPGP User ID. The values are
 * lists of block.TransferableSecretKey objects associated with this User ID.
 *
 * See {@link https://tools.ietf.org/html/rfc4880#section-5.11}.
 *
 * @type {!e2e.openpgp.TransferableKeyMap}
 * @private
 */
e2e.openpgp.KeyRing.prototype.privKeyRing_;


/**
 * The key client instance that searches for and adds public keys to/from
 * the http key server.
 * @type {e2e.openpgp.KeyClient}
 * @private
 */
e2e.openpgp.KeyRing.prototype.keyClient_ = null;


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
 * Encrypts the keyring with a new passphrase (or removes the encryption if the
 * passphrase is empty).
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
 * @return {!goog.async.Deferred<?e2e.openpgp.block.TransferableKey>}
 *     The imported key iff it was imported for all User ID packets,
 *     or null if the key was not imported (e.g. a duplicate key). Invalid keys
 *     will call an errback instead.
 */
e2e.openpgp.KeyRing.prototype.importKey = function(
    keyBlock, opt_passphrase) {
  return keyBlock.processSignatures().addCallback(function() {
    var keys = [keyBlock.keyPacket].concat(keyBlock.subKeys);
    var keyRing;
    if (keyBlock instanceof e2e.openpgp.block.TransferablePublicKey) {
      keyRing = this.pubKeyRing_;
    } else if (keyBlock instanceof e2e.openpgp.block.TransferableSecretKey) {
      keyRing = this.privKeyRing_;
    } else {
      return null;
    }
    var uids = keyBlock.getUserIds();
    goog.array.removeDuplicates(uids);
    var importedKeysResults = goog.async.DeferredList.gatherResults(
        goog.array.map(uids, function(uid) {
          return this.importKey_(uid, keyBlock, keyRing, opt_passphrase);
        }, this));
    return importedKeysResults.addCallback(function(importedKeys) {
      // Return the key only if it was imported for all the uids.
      return (importedKeys.indexOf(false) == -1) ? keyBlock : null;
    });
  }, this);
};


/**
 * Generates and imports to the key ring a master ECDSA key pair and a
 * subordinate ECDH key pair.
 * @param {string} uid User ID to associate the key to.
 * @return {e2e.async.Result.<!Array.<!e2e.openpgp.block.TransferableKey>>}
 * The generated public key and secret key in an array.
 */
e2e.openpgp.KeyRing.prototype.generateECKey = function(uid) {
  return this.generateKey(uid, e2e.signer.Algorithm.ECDSA, 256,
      e2e.cipher.Algorithm.ECDH, 256);
};


/**
 * Generates and imports to the key ring a master signing key and a subordinate
 * encryption key.
 * @param {string} uid User ID to associate the key with.
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
e2e.openpgp.KeyRing.prototype.generateKey = function(uid,
                                                     keyAlgo,
                                                     keyLength,
                                                     subkeyAlgo,
                                                     subkeyLength,
                                                     opt_keyLocation) {
  return this.keyGenerator_.generateKey(uid, keyAlgo, keyLength, subkeyAlgo,
      subkeyLength, opt_keyLocation).addCallback(function(keys) {
    return goog.async.DeferredList.gatherResults(goog.array.map(keys,
        function(key) {
          if (key instanceof e2e.openpgp.block.TransferableSecretKey) {
            return this.importKey_(uid, key, this.privKeyRing_);
          } else if (key instanceof e2e.openpgp.block.TransferablePublicKey) {
            return this.importKey_(uid, key, this.pubKeyRing_)
                .addCallback(function() {
                  if (this.keyClient_ !== null) {
                    return this.keyClient_.importPublicKey(
                        /** @type {!e2e.openpgp.block.TransferablePublicKey} */
                        (key));
                  }
                }, this);
          }
        }, this)).addCallback(function(voids) { return keys; });
  }, this);
};


/**
 * Obtains the key with a given keyId.
 * @param {!e2e.ByteArray} keyId The key id to search for.
 * @param {!e2e.openpgp.KeyFingerprint=} opt_fingerprint The key packet has
 *    to come from a key with this fingerprint.
 * @return {?e2e.openpgp.packet.PublicKey} The key packet with that key id or
 *     null.
 */
e2e.openpgp.KeyRing.prototype.getPublicKey = function(keyId, opt_fingerprint) {
  return /** @type {e2e.openpgp.packet.PublicKey} */ (this.getKey_(
      keyId, undefined, opt_fingerprint));
};


/**
 * Obtains a secret key with a given keyId.
 * @param {!e2e.ByteArray} keyId The key id to search for.
 * @param {!e2e.openpgp.KeyFingerprint=} opt_fingerprint The key packet has
 *    to come from a key with this fingerprint.
 * @return {?e2e.openpgp.packet.SecretKey} The secret key with that key id or
 *     null.
 */
e2e.openpgp.KeyRing.prototype.getSecretKey = function(keyId, opt_fingerprint) {
  return /** @type {e2e.openpgp.packet.SecretKey} */ (this.getKey_(
      keyId, true, opt_fingerprint));
};


/**
 * Obtains the key with a given keyId. If opt_secret is set, it only returns
 * secret keys.
 * @param {!e2e.ByteArray} keyId The key id to search for.
 * @param {boolean=} opt_secret Whether to search the private key ring.
 * @param {!e2e.openpgp.KeyFingerprint=} opt_fingerprint The key packet has
 *    to come from a key with this fingerprint.
 * @return {?e2e.openpgp.packet.Key} The key packet with that key id or null.
 * @private
 */
e2e.openpgp.KeyRing.prototype.getKey_ = function(keyId, opt_secret,
    opt_fingerprint) {
  var keyRing = opt_secret ? this.privKeyRing_ : this.pubKeyRing_;
  var result = null;
  // Using goog.array.some to break on first match.
  goog.array.some(goog.array.flatten(keyRing.getValues()), function(key) {
    if (goog.isDefAndNotNull(opt_fingerprint) &&
        !e2e.compareByteArray(key.keyPacket.fingerprint, opt_fingerprint)) {
      return false;
    }
    // Check main key packet, then the subkeys.
    if (e2e.compareByteArray(keyId, key.keyPacket.keyId)) {
      result = key.keyPacket;
      return true;
    }
    return goog.array.some(key.subKeys, function(subKey) {
      if (e2e.compareByteArray(keyId, subKey.keyId)) {
        result = subKey;
        return true;
      }
      return false;
    });
  });
  return result;
};


/**
 * Obtains a key block corresponding to the given key object or null.
 * @param {!e2e.openpgp.Key} keyObject
 * @return {!e2e.async.Result<?e2e.openpgp.block.TransferableKey>}
 */
e2e.openpgp.KeyRing.prototype.getKeyBlock = function(keyObject) {
  if (!keyObject.key.secret) {
    return e2e.async.Result.toResult(
        /** @type {e2e.openpgp.block.TransferableKey} */
        (this.getPublicKeyBlockByFingerprint(keyObject.key.fingerprint)));
  }
  var ret = goog.array.find(
      goog.array.flatten(this.privKeyRing_.getValues()),
      function(keyBlock) {
        return e2e.compareByteArray(keyBlock.keyPacket.fingerprint,
            keyObject.key.fingerprint);
      });
  return this.lockSecretKey_(ret);
};


/**
 * Obtains a public key block corresponding to the given fingerprint or null.
 * @param {!e2e.openpgp.KeyFingerprint} fingerprint The fingerprint
 * @return {?e2e.openpgp.block.TransferablePublicKey}
 */
e2e.openpgp.KeyRing.prototype.getPublicKeyBlockByFingerprint = function(
    fingerprint) {
  var ret = goog.array.find(
      goog.array.flatten(this.pubKeyRing_.getValues()),
      function(keyBlock) {
        return e2e.compareByteArray(keyBlock.keyPacket.fingerprint,
            fingerprint);
      });
  return ret;
};


/**
 * Locks a TransferableSecretKey with keyring passphrase. Used to prevent
 * exporting unencrypted secret keys. Operates on a copy of key argument.
 * @param {e2e.openpgp.block.TransferableKey} key
 * @return {!e2e.async.Result<e2e.openpgp.block.TransferableKey>}
 * @private
 */
e2e.openpgp.KeyRing.prototype.lockSecretKey_ = function(key) {
  if (!key) {
    return e2e.async.Result.toResult(
        /** @type {e2e.openpgp.block.TransferableKey} */(null));
  }
  // Only let SecretKeys out if they are encrypted.
  if (key instanceof e2e.openpgp.block.TransferableSecretKey) {
    var serialized = key.serialize();
    var parsed = /** @type {!e2e.openpgp.block.TransferableSecretKey} */ (
        e2e.openpgp.block.factory.parseByteArrayTransferableKey(serialized));
    return parsed.processSignatures().addCallback(function() {
      parsed.unlock();
      var success = false;
      if (this.localStorage_.getPassphrase()) {
        success = parsed.lock(e2e.stringToByteArray(
            this.localStorage_.getPassphrase()));
      } else {
        success = parsed.lock();
      }
      return success ? parsed : null;
    }, this);
  }
  return e2e.async.Result.toResult(
      /** @type {e2e.openpgp.block.TransferableKey} */(key));
};


/**
 * Obtains a key block having a key with the given key ID or null.
 * @param {!e2e.ByteArray} keyId
 * @param {boolean=} opt_secret Whether to search the private key ring.
 * @return {!e2e.async.Result<?e2e.openpgp.block.TransferableKey>}
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
 * Searches a public or private key associated with a User ID.
 * @param {string} uid User ID to search for, or empty to search all.
 * @param {e2e.openpgp.KeyRing.Type=} opt_type Key type to search for.
 * @return {?Array.<!e2e.openpgp.block.TransferableKey>} An array of keys for
 *     the given User ID or null if not found.
 */
e2e.openpgp.KeyRing.prototype.searchKey = function(uid, opt_type) {
  return this.searchKeyInternal_(uid, opt_type);
};


/**
 * Internal implementation of {@link #searchKey}.
 * @param {(string|function(string): boolean)} uidOrMatcher User ID or a User ID
 *     matching function - see {@link #searchKeyByUidMatcher}.
 * @param {e2e.openpgp.KeyRing.Type=} opt_type Key type to search for.
 * @return {?Array.<!e2e.openpgp.block.TransferableKey>} An array of keys
 *     matching the criteria.
 * @private
 */
e2e.openpgp.KeyRing.prototype.searchKeyInternal_ = function(uidOrMatcher,
    opt_type) {
  if (!opt_type || opt_type == e2e.openpgp.KeyRing.Type.PUBLIC) {
    return this.searchKey_(this.pubKeyRing_, uidOrMatcher);
  }
  if (opt_type == e2e.openpgp.KeyRing.Type.PRIVATE) {
    return this.searchKey_(this.privKeyRing_, uidOrMatcher);
  }
  if (opt_type == e2e.openpgp.KeyRing.Type.ALL) {
    var keys = [];
    var priv = this.searchKey_(this.privKeyRing_, uidOrMatcher);
    if (priv) {  // Do this to avoid having a null element.
      goog.array.extend(keys, priv);
    }
    var pub = this.searchKey_(this.pubKeyRing_, uidOrMatcher);
    if (pub) {
      goog.array.extend(keys, pub);
    }
    return keys;
  }
  return null;
};


/**
 * Searches for public or private keys that are associated with User IDs that
 * satisfy a matcher function.
 * Use when the search criteria is a function of User ID. For example,
 * a matching function could accept all User IDs that contain a given email
 * address.
 * @param {function(string): boolean} uidMatcher The matching function. It will
 *     be called with each User ID in the keyring and should return true iff
 *     the User ID meets the search criteria.
 * @param {e2e.openpgp.KeyRing.Type=} opt_type Key type to search for.
 * @return {?Array.<!e2e.openpgp.block.TransferableKey>} An array of keys
 *     matching the User IDs for which uidMatcher returned true.
 */
e2e.openpgp.KeyRing.prototype.searchKeysByUidMatcher = function(uidMatcher,
    opt_type) {
  return this.searchKeyInternal_(uidMatcher, opt_type);
};


/**
 * Searches a public or private key for a User ID asynchronously. The search is
 * first performed locally. If the key is not found locally and we're searching
 * for public key, then searches the public key in the http key server and
 * imports the the found key to keyring.
 * @param {string} uid User ID to search for, or empty to search all.
 * @param {e2e.openpgp.KeyRing.Type=} opt_type Key type to search for.
 * @return {!e2e.async.Result.<!Array.<!e2e.openpgp.block.TransferableKey>>}
 *    An array of keys for the given User ID or [] if not found.
 */
e2e.openpgp.KeyRing.prototype.searchKeyLocalAndRemote = function(uid,
    opt_type) {
  var resultKeys = new e2e.async.Result();
  var localKeys = this.searchKey(uid, opt_type);
  if (localKeys != null) {
    resultKeys.callback(localKeys);
  } else if (opt_type == e2e.openpgp.KeyRing.Type.PUBLIC) {
    this.searchPublicKeyRemote_(uid).addCallback(function(pubKeys) {
      resultKeys.callback(pubKeys);
    });
  } else {
    resultKeys.callback([]);
  }
  return resultKeys;
};


/**
 * Gets all of the keys in the keyring.
 * @param {boolean=} opt_privOnly If true, fetch only private keys.
 * @return {!e2e.openpgp.TransferableKeyMap} A clone of the key ring maps.
 */
e2e.openpgp.KeyRing.prototype.getAllKeys = function(opt_privOnly) {
  if (opt_privOnly) {
    return this.privKeyRing_.clone();
  }
  // Return a map of user IDs to an Array of both public and secret keys.
  var keys = this.pubKeyRing_.clone();
  var ids = this.privKeyRing_.getKeys();
  var values = this.privKeyRing_.getValues();
  for (var i = 0; i < ids.length; i++) {
    keys.set(ids[i], goog.array.concat(values[i], keys.get(ids[i], [])));
  }
  return keys;
};


/**
 * Deletes all keys for a User ID.
 * @param {string} uid User ID to delete keys for.
 */
e2e.openpgp.KeyRing.prototype.deleteKey = function(uid) {
  this.privKeyRing_.remove(uid);
  this.pubKeyRing_.remove(uid);
  this.persist_();
};


/**
 * Deletes a private or public key that has a given key fingerprint from chosen
 * keyring. Use e2e.openpgp.KeyRing.Type.ALL to delete the whole keypair.
 * @param  {!e2e.openpgp.KeyFingerprint} fingerprint The fingerprint.
 * @param  {!e2e.openpgp.KeyRing.Type} keyRingType The keyring to delete the key
 *     from.
 */
e2e.openpgp.KeyRing.prototype.deleteKeyByFingerprint = function(fingerprint,
    keyRingType) {
  var keyRings = [];
  switch (keyRingType) {
    case e2e.openpgp.KeyRing.Type.PUBLIC:
      keyRings = [this.pubKeyRing_];
      break;
    case e2e.openpgp.KeyRing.Type.PRIVATE:
      keyRings = [this.privKeyRing_];
      break;
    case e2e.openpgp.KeyRing.Type.ALL:
      keyRings = [this.pubKeyRing_, this.privKeyRing_];
      break;
  }
  goog.array.forEach(keyRings, function(keyring) {
    var uidsToRemove = [];
    keyring.forEach(function(keys, uid) {
      var hadMatchingKeys = goog.array.removeIf(keys, function(key) {
        return e2e.compareByteArray(key.keyPacket.fingerprint,
            fingerprint);
      });
      if (hadMatchingKeys && keys.length == 0) {
        uidsToRemove.push(uid);
      }
    }, this);
    // Remove User ID entries with no keys left.
    goog.array.forEach(uidsToRemove, function(uid) {
      keyring.remove(uid);
    });
  }, this);
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
 * Searches a key in a key ring associated with a given User ID.
 * @param {!e2e.openpgp.TransferableKeyMap} keyRing The key ring to search.
 * @param {(string|function(string): boolean)} uidOrMatcher User ID or a User ID
 *     matching function - see {@link #searchKeyByUidMatcher}.
 * @return {Array.<!e2e.openpgp.block.TransferableKey>} An array of keys for
 *     that User ID or null if no key is found.
 * @private
 */
e2e.openpgp.KeyRing.prototype.searchKey_ = function(keyRing, uidOrMatcher) {
  if (goog.isString(uidOrMatcher)) {
    var uid = uidOrMatcher;
    return keyRing.get(uid) ?
        goog.array.clone(keyRing.get(uid)) : null;
  } else if (goog.isFunction(uidOrMatcher)) {
    var matcher = uidOrMatcher;
    var keys = goog.array.flatten(goog.array.filter(
        goog.array.map(keyRing.getKeys(), function(uid) {
          return matcher(uid) ? goog.array.clone(keyRing.get(uid)) : null;
        }),
        function(possibleKeys) {
          return goog.isArray(possibleKeys);
        }
        ));
    goog.array.removeDuplicates(keys, undefined, function(key) {
      return key.keyPacket.fingerprint.join(',');
    });
    return keys;
  } else {
    throw new e2e.error.InvalidArgumentsError('Unknown UID matcher type.');
  }
};


/**
  * Searches a public key remotely by User ID.
  * @param {string} uid User ID to search for.
  * @return {!e2e.async.Result.<!Array.<!e2e.openpgp.block.TransferableKey>>}
  *     An array of public keys for that User ID or [] if not found.
  * @private
  */
e2e.openpgp.KeyRing.prototype.searchPublicKeyRemote_ = function(uid) {
  var resultPubKeys = new e2e.async.Result();
  if (this.keyClient_ == null) {
    resultPubKeys.callback([]);
  } else {
    this.keyClient_.searchPublicKey(uid).addCallback(function(pubKeys) {
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
 * Imports a new key associated with a User ID to the key ring. Does not add the
 * key if there is already a matching Key ID.
 * @param {string} uid User ID associated with the key.
 * @param {!e2e.openpgp.block.TransferableKey} keyBlock The key to import.
 * @param {!e2e.openpgp.TransferableKeyMap} keyRing The keyring to add the keys
 *     to.
 * @param {!e2e.ByteArray=} opt_passphrase The passphrase used to
 *     protect the key.
 * @return {e2e.async.Result<boolean>} If the key import was successful.
 *     False if the key for a given User ID with the same Key ID already
 *     exists in a keyring.
 * @private
 */
e2e.openpgp.KeyRing.prototype.importKey_ = function(
    uid, keyBlock, keyRing, opt_passphrase) {
  var uidKeyBlocks = [], addKey = false;
  var keys = [keyBlock.keyPacket].concat(keyBlock.subKeys);
  goog.array.forEach(keys, function(key) {
    if (key instanceof e2e.openpgp.packet.SecretKey) {
      key.cipher.unlockKey(opt_passphrase);
      // Re-lock the key in plaintext.
      key.cipher.lockKey();
    }
  });
  if (keyRing.containsKey(uid)) {
    uidKeyBlocks = keyRing.get(uid);
    addKey = !goog.array.some(uidKeyBlocks, function(uidKeyBlock) {
      return goog.isDef(keyBlock.keyPacket.keyId) && e2e.compareByteArray(
          uidKeyBlock.keyPacket.keyId, keyBlock.keyPacket.keyId);
    });
    // TODO(evn): Merge information when the key block is already in keyring.
  } else {
    addKey = true;
  }
  if (addKey) {
    keyRing.set(uid, uidKeyBlocks.concat([keyBlock]));
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
  var keyGenState = this.keyGenerator_.getGeneratorState();
  obj[e2e.openpgp.KeyRing.ECC_SEED_KEY_] = keyGenState.seed;
  obj[e2e.openpgp.KeyRing.ECC_COUNT_KEY_] = keyGenState.count;
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
 * Initializes the keyring if it isn't already initialized. Reads the key data
 * from lockable storage to memory.
 *
 * If the storage is locked (e.g. incorrect passphrase has been given), returns
 * a {@link e2e.openpgp.error.PassphraseError} instead.
 * @param {string=} opt_passphrase If given, tries to unlocks the storage with
 * the given passphrase.
 * @return {!goog.async.Deferred}
 */
e2e.openpgp.KeyRing.prototype.initialize = function(opt_passphrase) {
  var result = e2e.async.Result.toResult(undefined);

  if (this.initialized_) { // Keyring was already initialized, exit.
    return result;
  }

  // Try to unlock the storage.
  if (this.localStorage_.isLocked()) {
    result.addCallback(function() {
      return this.localStorage_.unlockWithPassphrase(opt_passphrase || '');
    }).addErrback(function() {
      if (goog.isDefAndNotNull(opt_passphrase)) {
        throw new e2e.openpgp.error.WrongPassphraseError();
      }
      throw new e2e.openpgp.error.MissingPassphraseError();
    });
  }

  var keysToGet = [
    e2e.openpgp.KeyRing.PUB_KEYRING_KEY_,
    e2e.openpgp.KeyRing.PRIV_KEYRING_KEY_,
    e2e.openpgp.KeyRing.ECC_SEED_KEY_,
    e2e.openpgp.KeyRing.ECC_COUNT_KEY_
  ];

  return result.addCallback(function() {
    return this.localStorage_.getMultiple(keysToGet);
  }, this)
      .addCallback(function(data) {
        this.keyGenerator_.setGeneratorState({
          seed: /** @type {e2e.ByteArray} */ (
              data[e2e.openpgp.KeyRing.ECC_SEED_KEY_]),
          count: /** @type {number} */ (
              data[e2e.openpgp.KeyRing.ECC_COUNT_KEY_])
        });

        var pubKeyRingResult = this.objectToKeyRing_(
            /** @type {!e2e.openpgp.SerializedKeyRing} */ (
            data[e2e.openpgp.KeyRing.PUB_KEYRING_KEY_]), true /* public */)
            .addCallback(function(pubKeyRing) {
              this.pubKeyRing_ = pubKeyRing;
            }, this);

        var privKeyRingResult = this.objectToKeyRing_(
            /** @type {!e2e.openpgp.SerializedKeyRing} */ (
            data[e2e.openpgp.KeyRing.PRIV_KEYRING_KEY_]), false /* public */)
            .addCallback(function(privKeyRing) {
              this.privKeyRing_ = privKeyRing;
            }, this);

        return goog.async.DeferredList.gatherResults([
          pubKeyRingResult,
          privKeyRingResult
        ]).addCallback(function(ignored) {
          this.initialized_ = true;
        }, this);
      }, this);
};


/**
 * Deserializes a public or private key ring from an object.
 * @param {!e2e.openpgp.SerializedKeyRing} s The serialized key ring.
 * @param {boolean} isPublic Whether s is a public or private key ring.
 * @return {!goog.async.Deferred<!e2e.openpgp.TransferableKeyMap>}
 * @private
 */
e2e.openpgp.KeyRing.prototype.objectToKeyRing_ = function(s, isPublic) {
  var keyType = isPublic ? e2e.openpgp.block.TransferablePublicKey :
      e2e.openpgp.block.TransferableSecretKey;
  /** @type {!Array<!goog.async.Deferred>} */
  var pendingActions = [];
  /** @type {!Object<!Array.<e2e.openpgp.block.TransferableKey>>} */
  var obj = {};
  goog.object.forEach(s, function(keys, uid) {
    goog.array.forEach(keys, function(key) {
      try {
        var block = e2e.openpgp.block.factory.parseByteArrayTransferableKey(
            goog.crypt.base64.decodeStringToByteArray(key));
        if (!(block instanceof keyType)) {
          throw new Error('Unexpected block in keyring.');
        }
        pendingActions.push(block.processSignatures().addCallbacks(function() {
          if (!isPublic) {
            block.unlock();
          }
          if (!obj[uid]) {
            obj[uid] = [];
          }
          obj[uid].push(block);
        }, function() {
          // Ignore the block (e.g. because the signatures were invalid).
        }));
      } catch (e) {
        // Ignore the block (e.g. because parsing failed).
      }
    });
  });

  return goog.async.DeferredList.gatherResults(pendingActions)
      .addCallback(function(ignored) {
        return new goog.structs.Map(obj);
      });
};


/**
 * Backs up the ECC key generation seed and key count
 * @return {e2e.openpgp.KeyringBackupInfo}
 */
e2e.openpgp.KeyRing.prototype.getKeyringBackupData = function() {
  return this.keyGenerator_.getGeneratorState();
};


/**
 * Restores serialized data from ECC key backup
 * @param {e2e.openpgp.KeyringBackupInfo} data
 *     serialized data to restore
 * @param {string} uid User ID to associate with restored keys.
 */
e2e.openpgp.KeyRing.prototype.restoreKeyring = function(data, uid) {
  if (data.count % 2) {
    throw new e2e.error.InvalidArgumentsError('Keys must be restored in pairs');
  }
  this.keyGenerator_.setGeneratorState({
    seed: data.seed,
    count: 0
  });
  for (var i = 0; i < data.count / 2; i++) {
    this.generateECKey(uid);
  }
};
