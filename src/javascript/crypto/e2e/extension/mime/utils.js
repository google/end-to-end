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
 * @fileoverview Helper utils for building/parsing PGP/MIME emails.
 * @author yzhu@yahoo-inc.com (Yan Zhu)
 */

goog.provide('e2e.ext.mime.utils');

goog.require('e2e.error.UnsupportedError');
goog.require('e2e.ext.constants.Mime');
goog.require('goog.array');
goog.require('goog.crypt.base64');
goog.require('goog.object');
goog.require('goog.string');

goog.scope(function() {
var ext = e2e.ext;
var constants = e2e.ext.constants;
var utils = e2e.ext.mime.utils;


/**
 * Extracts the encrypted MIME tree out of PGP/MIME email text.
 * @param {string} text The text to parse.
 * @return {string}
 */
ext.mime.utils.getEncryptedMimeTree = function(text) {
  var rootNode = utils.parseNode_(text);
  var ctHeader = rootNode.header[constants.Mime.CONTENT_TYPE];

  if (ctHeader.value !== constants.Mime.MULTIPART_ENCRYPTED ||
      !ctHeader.params ||
      ctHeader.params.protocol !== constants.Mime.ENCRYPTED ||
      !goog.isArray(rootNode.body)) {
    // This does not appear to be a valid PGP encrypted MIME message.
    utils.fail_(text);
  } else {
    // Next node is the required 'application/pgp-encrypted' version node.
    var middleNode = rootNode.body[0];
    var contentNode = rootNode.body[1];

    if (middleNode.header[constants.Mime.CONTENT_TYPE].value !==
        constants.Mime.ENCRYPTED ||
        contentNode.header[constants.Mime.CONTENT_TYPE].value !==
        constants.Mime.OCTET_STREAM ||
        !goog.isString(contentNode.body) ||
        !goog.isString(middleNode.body)) {
      utils.fail_(text);
    }
    // Next node is the actual encrypted content.
    return contentNode.body;
  }
};


/**
 * Extracts mail content out of a plaintext MIME tree.
 * @param {string} text The text to parse
 * @return {e2e.ext.mime.types.MailContent}
 */
ext.mime.utils.getMailContent = function(text) {
  var mailContent = {};
  var rootNode = utils.parseNode_(text);
  var ctHeader = rootNode.header[constants.Mime.CONTENT_TYPE];

  // Case 1: Single plaintext node.
  if (ctHeader.value === constants.Mime.PLAINTEXT &&
      goog.isString(rootNode.body)) {
    mailContent.body = rootNode.body;
    return mailContent;
  }

  // Case 2: Multipart node
  if (ctHeader.value === constants.Mime.MULTIPART_MIXED &&
      goog.isArray(rootNode.body)) {
    mailContent.attachments = [];

    goog.array.forEach(rootNode.body, goog.bind(function(node) {
      var ct = node.header[constants.Mime.CONTENT_TYPE].value;
      if (!goog.isString(node.body) || !ct) {
        utils.fail_(JSON.stringify(node));
      }
      if (ct === constants.Mime.PLAINTEXT) {
        var text = node.body;
        mailContent.body = mailContent.body ?
            utils.joinLines_([mailContent.body, text]) :
            text;
      } else if (ct === constants.Mime.OCTET_STREAM) {
        try {
          mailContent.attachments.push(
              utils.parseAttachmentEntity_(node));
        } catch (e) {}
      }
    }, this));

    return mailContent;
  }

  // If neither Case 1 or 2, MIME tree is unsupported.
  utils.fail_();
};


/**
 * Extract attachment content from an attachment node.
 * @param {e2e.ext.mime.types.Entity} node
 * @return {e2e.ext.mime.types.Attachment}
 * @private
 */
ext.mime.utils.parseAttachmentEntity_ = function(node) {
  var filename;
  var base64 = false;

  try {
    base64 = (node.header[constants.Mime.CONTENT_TRANSFER_ENCODING].value ===
              constants.Mime.BASE64);
    filename = node.header[constants.Mime.CONTENT_DISPOSITION].params.filename;
  } catch (e) {
    utils.fail_();
  }

  if (!base64 || !filename || !goog.isString(node.body)) {
    utils.fail_();
  }

  return {filename: filename,
    content: goog.crypt.base64.decodeStringToByteArray(node.body)};
};


/**
 * Parses a header value string. Ex: 'multipart/mixed; boundary="foo"'
 * @param {string} text The string to parse
 * @return {e2e.ext.mime.types.HeaderValue}
 */
ext.mime.utils.parseHeaderValue = function(text) {
  var parts = text.split('; ');
  var firstPart = parts.shift();

  // Normalize value to lowercase since it's case insensitive
  var value = goog.string.stripQuotes(firstPart.toLowerCase().trim(),
                                      '"');

  var params = {};
  goog.array.forEach(parts, goog.bind(function(part) {
    // Ex: 'protocol=application/pgp-encrypted'
    var paramParts = part.split('=');
    if (paramParts.length < 2) {
      return;
    }
    // Parameter names are case insensitive acc. to RFC 2045.
    var paramName = paramParts.shift().toLowerCase().trim();
    params[paramName] = goog.string.stripQuotes(
        paramParts.join('=').trim(), '"');
  }, this));

  return {value: value, params: params};
};


/**
 * Serialize a header into an array of strings.
 * @param {e2e.ext.mime.types.Header} header The header to serialize
 * @return {Array.<string>}
 */
ext.mime.utils.serializeHeader = function(header) {
  var lines = [];
  goog.object.forEach(header, function(headerValue, headerName) {
    var line = [headerName + ': ' + headerValue.value];
    goog.object.forEach(headerValue.params, function(paramValue, paramName) {
      line.push(paramName + '=' + goog.string.quote(paramValue));
    });
    lines.push(line.join('; '));
  });
  return lines;
};


/**
 * Parses MIME headers into a dict, optionally extending existing headers.
 * @param {string} text The MIME-formatted header.
 * @return {e2e.ext.mime.types.Header}
 * @private
 */
ext.mime.utils.parseHeader_ = function(text) {
  var parsed = {};

  // Implicit content-type is ASCII plaintext (RFC 2045)
  goog.object.setIfUndefined(parsed, constants.Mime.CONTENT_TYPE, {
    value: constants.Mime.PLAINTEXT,
    params: {charset: constants.Mime.ASCII}
  });
  // Implicit content-transfer-encoding is 7bit (RFC 2045)
  goog.object.setIfUndefined(parsed, constants.Mime.CONTENT_TRANSFER_ENCODING, {
    value: constants.Mime.SEVEN_BIT
  });

  var headerLines = utils.splitLines_(text);
  goog.array.forEach(headerLines, goog.bind(function(line) {
    // Ex: 'Content-Type: multipart/encrypted'
    var parts = line.split(':');
    if (parts.length < 2) {
      return;
    }

    // Header names are not case sensitive. Normalize to TitleCase.
    var name = goog.string.toTitleCase(parts.shift(), '-');
    var value = utils.parseHeaderValue(parts.join(':'));
    parsed[name] = value;
  }, this));
  return parsed;
};


/**
 * Handle failure to parse MIME content.
 * @param {string=} opt_message The content that was not parseable
 * @private
 */
ext.mime.utils.fail_ = function(opt_message) {
  var message = opt_message || '';
  throw new e2e.error.UnsupportedError('Unsupported MIME content: ' + message);
};


/**
 * Splits a MIME message into lines.
 * @param {string} text The message to split
 * @return {Array.<string>}
 * @private
 */
ext.mime.utils.splitLines_ = function(text) {
  return text.split(constants.Mime.CRLF);
};


/**
 * Joins a split MIME message.
 * @param {Array.<string>} lines The lines to join
 * @return {string}
 * @private
 */
ext.mime.utils.joinLines_ = function(lines) {
  return lines.join(constants.Mime.CRLF);
};


/**
 * Splits a MIME message into nodes separated by the MIME boundary ignoring
 *   all lines after the end boundary.
 * @param {string} text The message to split.
 * @param {string} boundary The boundary parameter, as specified in the MIME
 *   header
 * @return {Array.<string>}
 * @private
 */
ext.mime.utils.splitNodes_ = function(text, boundary) {
  var lines = utils.splitLines_(text);
  var startLocation = goog.array.indexOf(lines, '--' + boundary);
  var endLocation = goog.array.indexOf(lines, '--' + boundary + '--');
  if (endLocation === -1 || startLocation === -1) {
    utils.fail_(text);
  }
  // Ignore the epilogue after the end boundary inclusive.
  lines = goog.array.slice(lines, 0, endLocation);
  // Ignore the preamble before the first boundary occurrence inclusive.
  lines = goog.array.slice(lines, startLocation + 1);

  text = utils.joinLines_(lines);
  return text.split('--' + boundary + constants.Mime.CRLF);
};


/**
 * Parses a MIME node into a header and body. For multipart messages,
 *   the body is an array of child nodes. Otherwise body is a string.
 * @param {string} text The text to parse.
 * @return {!e2e.ext.mime.types.Entity}
 * @private
 */
ext.mime.utils.parseNode_ = function(text) {
  // Normalize text by prepending with newline
  text = constants.Mime.CRLF + text;
  // Header must be separated from body by an empty line
  var parts = text.split(constants.Mime.CRLF + constants.Mime.CRLF);
  if (parts.length < 2) {
    utils.fail_(text);
  }

  var header = utils.parseHeader_(parts.shift());
  var body = parts.join(constants.Mime.CRLF + constants.Mime.CRLF);
  var ctHeader = header[constants.Mime.CONTENT_TYPE];
  var parsed = {};
  parsed.header = header;

  if (ctHeader.params && ctHeader.params.boundary) {
    // This appears to be a multipart message. Split text by boundary.
    var nodes = utils.splitNodes_(body, ctHeader.params.boundary);
    // Recursively parse nodes
    parsed.body = goog.array.map(nodes, utils.parseNode_);
  } else {
    parsed.body = body;
  }
  return parsed;
};

});  // goog.scope
