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
 *
 * @final
 */
e2e.ext.util.ChromeStorageLocal =
    class extends goog.storage.mechanism.IterableMechanism {
  /**
   * @param {function(!e2e.ext.util.ChromeStorageLocal)=} opt_callback Callback
   *     function to call once storage mechanism has been initialized.
   */
  constructor(opt_callback) {
    super();
    this.storage_ = {};
    this.updateStorage_(opt_callback);
    chrome.storage.onChanged.addListener(goog.bind(function(changes, areaName) {
      var keyName = e2e.ext.util.ChromeStorageLocal.STORAGE_KEY_NAME_;
      if (areaName == 'local' && keyName in changes) {
        this.storage_ = changes[keyName].newValue || {};
      }
    }, this));
  }

  /**
   * @param {function(!e2e.ext.util.ChromeStorageLocal)=} opt_callback
   * @private
   */
  updateStorage_(opt_callback) {
    var keyName = e2e.ext.util.ChromeStorageLocal.STORAGE_KEY_NAME_;
    chrome.storage.local.get(keyName, goog.bind(function(values) {
      this.storage_ = values[keyName] || {};
      opt_callback && opt_callback(this);
    }, this));
  }

  /** @private */
  saveChanges_() {
    var newStorage = {};
    newStorage[e2e.ext.util.ChromeStorageLocal.STORAGE_KEY_NAME_] =
        this.storage_;
    chrome.storage.local.set(newStorage);
  }

  /** @override */
  set(key, value) {
    this.storage_[key] = value;
    this.saveChanges_();
  }

  /** @override */
  get(key) {
    return this.storage_[key];
  }

  /** @override */
  remove(key) {
    this.storage_[key] = null;
    this.saveChanges_();
  }

  /** @override */
  __iterator__(opt_keys) {
    return new goog.structs.Map(this.storage_).__iterator__(opt_keys);
  }
};


/**
 * @private
 * @const {string}
 */
e2e.ext.util.ChromeStorageLocal.STORAGE_KEY_NAME_ =
    'e2e.ext.util.ChromeStorageLocal';
