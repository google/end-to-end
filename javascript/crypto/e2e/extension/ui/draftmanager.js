// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * @fileoverview Manages saved drafts within the extension.
 */

goog.provide('e2e.ext.ui.draftmanager');

goog.require('e2e.ext.constants');

goog.scope(function() {
var constants = e2e.ext.constants;
var drafts = e2e.ext.ui.draftmanager;


/**
 * Persists a draft message.
 * @param {string} draft The draft to persist.
 * @param {string} origin The origin where the message was created.
 */
drafts.saveDraft = function(draft, origin) {
  var allDrafts = drafts.getAllDrafts_();
  allDrafts[origin] = draft;
  drafts.persistAllDrafts_(allDrafts);
};


/**
 * Returns the last saved draft for a given origin.
 * @param {string} origin The origin for which the last draft is needed.
 * @return {string} The last saved draft.
 */
drafts.getDraft = function(origin) {
  var allDrafts = drafts.getAllDrafts_();
  return allDrafts[origin] || '';
};


/**
 * Returns true if a saved draft exists for a given origin.
 * @param {string} origin The origin for which the last draft is needed.
 * @return {boolean} True if a draft exists. Otherwise false.
 */
drafts.hasDraft = function(origin) {
  var allDrafts = drafts.getAllDrafts_();
  return Boolean(allDrafts[origin]);
};


/**
 * Removes the saved drafts for a given origin.
 * @param {string} origin The origin for which the drafts are to be removed.
 */
drafts.clearDraft = function(origin) {
  var allDrafts = drafts.getAllDrafts_();
  delete allDrafts[origin];
  drafts.persistAllDrafts_(allDrafts);
};


/**
 * Retrieves all draft messages from local storage.
 * @return {!Object.<string, string>} All drafts that are saved in local
 *     storage.
 * @private
 */
drafts.getAllDrafts_ = function() {
  var serialized = window.localStorage.getItem(
      constants.StorageKey.LAST_SAVED_DRAFT) || '{}';

  // NOTE(radi): Wrapping in try/catch for backwards compatibility.
  var allDrafts = {};
  try {
    allDrafts = window.JSON.parse(serialized);
  } catch (e) {}

  return /** @type {!Object.<string,string>} */ (allDrafts);
};


/**
 * Persists the provided drafts into local storage, overriding any previous
 * drafts.
 * @param {!Object.<string, string>} drafts The drafts to persist in local
 *     storage.
 * @private
 */
drafts.persistAllDrafts_ = function(drafts) {
  window.localStorage.setItem(
      constants.StorageKey.LAST_SAVED_DRAFT, window.JSON.stringify(drafts));
};

}); // goog.scope

