/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Helper utils for building/parsing PGP/MIME emails.
 * @author yzhu@yahoo-inc.com (Yan Zhu)
 */

goog.provide('e2e.openpgp.pgpmime.Utils');

goog.require('e2e.openpgp.pgpmime.Constants');
goog.require('e2e.openpgp.pgpmime.Text');

goog.require('goog.array');
goog.require('goog.object');
goog.require('goog.string');

goog.scope(function() {
var pgpmime = e2e.openpgp.pgpmime;
var constants = pgpmime.Constants;
var utils = pgpmime.Utils;


/**
 * Serialize a header into an array of strings.
 * @param {e2e.openpgp.pgpmime.types.Header} header The header to serialize
 * @return {Array.<string>}
 */
e2e.openpgp.pgpmime.Utils.serializeHeader = function(header) {
  var lines = [];
  goog.object.forEach(header, function(headerValue, headerName) {
    var line = [headerName + ': ' + headerValue.value];
    if (goog.isDefAndNotNull(headerValue.params)) {
      goog.object.forEach(headerValue.params, function(paramValue, paramName) {
        line.push(paramName + '=' + goog.string.quote(paramValue));
      });
    }
    // Content is wrapped at 64 chars, for compliance with the PEM protocol.
    // Note that CRLF wrapped headers also require a trailing whitespace
    lines.push(e2e.openpgp.pgpmime.Text.prettyTextWrap(
        line.join('; '), constants.MimeNum.LINE_WRAP,
        constants.Mime.CRLF + constants.Mime.WHITESPACE));
  });
  return lines;
};


/**
 * Parses a header value string. Ex: 'multipart/mixed; boundary="foo"'
 * @param {string} text The string to parse
 * @return {e2e.openpgp.pgpmime.types.HeaderValue}
 */
e2e.openpgp.pgpmime.Utils.parseHeaderValue = function(text) {
  var parts = text.split('; ');
  var firstPart = parts.shift();

  // Normalize value to lowercase since it's case insensitive
  var value = goog.string.stripQuotes(firstPart.toLowerCase().trim(), '"');

  var params = {};
  goog.array.forEach(parts, function(part) {
    // Ex: 'protocol=application/pgp-encrypted'
    var paramParts = goog.string.splitLimit(part, '=', 1);
    if (paramParts.length < 2) {
      return;
    }

    // Parameter names are case insensitive acc. to RFC 2045.
    var paramName = paramParts.shift().toLowerCase().trim();

    var visibleAscii = new RegExp('^[\x20-\x7e]+$');
    var tSpecials = new RegExp('[\\\\ ()<>\[@,;:/?\\]=\"]+');

    // Attribute names can only consist of visible ASCII characters (all
    // characters in the range 32-126). Additionally, they cannot include
    // whitespace or a number of other prohibited characters (see RFC 2045 5.1).
    if (!visibleAscii.test(paramName) || tSpecials.test(paramName)) {
      return;
    }

    var paramVal = paramParts.join('').trim();
    // Attribute values can only consist of visible ASCII characters.
    if (!visibleAscii.test(paramVal)) {
      return;
    }
    // Attribute values can only include whitespaces or other prohibited
    // characters if enclosed within whitespaces (see RFC 2045 5.1).
    if ((!goog.string.startsWith(paramVal, '"') ||
        !goog.string.endsWith(paramVal, '"')) && (tSpecials.test(paramVal))) {
      return;
    }
    params[paramName] = goog.string.stripQuotes(paramVal, '"');
  });

  return /**@type{e2e.openpgp.pgpmime.types.HeaderValue}*/ (
      {value: value, params: params});
};


/**
 * Splits a MIME message into lines.
 * @param {string} text The message to split
 * @return {Array.<string>}
 * @private
 */
e2e.openpgp.pgpmime.Utils.splitLines_ = function(text) {
  return text.split(constants.Mime.CRLF);
};



});  // goog.scope
