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

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.crypt.base64');
goog.require('goog.object');
goog.require('goog.string');

goog.scope(function() {
var constants = e2e.openpgp.pgpmime.Constants;
var utils = e2e.openpgp.pgpmime.Utils;


/**
 * Extract attachment content from an attachment node.
 * @param {e2e.openpgp.pgpmime.types.Entity} node
 * @return {e2e.openpgp.pgpmime.types.Attachment}
 */
e2e.openpgp.pgpmime.Utils.parseAttachmentEntity = function(node) {
  var filename;
  var encHeader = node.header[constants.Mime.CONTENT_TRANSFER_ENCODING];
  // Implicit content-transfer-encoding is 7bit (RFC 2045).
  var encoding = constants.Mime.SEVEN_BIT;
  if (goog.isDefAndNotNull(encHeader) && goog.isDefAndNotNull(
      encHeader.value)) {
    encoding = encHeader.value;
  }

  try {
    filename = node.header[constants.Mime.CONTENT_DISPOSITION].params.filename;
    encoding = node.header[constants.Mime.CONTENT_TRANSFER_ENCODING].value;
  } catch (e) {
    throw new e2e.openpgp.error.UnsupportedError('');
  }

  if (!filename || !goog.isString(node.body)) {
    throw new e2e.openpgp.error.UnsupportedError('');
  }
  return {filename: goog.asserts.assertString(filename), content: node.body,
        encoding: encoding};
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
 * @param {?string=} opt_separator True if the node should be separated by
 *     a different separator than crlf ('\r\n'). Some email systems only use
 *     linefeeds or carriage returns.
 * @return {e2e.openpgp.pgpmime.types.Header}
 * @private
 */
e2e.openpgp.pgpmime.Utils.parseHeader_ = function(text, opt_separator) {
  var parsed = /** @type {e2e.openpgp.pgpmime.types.Header} */ ({});

  // Implicit content-type is ASCII plaintext (RFC 2045).
  goog.object.setIfUndefined(parsed, constants.Mime.CONTENT_TYPE, {
    value: constants.Mime.PLAINTEXT,
    params: {charset: constants.Mime.ASCII}
  });
  // Implicit content-transfer-encoding is 7bit (RFC 2045).
  goog.object.setIfUndefined(parsed, constants.Mime.CONTENT_TRANSFER_ENCODING, {
    value: constants.Mime.SEVEN_BIT
  });

  var headerLines = utils.splitHeaders_(text, opt_separator);
  goog.array.forEach(headerLines, function(line) {
    // Ex: 'Content-Type: multipart/encrypted'
    var parts = line.split(':');
    if (parts.length < 2) {
      return;
    }

    // Header names are not case sensitive. Normalize to TitleCase.
    var name = goog.string.toTitleCase(parts.shift(), '-');
    var value = utils.parseHeaderValue(parts.join(':'));
    parsed[name] = value;
  });
  return parsed;
};


/**
 * Separates MIME headers.
 * @param {string} text A string containing a variable number of MIME headers
 * @param {?string=} opt_separator True if the node should be separated by
 *     a different separator than crlf ('\r\n'). Some email systems only use
 *     linefeeds or carriage returns.
 * @return {Array.<string>} An array in which each element is a header
 * @private
 */
e2e.openpgp.pgpmime.Utils.splitHeaders_ = function(text, opt_separator) {
  var separator = constants.Mime.CRLF;
  if (goog.isDefAndNotNull(opt_separator)) {
    separator = opt_separator;
  }
  var splitter = new RegExp(separator + '(?![\x20\x09]+)');
  // Per RFC 2047 part 2., a multiline header should be wrapped by CRLF SPACE.
  // Distinct header lines should be separated from each other by a sole CRLF.
  // In practice, many email systems use an arbitrary amount of tabs and
  // whitespaces instead of a single SPACE. To accomodate this, we separate
  // headers by looking for CRLFs that are not followed by any variable amount
  // of tabs or whitespaces.
  var lines = text.split(splitter);

  var remove = new RegExp(separator + '[\x20\x09]+');
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
 * @param {?string=} opt_separator True if the node should be separated by
 *     a different separator than crlf ('\r\n'). Some email systems only use
 *     linefeeds or carriage returns.
 * @return {Array.<string>}
 * @private
 */
e2e.openpgp.pgpmime.Utils.splitNodes_ = function(text, boundary,
    opt_separator) {
  var separator = constants.Mime.CRLF;
  if (goog.isDefAndNotNull(opt_separator)) {
    separator = opt_separator;
  }
  var lines = text.split(separator);
  var startLocation = goog.array.indexOf(lines, '--' + boundary);
  var endLocation = goog.array.indexOf(lines, '--' + boundary + '--');
  if (endLocation === -1 || startLocation === -1) {
    throw new e2e.openpgp.error.UnsupportedError(text);
  }
  // Ignore the epilogue after the end boundary inclusive.
  lines = goog.array.slice(lines, 0, endLocation);
  // Ignore the preamble before the first boundary occurrence inclusive.
  lines = goog.array.slice(lines, startLocation + 1);

  text = lines.join(separator);
  return text.split('--' + boundary + separator);
};


/**
 * Parses a MIME node into a header and body. For multipart messages,
 * the body is an array of child nodes. Otherwise body is a string.
 * @param {string} text The text to parse.
 * @param {?string=} opt_separator True if the node should be separated by
 *     a different separator than crlf ('\r\n'). Some email systems only use
 *     linefeeds or carriage returns.
 * @return {!e2e.openpgp.pgpmime.types.Entity}
 */
e2e.openpgp.pgpmime.Utils.parseNode = function(text, opt_separator) {
  var separator = constants.Mime.CRLF;
  if (goog.isDefAndNotNull(opt_separator)) {
    separator = opt_separator;
  }
  // Normalize text by prepending with newline
  text = separator + text;
  // Header must be separated from body by an empty line
  var parts = text.split(separator + separator);
  if (parts.length < 2) {
    throw new e2e.openpgp.error.UnsupportedError(text);
  }

  var header = utils.parseHeader_(parts.shift(), opt_separator);
  var body = parts.join(separator + separator);
  var ctHeader = header[constants.Mime.CONTENT_TYPE];
  var parsed = {};
  parsed.header = header;

  if (ctHeader.params && ctHeader.params.boundary) {
    // This appears to be a multipart message. Split text by boundary.
    var nodes = utils.splitNodes_(body, ctHeader.params.boundary,
        opt_separator);
    // Recursively parse nodes.
    parsed.body = [];
    goog.array.forEach(nodes, function(node) {
      parsed.body.push(utils.parseNode(node, opt_separator));
    });
  } else {
    // Body is a string.
    parsed.body = body;
  }
  return parsed;
};


/**
 * Parses a MIME node into a header and body. For multipart messages,
 * the body is an array of child nodes. Otherwise body is a string.
 * @param {string} content The content to decode
 * @param {string} encoding The current encoding of the content
 * @return {string}
 */
e2e.openpgp.pgpmime.Utils.decodeContent = function(content, encoding) {
  if (encoding === constants.Mime.BASE64) {
    return goog.crypt.base64.decodeString(content);
  } else if (encoding === constants.Mime.SEVEN_BIT ||
             encoding === constants.Mime.EIGHT_BIT) {
    return content;
  } else if (encoding === constants.Mime.QUOTED_PRINTABLE) {
    return content.replace(/=([A-Fa-f0-9]{2})/g, function(m, g1) {
      return String.fromCharCode(parseInt(g1, 16));
    });
  } else if (encoding === constants.Mime.BINARY) {
    // TODO add support for binary encoding
    return content;
  }
  // Unidentified encoding. Simply return content.
  return content;
};

});  // goog.scope
