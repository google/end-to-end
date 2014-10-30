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
 * @fileoverview Utility methods for working with free-text and PGP messages.
 */

goog.provide('e2e.ext.utils.text');

goog.require('e2e.ext.constants');
goog.require('e2e.ext.constants.Actions');
goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.format.EmailAddress');
goog.require('goog.string');
goog.require('goog.string.format');


goog.scope(function() {
var constants = e2e.ext.constants;
var utils = e2e.ext.utils.text;


/**
 * Formats a body of text such that all lines do not exceed a given length.
 * @param {string} str The body of text to wrap around.
 * @param {number} maxlen The maximum length of a line.
 * @return {string} The formatted text.
 */
utils.prettyTextWrap = function(str, maxlen) {
  var regexp = new RegExp(goog.string.format('(.{%d})', maxlen), 'g');
  str = str.trim().replace(regexp, '$1\n');

  var carry = '';
  var lines = goog.array.map(str.split('\n'), function(line) {
    var newline = goog.string.format('%s%s', carry, line).trim();
    carry = '';

    if (newline.length >= maxlen && !goog.string.endsWith(newline, ' ')) {
      var lastSpace = newline.lastIndexOf(' ');
      if (lastSpace > -1 &&
          goog.string.isAlphaNumeric(newline.substring(newline.length - 1))) {
        carry = newline.substring(lastSpace + 1);
        return newline.substring(0, lastSpace);
      }
    }

    return newline;
  });

  if (carry) {
    goog.array.extend(lines, utils.prettyTextWrap(carry, maxlen).split('\n'));
  }

  return lines.join('\n');
};


/**
 * Determines the requested PGP action based on the content that the user has
 * selected.
 * @param {string} content The content that the user has selected.
 * @param {boolean=} opt_enableSniffing Optional. True if action sniffing is to
 *     be enabled. Defaults to false.
 * @return {constants.Actions} The requested PGP action.
 */
utils.getPgpAction = function(content, opt_enableSniffing) {
  if (!Boolean(opt_enableSniffing)) {
    return constants.Actions.USER_SPECIFIED;
  }

  if (/^-----BEGIN PGP MESSAGE-----/.test(content)) {
    return constants.Actions.DECRYPT_VERIFY;
  }

  if (/^-----BEGIN PGP PUBLIC KEY BLOCK-----/.test(content)) {
    return constants.Actions.IMPORT_KEY;
  }

  if (/^-----BEGIN PGP PRIVATE KEY BLOCK-----/.test(content)) {
    return constants.Actions.IMPORT_KEY;
  }

  return constants.Actions.ENCRYPT_SIGN;
};


/**
 * Extract a valid e-mail address from 'user id <email>' string. If no valid
 *   e-mail address can be extracted, returns null. Uses
 *   goog.format.EmailAddress, but also enforces stricter rules.
 * @param {string} recipient "username <email> string".
 * @return {?string} Valid email address or null
 */
utils.extractValidEmail = function(recipient) {
  var emailAddress = goog.format.EmailAddress.parse(recipient);
  if (!emailAddress.isValid()) {
    return null;
  }
  var email = emailAddress.getAddress();
  if (!constants.EMAIL_ADDRESS_REGEXP.exec(emailAddress.getAddress())) {
    return null;
  }
  return email;
};


/**
 * Extracts valid email addresses out of a string with comma-separated full
 *  email labels (e.g. "John Smith" <john@example.com>, Second
 *  <second@example.org>).
 * @param {string} emailLabels The full email labels
 * @return {!Array.<string>} The extracted valid email addresses.
 */
utils.getValidEmailAddressesFromString = function(emailLabels) {
  var emails = goog.format.EmailAddress.parseList(emailLabels);
  return goog.array.filter(
      goog.array.map(
          goog.array.map(emails, function(email) {return email.toString()}),
          utils.extractValidEmail),
      goog.isDefAndNotNull);
};


/**
 * Extracts valid email addresses out of an array with full email labels
 * (e.g. "John Smith" <john@example.com>, Second <second@example.org>).
 * @param {!Array.<string>} recipients List of recipients
 * @param {boolean=} opt_email_only If true, return email addresses instead of
 *   full recipient records.
 * @return {!Array.<string>} List of emails/recipients with valid e-mails
 */
utils.getValidEmailAddressesFromArray = function(recipients, opt_email_only) {
  var list = [];
  goog.array.forEach(recipients, function(recipient) {
    var emailAddress = goog.format.EmailAddress.parse(recipient);
    var validEmail = utils.extractValidEmail(emailAddress.getAddress());
    if (validEmail) {
      if (opt_email_only) {
        list.push(validEmail);
      } else {
        // Add full recipient record
        list.push(emailAddress.toString());
      }
    }
  });
  return list;
};


/**
 * Checks whether a URI is an HTTPS ymail origin.
 * @param {!string} uri
 * @return {boolean}
 */
utils.isYmailOrigin = function(uri) {
  var googUri = new goog.Uri(uri);
  return (googUri.getScheme() === 'https' &&
      goog.string.endsWith(googUri.getDomain(), '.mail.yahoo.com'));
};


/**
 * Checks whether a URI is an HTTPS Gmail origin.
 * @param {!string} uri
 * @return {boolean}
 */
utils.isGmailOrigin = function(uri) {
  var googUri = new goog.Uri(uri);
  return (googUri.getScheme() === 'https' &&
          googUri.getDomain() === 'mail.google.com');
};
});  // goog.scope
