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
 * @fileoverview Provides a wrapper around the gMonkey API.
 */

goog.provide('e2e.ext.gmonkey');

goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.string.format');

goog.scope(function() {
var gmonkey = e2e.ext.gmonkey;


/**
 * Calls Gmail's gmonkey API.
 * @param {string} code The gmonkey API to call.
 * @param {function(*)} callback The callback where the result should be passed.
 * @param {Object=} opt_args The arguments to pass to the gmonkey API.
 * @private
 */
gmonkey.callGmonkey_ = function(code, callback, opt_args) {
  window.onmessage = function(response) {
    var result;
    try {
      var responseObj = /** @type {{api:string,result:*,call:string}} */
          (window.JSON.parse(response.data));
      if (response.source != window.self ||
          responseObj.api != 'gmonkey' ||
          responseObj.call != code) {
        return;
      }

      result = responseObj.result;
    } catch (e) {
      return;
    }

    window.onmessage = goog.nullFunction;
    callback(result);
  };

  var call = {
    target: code,
    args: opt_args || {}
  };
  var script = document.createElement('script');
  script.src = chrome.runtime.getURL('gmonkeystub.js');
  script.setAttribute('call', window.JSON.stringify(call));
  document.documentElement.appendChild(script);
};


/**
 * Extracts the email address out of a full email label (e.g. John Smith
 * <john@example.com>).
 * @param {string} emailLabel The full email label
 * @return {string} The extracted email address.
 * @private
 */
gmonkey.getEmailAddress_ = function(emailLabel) {
  var result = /<(.*)>/.exec(emailLabel);
  if (result && result.length > 1) {
    return result[1];
  }

  return emailLabel;
};


/**
 * Gets the last selected message in Gmail.
 * @param {!function(Element)} callback The callback where the element
 *     containing the last selected message should be passed.
 * @expose
 */
gmonkey.getCurrentMessage = function(callback) {
  gmonkey.callGmonkey_('getCurrentMessage', function(result) {
    var elem = result ?
        document.getElementById(/** @type {string} */ (result)) : null;
    callback(elem);
  });
};


/**
 * Gets the active draft in Gmail.
 * @param {!function(!Array.<string>,string)} callback The callback where the
 *     active draft information should be passed.
 * @expose
 */
gmonkey.getActiveDraft = function(callback) {
  gmonkey.callGmonkey_('getActiveDraft', function(result) {
    var recipients = [];
    var body = '';

    if (goog.isObject(result)) {
      goog.array.extend(recipients,
          goog.array.map(result['to'].split(', '), gmonkey.getEmailAddress_));
      goog.array.extend(recipients,
          goog.array.map(result['cc'].split(', '), gmonkey.getEmailAddress_));
      body = result['body'].replace(/(<br>)|(<wbr>)/g, '\n');
    }

    callback(recipients, body);
  });
};


/**
 * Indicates if there is an active draft in Gmail.
 * @param {!function(boolean)} callback The callback where the active draft
 *     information should be passed.
 * @expose
 */
gmonkey.hasActiveDraft = function(callback) {
  gmonkey.callGmonkey_(
      'hasActiveDraft', /** @type {!function(*)} */ (callback));
};


/**
 * Sets the contents of the active draft in Gmail.
 * @param {!Array.<string>} recipients The recipients of the message.
 * @param {string} msgBody The content body of the message.
 * @param {function()=} opt_callback Optional. A callback to invoke once the
 *     draft's contents have been set.
 * @expose
 */
gmonkey.setActiveDraft = function(recipients, msgBody, opt_callback) {
  var callback = goog.nullFunction;
  if (goog.isFunction(opt_callback)) {
    callback = opt_callback;
  }
  gmonkey.callGmonkey_('setActiveDraft', callback, {
    to: recipients.join(', '),
    body: msgBody
  });
};

}); // goog.scope
