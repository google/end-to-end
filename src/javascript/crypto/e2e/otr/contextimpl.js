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
 * @fileoverview OTR context manager implementation.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.ContextImpl');

goog.require('e2e.otr');
goog.require('e2e.otr.Context');
goog.require('e2e.otr.Sig');
goog.require('e2e.otr.error.NotImplementedError');
goog.require('e2e.otr.pubkey.Dsa');
goog.require('goog.functions');
goog.require('goog.storage.mechanism.HTML5LocalStorage');


goog.scope(function() {


/** @const */
var STORAGE_PUBLIC_KEY = 'PUBKEY';


/** @const */
var STORAGE_PRIVATE_KEY = 'PRIVKEY';



/**
 * Constructor for the context manager.
 * @constructor
 * @implements {e2e.otr.Context}
 */
e2e.otr.ContextImpl = function() {
  this.localStorage_ = new goog.storage.mechanism.HTML5LocalStorage();

  // The properties defined here are backed by localStorage.
  this.defineLocalStorageProperties_({
    pubkey: {
      key: STORAGE_PUBLIC_KEY,
      get: e2e.otr.pubkey.Dsa.unpack,
      set: function(dsa) { return dsa.pack(); }
    },
    privkey_: STORAGE_PRIVATE_KEY
  });

  if (!this.privkey_) {
    // TODO(rcc): Generate a DSA public/private key pair.
    throw new e2e.otr.error.NotImplementedError(
        'Generating DSA keys is not yet supported');
  }

  if (!this.pubkey) {
    // TODO(rcc): Generate a public key from the private key.
    // This case only occurs when a private key is present without a public key.
    throw new e2e.otr.error.NotImplementedError(
        'Generating DSA keys is not yet supported');
  }

  e2e.otr.implements(e2e.otr.ContextImpl, e2e.otr.Context);
};


/**
 * The long-term authentication public key.
 * @type {!e2e.otr.pubkey.Pubkey}
 */
e2e.otr.ContextImpl.prototype.pubkey;


/**
 * The long-term authentication private key.
 * @private
 * @type {!e2e.signer.key.DsaPrivateKey}
 */
e2e.otr.ContextImpl.prototype.privkey_;


/**
 * Defines properties backed by a local storage key.
 * {prop: PROP_KEY} creates this.prop backed by localStorage key PROP_KEY.
 * {prop: {key: PROP_KEY, get: getter, set: setter}} creates this.prop backed by
 * localStorage key PROP_KEY and the specified getter and setter.
 *
 * @private
 * @template J
 *     J is a a JSON-compatible type.
 * @template T
 * @param {!Object.<string,
 *     (string|!{
 *       key: string,
 *       get: (function(J):T|undefined),
 *       set: (function(T):J|undefined)
 *     })>} props The property to localStorage key map with optional get/setter.
 */
e2e.otr.ContextImpl.prototype.defineLocalStorageProperties_ = function(props) {
  Object.keys(props).forEach(goog.bind(function(prop) {
    var val = props[prop];
    var key = val.key || val;
    var getFilter = val.get || goog.functions.identity;
    var setFilter = val.set || goog.functions.identity;
    // TODO(rcc): Consider adding caching to prevent excessive parse/stringify.
    Object.defineProperty(this, prop, {
      enumerable: true,
      get: function() {
        return getFilter(JSON.parse(this.localStorage_.get(key)));
      },
      set: function(val) {
        return this.localStorage_.set(key, JSON.stringify(setFilter(val)));
      }
    });
  }, this));
};


/** @inheritDoc */
e2e.otr.ContextImpl.prototype.getSigner = function() {
  return e2e.otr.Sig.bind(null, this.privkey_);
};
});  // goog.scope
