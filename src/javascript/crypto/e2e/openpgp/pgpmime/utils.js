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

goog.require('goog.array');
goog.require('goog.object');
goog.require('goog.string');

goog.scope(function() {
var pgpmime = e2e.openpgp.pgpmime;
var constants = pgpmime.Constants;
var utils = pgpmime.Utils;


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
    var paramParts = part.split('=');
    if (paramParts.length < 2) {
      return;
    }
    // Parameter names are case insensitive acc. to RFC 2045.
    var paramName = paramParts.shift().toLowerCase().trim();
    params[paramName] = goog.string.stripQuotes(
        paramParts.join('=').trim(), '"');
  });

  return /**@type{e2e.openpgp.pgpmime.types.HeaderValue}*/(
      {value: value, params: params});
};


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
    lines.push(line.join('; '));
  });
  return lines;
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
