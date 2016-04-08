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
 * @fileoverview Stubs out Chrome and DOM APIs that are common for all tests,
 * yet either are not provided or interfere with the tests.
 */

goog.provide('e2e.ext.testingstubs');


/**
 * Stubbed out Tab ID.
 * @type {number}
 */
e2e.ext.testingstubs.TAB_ID = 1;


/**
 * Stubbed out Tab ID.
 * @type {string}
 */
e2e.ext.testingstubs.RUNTIME_ID = 'test-runtime-id';


/**
 * Initializes the stubs.
 * @param {goog.testing.PropertyReplacer} replacer
 */
e2e.ext.testingstubs.initStubs = function(replacer) {
  replacer.setPath('window.confirm', function(msg) { return true; });


  replacer.setPath('chrome.browserAction.setBadgeText', goog.nullFunction);
  replacer.setPath('chrome.browserAction.setTitle', goog.nullFunction);
  replacer.setPath('chrome.i18n.getMessage', function() {
    return [].join.call(arguments);
  });
  replacer.setPath('chrome.notifications.clear', goog.nullFunction);
  replacer.setPath('chrome.notifications.create', goog.nullFunction);
  replacer.setPath('chrome.runtime.getBackgroundPage', goog.nullFunction);
  replacer.setPath('chrome.runtime.getURL', goog.nullFunction);
  replacer.setPath('chrome.runtime.onConnect.addListener', goog.nullFunction);
  replacer.setPath(
      'chrome.runtime.onConnect.removeListener', goog.nullFunction);
  replacer.setPath('chrome.tabs.onUpdated.addListener', goog.nullFunction);
  replacer.setPath('chrome.tabs.onRemoved.addListener', goog.nullFunction);
  replacer.setPath('chrome.tabs.executeScript', goog.nullFunction);
  replacer.setPath('chrome.tabs.query', function(req, callback) {
    callback([{id: e2e.ext.testingstubs.TAB_ID}]);
  });
  replacer.setPath('chrome.tabs.create', function(options, callback) {
    callback();
  });
  replacer.setPath('chrome.tabs.sendMessage', goog.nullFunction);
  replacer.setPath('chrome.runtime.id', e2e.ext.testingstubs.RUNTIME_ID);
};
