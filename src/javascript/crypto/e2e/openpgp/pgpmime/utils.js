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

goog.require('e2e.openpgp.error.UnsupportedError');

goog.require('e2e.openpgp.pgpmime.Constants');
goog.require('e2e.openpgp.pgpmime.Text');
/** @suppress {extraRequire} import typedef */
goog.require('e2e.openpgp.pgpmime.types.Entity');

goog.require('goog.array');
goog.require('goog.object');
goog.require('goog.string');


/**
 * A message that is displayed when invalid MIME messages are encountered.
 * @const
 * @private
 */
e2e.openpgp.pgpmime.Utils.INVALID_MESSAGE_ = 'Invalid MIME format';


/**
 * The multipart MIME Content-Type.
 * @const
 * @private
 */
e2e.openpgp.pgpmime.Utils.MULTIPART_ = 'multipart/';

goog.scope(function() {
var constants = e2e.openpgp.pgpmime.Constants;
var utils = e2e.openpgp.pgpmime.Utils;


/**
 * Extract attachment content from an attachment node.
 * @param {e2e.openpgp.pgpmime.types.Entity} node
 * @return {e2e.openpgp.pgpmime.types.Attachment}
 */
e2e.openpgp.pgpmime.Utils.parseAttachmentEntity = function(node) {
  var encHeader = node.header[constants.Mime.CONTENT_TRANSFER_ENCODING];
  // Implicit content-transfer-encoding is 7bit (RFC 2045).
  var encoding = constants.Mime.SEVEN_BIT;
  if (goog.isDefAndNotNull(encHeader) && goog.isDefAndNotNull(
      encHeader.value)) {
    encoding = encHeader.value;
  }

  // TODO(ystoller): The parseHeaderValueWithParams method is currently not
  // being called when the Content-Disposition header is parsed. In order to
  // extract the filename (that is a parameter defined in the header), the
  // method must be called and possibly altered to support the parsing required
  // by the Content-Disposition syntax, as defined in RFC 2183.
  var filename = 'unknown';

  if (!goog.isString(node.body)) {
    var errMsg = e2e.openpgp.pgpmime.Utils.INVALID_MESSAGE_ +
        ' - Attachment invalid';
    throw new e2e.openpgp.error.UnsupportedError(errMsg);
  }
  return /** @type {e2e.openpgp.pgpmime.types.Attachment} */ ({filename:
        filename, content: node.body, encoding: encoding});
};


/**
 * Handles a simple header value string (that doesn't have parameters).
 * @param {string} text The header value.
 * @return {e2e.openpgp.pgpmime.types.HeaderValueBasic}
 */
e2e.openpgp.pgpmime.Utils.parseHeaderValueBasic = function(text) {
  return /** @type {e2e.openpgp.pgpmime.types.HeaderValueBasic} */ (
      {value: text.trim()});
};


/**
 * Parses a header value string that might contain parameters.
 * Ex: 'multipart/mixed; boundary="foo"'
 * @param {string} text The string to parse
 * @return {e2e.openpgp.pgpmime.types.HeaderValueWithParams}
 */
e2e.openpgp.pgpmime.Utils.parseHeaderValueWithParams = function(text) {
  var parts = text.split(';');
  var firstPart = parts.shift();

  var value = goog.string.stripQuotes(firstPart.trim(), '"');

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

  return /** @type {e2e.openpgp.pgpmime.types.HeaderValueWithParams} */ (
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
    // Content is wrapped at 64 chars, for compliance with the PEM protocol.
    // Note that CRLF wrapped headers also require a trailing whitespace
    lines.push(e2e.openpgp.pgpmime.Text.prettyTextWrap(
        line.join('; '), constants.MimeNum.LINE_WRAP,
        constants.Mime.CRLF + constants.Mime.WHITESPACE));
  });
  return lines;
};


/**
 * Parses MIME headers into a dict, optionally extending existing headers.
 * @param {string} text The MIME-formatted header.
 * @return {e2e.openpgp.pgpmime.types.Header}
 * @private
 */
e2e.openpgp.pgpmime.Utils.parseHeader_ = function(text) {
  var parsed = /** @type {e2e.openpgp.pgpmime.types.Header} */ ({});
  var headerLines = utils.splitHeaders_(text);

  goog.array.forEach(headerLines, function(line) {
    // Ex: 'Content-Type: multipart/encrypted'
    var parts = goog.string.splitLimit(line, ':', 1);
    if (parts.length < 2) {
      return;
    }

    // Normalizing to TitleCase (this is only used for searching).
    var name = goog.string.toTitleCase(parts.shift(), '-').trim();

    if (name === constants.Mime.CONTENT_TYPE) {
      var value = utils.parseHeaderValueWithParams(parts.join(':'));
    } else {
      var value = utils.parseHeaderValueBasic(parts.join(':'));
    }

    if (goog.isDefAndNotNull(parsed[name]) && (name ===
        constants.Mime.CONTENT_TYPE || name ===
        constants.Mime.CONTENT_TRANSFER_ENCODING)) {
      // The Content-Type and Content-Transfer-Encoding headers should only be
      // set once per node. If they appears twice, this most likely indicates an
      // invalidly formatted email.
      var errMsg = e2e.openpgp.pgpmime.Utils.INVALID_MESSAGE_ +
          ' - duplicate headers';
      throw new e2e.openpgp.error.UnsupportedError(errMsg);
    }
    // TODO(ystoller): Allow the code to retain multiple headers (when
    // applicable, e.g., for the "Received" header, which often appears multiple
    // times)
    parsed[name] = value;
  });

  // Implicit content-type is ASCII plaintext (RFC 2045).
  goog.object.setIfUndefined(parsed, constants.Mime.CONTENT_TYPE, {
    value: constants.Mime.PLAINTEXT,
    params: {charset: constants.Mime.ASCII}
  });
  // Implicit content-transfer-encoding is 7bit (RFC 2045).
  goog.object.setIfUndefined(parsed, constants.Mime.CONTENT_TRANSFER_ENCODING, {
    value: constants.Mime.SEVEN_BIT
  });
  return parsed;
};


/**
 * Separates MIME headers.
 * @param {string} text A string containing a variable number of MIME headers
 * @return {Array.<string>} An array in which each element is a header
 * @private
 */
e2e.openpgp.pgpmime.Utils.splitHeaders_ = function(text) {
  var splitter = new RegExp('\r?\n(?![\x20\x09]+)');
  // Per RFC 2047 part 2., a multiline header should be wrapped by CRLF SPACE.
  // Distinct header lines should be separated from each other by a sole CRLF.
  // In practice, many email systems use an arbitrary amount of tabs and
  // spaces instead of a single SPACE. To accomodate this, we separate
  // headers by looking for CRLFs that are not followed by any variable amount
  // of tabs or spaces.
  var lines = text.split(splitter);

  var remove = new RegExp('\r?\n[\x20\x09]+');
  var headers = [];
  goog.array.forEach(lines, function(line) {
    // Rebuild the original header by removing the CRLF and tabs/whitespaces
    // that were used to wrap it.
    headers.push(line.replace(remove, ''));
  });
  return headers;
};


/**
 * Splits a MIME message into nodes separated by the MIME boundary ignoring
 *   all lines after the end boundary.
 * @param {string} text The message to split.
 * @param {string} boundary The boundary parameter, as specified in the MIME
 *     header
 * @return {Array.<string>}
 * @private
 */
e2e.openpgp.pgpmime.Utils.splitNodes_ = function(text, boundary) {
  var separator = new RegExp('\r?\n');
  var lines = text.split(separator);
  var startLocation = goog.array.indexOf(lines, '--' + boundary);
  var endLocation = goog.array.indexOf(lines, '--' + boundary + '--');
  if (endLocation === -1 || startLocation === -1) {
    var errMsg = e2e.openpgp.pgpmime.Utils.INVALID_MESSAGE_ +
        ' - cannot find boundary in multipart message';
    throw new e2e.openpgp.error.UnsupportedError(errMsg);
  }
  // Ignore the epilogue after the end boundary inclusive.
  lines = goog.array.slice(lines, 0, endLocation);
  // Ignore the preamble before the first boundary occurrence inclusive.
  lines = goog.array.slice(lines, startLocation + 1);

  text = lines.join(constants.Mime.CRLF);
  // The boundary may contain characters that are invalid within a regex,
  // so they need to be escaped first.
  var escapedBoundary = goog.string.regExpEscape(boundary);
  return text.split(new RegExp('--' + escapedBoundary + '\r?\n'));
};


/**
 * Parses a MIME node into a header and body. For multipart messages,
 * the body is an array of child nodes. Otherwise body is a string.
 * @param {string} text The text to parse.
 * @return {!e2e.openpgp.pgpmime.types.Entity}
 */
e2e.openpgp.pgpmime.Utils.parseNode = function(text) {
  var separator = new RegExp('\r?\n\r?\n');
  // Normalize text by prepending with newline
  text = constants.Mime.CRLF + text;
  // Header must be separated from body by an empty line
  var parts = text.split(separator);
  if (parts.length < 2) {
    var errMsg = e2e.openpgp.pgpmime.Utils.INVALID_MESSAGE_ +
        ' - no CRLF between headers and body';
    throw new e2e.openpgp.error.UnsupportedError(errMsg);
  }

  var header = utils.parseHeader_(parts.shift());
  var body = parts.join(constants.Mime.CRLF + constants.Mime.CRLF);

  var ctHeader = /** @type {e2e.openpgp.pgpmime.types.HeaderValueWithParams} */
      (header[constants.Mime.CONTENT_TYPE]);
  var parsed = {};
  parsed.header = header;

  if (goog.string.caseInsensitiveStartsWith(ctHeader.value.trim(),
      e2e.openpgp.pgpmime.Utils.MULTIPART_) &&
      goog.isDefAndNotNull(ctHeader.params) &&
      goog.isDefAndNotNull(ctHeader.params['boundary'])) {
    // This appears to be a multipart message. Split text by boundary.
    var nodes = utils.splitNodes_(body, ctHeader.params['boundary']);
    // Recursively parse nodes.
    parsed.body = [];
    goog.array.forEach(nodes, function(node) {
      parsed.body.push(utils.parseNode(node));
    });
  } else {
    // Body is a string.
    parsed.body = body;
  }
  return parsed;
};


});  // goog.scope
