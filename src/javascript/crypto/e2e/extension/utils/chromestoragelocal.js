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
 * @fileoverview Implements a storage mechanism for Chrome Apps.
 */

goog.provide('e2e.ext.util.ChromeStorageLocal');

goog.require('goog.storage.mechanism.IterableMechanism');
goog.require('goog.structs.Map');



/**
 * Creates an iterable mechanism using chrome.storage.local.
 * @param {function(!e2e.ext.util.ChromeStorageLocal)=} opt_callback Callback
 *     function to call once storage mechanism has been initialized.
 * @constructor
 * @extends {goog.storage.mechanism.IterableMechanism}
 * @final
 */
e2e.ext.util.ChromeStorageLocal = function(opt_callback) {
  this.storage_ = {};
  this.updateStorage_(opt_callback);
  chrome.storage.onChanged.addListener(goog.bind(function(changes, areaName) {
    var keyName = e2e.ext.util.ChromeStorageLocal.STORAGE_KEY_NAME_;
    if (areaName == 'local' && keyName in changes) {
      this.storage_ = changes[keyName].newValue || {};
    }
  }, this));
};
goog.inherits(e2e.ext.util.ChromeStorageLocal,
    goog.storage.mechanism.IterableMechanism);


/**
 * @private
 * @const {string}
 */
e2e.ext.util.ChromeStorageLocal.STORAGE_KEY_NAME_ =
    'e2e.ext.util.ChromeStorageLocal';


/**
 * @param {function(!e2e.ext.util.ChromeStorageLocal)=} opt_callback
 * @private
 */
e2e.ext.util.ChromeStorageLocal.prototype.updateStorage_ = function(
    opt_callback) {
  var keyName = e2e.ext.util.ChromeStorageLocal.STORAGE_KEY_NAME_;
  chrome.storage.local.get(
      keyName,
      goog.bind(function(values) {
        this.storage_ = values[keyName] || {};
        opt_callback && opt_callback(this);
      }, this));
};


/** @private */
e2e.ext.util.ChromeStorageLocal.prototype.saveChanges_ = function() {
  var newStorage = {};
  newStorage[e2e.ext.util.ChromeStorageLocal.STORAGE_KEY_NAME_] = this.storage_;
  chrome.storage.local.set(newStorage);
};


/** @override */
e2e.ext.util.ChromeStorageLocal.prototype.set = function(key, value) {
  this.storage_[key] = value;
  this.saveChanges_();
};


/** @override */
e2e.ext.util.ChromeStorageLocal.prototype.get = function(key) {
  return this.storage_[key];
};


/** @override */
e2e.ext.util.ChromeStorageLocal.prototype.remove = function(key) {
  this.storage_[key] = null;
  this.saveChanges_();
};


/** @override */
e2e.ext.util.ChromeStorageLocal.prototype.__iterator__ = function(opt_keys) {
  return new goog.structs.Map(this.storage_).__iterator__(opt_keys);
};
