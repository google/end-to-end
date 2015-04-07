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
 * @fileoverview OTR Query message.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.message.Query');

goog.require('e2e.otr.constants');
goog.require('e2e.otr.constants.Version');
goog.require('e2e.otr.error.ParseError');
goog.require('e2e.otr.message.Message');
goog.require('e2e.otr.util.Iterator');


goog.scope(function() {
var constants = e2e.otr.constants;
var versions = constants.Version;



/**
 * OTR query message
 * @constructor
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {number} version A bit array specifying the versions supported.
 * @extends {e2e.otr.message.Message}
 */
e2e.otr.message.Query = function(session, version) {
  goog.base(this, session);
  this.version_ = version;
};
goog.inherits(e2e.otr.message.Query, e2e.otr.message.Message);


/**
 * Generates a Query Message from version flags.
 * @return {string} An OTR Query Message string specifying supported versions.
 */
e2e.otr.message.Query.prototype.toString = function() {
  return constants.MESSAGE_PREFIX.QUERY +
      (this.version_ & versions.V1 ? '?' : '') +
      (this.version_ & ~versions.V1 ? 'v' : '') +
      (this.version_ & versions.V2 ? '2' : '') +
      (this.version_ & versions.V3 ? '3' : '') +
      (this.version_ & ~versions.V1 ? '?' : '');
};


/**
 * Parses a Query Message into a bit array of the versions supported.
 * @param {string} str A Query Message specifying OTR versions supported.
 * @return {number} A bit array with the appropriate version bits set.
 */
e2e.otr.message.Query.parse = function(str) {
  var ret = 0;
  var s = new e2e.otr.util.Iterator(str);

  if (s.next(4) != constants.MESSAGE_PREFIX.QUERY) {
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
          // spec: ignore unknown version identifiers for future compatibility.
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


/**
 * Processes an incoming Query Message.
 * @param {!e2e.otr.Session} session The enclosing session.
 * @param {number} version A bit array specifying the versions supported.
 */
e2e.otr.message.Query.process = function(session, version) {
  if (version & versions.V3 && session.policy.ALLOW_V3) {
    session.initiateOtr();
  }
};
});  // goog.scope
