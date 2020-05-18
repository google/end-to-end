/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
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

goog.provide('e2e.openpgp.pgpmime.Text');

goog.require('goog.array');
goog.require('goog.string');
goog.require('goog.string.format');


goog.scope(function() {
var utils = e2e.openpgp.pgpmime.Text;


/**
 * Formats a body of text such that all lines do not exceed a given length.
 * @param {string} str The body of text to wrap around.
 * @param {number} maxlen The maximum length of a line.
 * @param {string} delimiter The character/s used to separate lines
 * @return {string} The formatted text.
 */
utils.prettyTextWrap = function(str, maxlen, delimiter) {
  if (str.length <= maxlen) {
    return str;
  }
  // The following regexp searches for character sequences whose length is equal
  // to maxlen, that aren't immediately followed by a delimiter (we use the
  // lookahead to prevent a repetition of the delimiter).
  var regexp = new RegExp('(.{' + maxlen.toString() + '}(?!' + delimiter + '))',
      'g');
  // Append a delimiter to all sequences that match the regexp.
  str = str.trim().replace(regexp, '$1' + delimiter);
  var carry = '';
  var lines = goog.array.map(str.split(delimiter), function(line) {
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
    goog.array.extend(lines,
        utils.prettyTextWrap(carry, maxlen, delimiter).split(delimiter));
  }

  return lines.join(delimiter);
};

});  // goog.scope

