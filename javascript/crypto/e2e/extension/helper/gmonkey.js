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

goog.require('e2e.ext.utils.text');
goog.require('goog.array');
goog.require('goog.format.EmailAddress');

goog.scope(function() {
var gmonkey = e2e.ext.gmonkey;

/**
 * True if Gmonkey object in web application is not available (this can only
 * be determined upon first callGmonkey_ invocation).
 * @type {?boolean}
 * @private
 */
gmonkey.available_ = null;

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
 * Checks if current web application has a gmonkey object available. Caches
 * the check in internal variable.
 * @param {function(boolean)} callback Function to call with the check results.
 */
gmonkey.isAvailable = function(callback) {
  if (goog.isDefAndNotNull(gmonkey.available_)) {
    return callback(/** @type {boolean} */ (gmonkey.available_));
  }
  gmonkey.callGmonkey_('isGmonkeyAvailable', function(result) {
    gmonkey.available_ = /** @type {boolean} */ (result);
    callback(gmonkey.available_);
  });
};


/**
 * Extracts valid email addresses out of a string with comma-separated full
 *  email labels (e.g. "John Smith" <john@example.com>, Second
 *  <second@example.org>).
 * @param {string} emailLabels The full email labels
 * @return {!Array.<string>} The extracted valid email addresses.
 * @private
 */
gmonkey.getValidEmailAddressesFromString_ = function(emailLabels) {
  var emails = goog.format.EmailAddress.parseList(emailLabels);
  return goog.array.filter(
      goog.array.map(
          goog.array.map(emails, function(email) {return email.toString()}),
          e2e.ext.utils.text.extractValidEmail),
      goog.isDefAndNotNull);
};


/**
 * Extracts valid email addresses out of an array with full email labels
 * (e.g. "John Smith" <john@example.com>, Second <second@example.org>).
 * @param {!Array.<string>} recipients List of recipients
 * @return {string} Comma separated list of recipients with valid e-mail
 *     addresses
 * @private
 */
gmonkey.getValidEmailAddressesFromArray_ = function(recipients) {
    var list = [];
    goog.array.forEach(recipients, function(recipient) {
        var emailAddress = goog.format.EmailAddress.parse(recipient);
        // Validate e-mail address, but add full recipient record.
        if (e2e.ext.utils.text.extractValidEmail(emailAddress.getAddress())) {
          list.push(emailAddress.toString());
        }
    });
    return list.join(', ');
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
 * @suppress {missingProperties}
 */
gmonkey.getActiveDraft = function(callback) {
  gmonkey.callGmonkey_('getActiveDraft', function(result) {
    var recipients = [];
    var body = '';

    if (goog.isObject(result)) {
      goog.array.extend(recipients,
          gmonkey.getValidEmailAddressesFromString_(result['to']),
          gmonkey.getValidEmailAddressesFromString_(result['cc']));
      // Document.implementation.createHTMLDocument creates a new document
      // in which the scripts are not executing and network requests are not
      // made (in Chrome), so we don't create a XSS risk here.
      var newDoc = document.implementation.createHTMLDocument();
      newDoc.body.innerHTML = result['body'];
      // However, always return innerText from the new document, because the
      // XSS payloads can still be there.
      body = newDoc.body.innerText;
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
    to: gmonkey.getValidEmailAddressesFromArray_(recipients),
    body: msgBody
  });
};

}); // goog.scope
