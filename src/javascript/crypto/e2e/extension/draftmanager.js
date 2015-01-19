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
 * @fileoverview Manages saved drafts within the extension.
 */

goog.provide('e2e.ext.DraftManager');

goog.require('e2e.ext.constants.StorageKey');

goog.scope(function() {
var constants = e2e.ext.constants;
var ext = e2e.ext;



/**
 * Constructor for the draft manager.
 * @param {!goog.storage.mechanism.Mechanism} storage mechanism for storing
 *     drafts.
 * @constructor
 */
ext.DraftManager = function(storage) {

  /**
   * Mechanism for storing drafts.
   * @type {!goog.storage.mechanism.Mechanism}
   * @private
   */
  this.storage_ = storage;
};


/**
 * Persists a draft message.
 * @param {string} draft The draft to persist.
 * @param {string} origin The origin where the message was created.
 */
ext.DraftManager.prototype.saveDraft = function(draft, origin) {
  var allDrafts = this.getAllDrafts_();
  allDrafts[origin] = draft;
  this.persistAllDrafts_(allDrafts);
};


/**
 * Returns the last saved draft for a given origin.
 * @param {string} origin The origin for which the last draft is needed.
 * @return {string} The last saved draft.
 */
ext.DraftManager.prototype.getDraft = function(origin) {
  var allDrafts = this.getAllDrafts_();
  return allDrafts[origin] || '';
};


/**
 * Returns true if a saved draft exists for a given origin.
 * @param {string} origin The origin for which the last draft is needed.
 * @return {boolean} True if a draft exists. Otherwise false.
 */
ext.DraftManager.prototype.hasDraft = function(origin) {
  var allDrafts = this.getAllDrafts_();
  return Boolean(allDrafts[origin]);
};


/**
 * Removes the saved drafts for a given origin.
 * @param {string} origin The origin for which the drafts are to be removed.
 */
ext.DraftManager.prototype.clearDraft = function(origin) {
  var allDrafts = this.getAllDrafts_();
  delete allDrafts[origin];
  this.persistAllDrafts_(allDrafts);
};


/**
 * Retrieves all draft messages from storage.
 * @return {!Object.<string, string>} All drafts that are saved in storage.
 * @private
 */
ext.DraftManager.prototype.getAllDrafts_ = function() {
  try {
    var serialized = this.storage_.get(
        constants.StorageKey.LAST_SAVED_DRAFT) || '{}';

    // NOTE(radi): Wrapping in try/catch for backwards compatibility.
    var allDrafts = {};

    allDrafts = window.JSON.parse(serialized);
  } catch (e) {}

  return /** @type {!Object.<string,string>} */ (allDrafts);
};


/**
 * Persists the provided drafts into storage, overriding any previous
 * drafts.
 * @param {!Object.<string, string>} drafts The drafts to persist in storage.
 * @private
 */
ext.DraftManager.prototype.persistAllDrafts_ = function(drafts) {
  try {
    this.storage_.set(
        constants.StorageKey.LAST_SAVED_DRAFT, window.JSON.stringify(drafts));
  } catch (e) {}
};

});  // goog.scope

