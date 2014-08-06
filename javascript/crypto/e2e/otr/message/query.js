// Copyright 2014 Google Inc. All Rights Reserved.
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
 * @fileoverview OTR Query message.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.Query');

goog.require('e2e.otr.constants');
goog.require('e2e.otr.error.ParseError');
goog.require('e2e.otr.util.Iterator');


goog.scope(function() {
var constants = e2e.otr.constants;
var versions = constants.Version;

/**
 * The prefix for OTR query messages.
 * @const
 */
var OTR_PREFIX = '?OTR';

/**
 * Generates a Query Message from version flags.
 * @param {number} version A bit array specifying the versions supported.
 * @return {string} An OTR Query Message string specifying supported versions.
 */
e2e.otr.message.Query.fromVersion = function(version) {
  return OTR_PREFIX +
      (version & versions.V1 ? '?' : '') +
      (version & ~versions.V1 ? 'v' : '') +
      (version & versions.V2 ? '2' : '') +
      (version & versions.V3 ? '3' : '') +
      (version & ~versions.V1 ? '?' : '');
};


/**
 * Parses a Query Message into a bit array of the versions supported.
 * @param {string} str A Query Message specifying OTR versions supported.
 * @return {number} A bit array with the appropriate version bits set.
 */
e2e.otr.message.Query.parse = function(str) {
  var ret = 0;
  var s = new e2e.otr.util.Iterator(str);

  if (s.next(4) != OTR_PREFIX) {
    throw new e2e.otr.error.ParseError('Invalid Query Message: ?OTR not found');
  }

  if (s.peek() == '?') {
    ret |= versions.V1;
    s.next();
  }

  if (s.hasNext() && s.peek() == 'v') {
    s.next();
    while (s.hasNext() && s.peek() != '?') {
      switch (s.next()) {
        case '2':
          if (ret & versions.V2) {
            throw new e2e.otr.error.ParseError('Version already listed');
          }
          ret |= versions.V2;
          break;
        case '3':
          if (ret & versions.V3) {
            throw new e2e.otr.error.ParseError('Version already listed');
          }
          ret |= versions.V3;
          break;
        default:
          // spec: ignore unknown version identifiers for future compatability.
      }
    }
    if (s.next() != '?') {
      throw new e2e.otr.error.ParseError('OTR version not "?" terminated');
    }
  }

  if (s.hasNext()) {
    throw new e2e.otr.error.ParseError('Extra data after version string');
  }
  return ret;
};


/**
 * Parses the last valid embedded Query Message.
 * @param {string} str A Query Message specifying OTR versions supported.
 * @return {number} A bit array with the appropriate version bits set.
 */
e2e.otr.message.Query.parseEmbedded = function(str) {
  var matches = str.match(/\?OTR(\??v[^?]*?)?\?/g) || [];
  for (var i = matches.length - 1; i >= 0; --i) {
    try {
      return e2e.otr.message.Query.parse(matches[i]);
    } catch (e) {}
  }

  // no valid OTR query messages found.
  return 0;
};
});
