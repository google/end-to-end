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
 * @fileoverview PGP/MIME message entity builder (RFC 2045, RFC 2822, RFC 3156).
 * @author yzhu@yahoo-inc.com (Yan Zhu)
 */

goog.provide('e2e.openpgp.pgpmime.PgpMail');

goog.require('e2e.openpgp.pgpmime.Constants');
goog.require('e2e.openpgp.pgpmime.MimeNode');
goog.require('goog.array');


goog.scope(function() {
var pgpmime = e2e.openpgp.pgpmime;
var constants = pgpmime.Constants;



/**
 * Constructs an object that represents a PGP/MIME email.
 * @param {!e2e.openpgp.pgpmime.types.ContentAndHeaders} content The content of
 *     the email, including necessary email headers.
 *     If an ordinary MIME message is being constructed, the content will be
 *     unencrytped. However, if a PGP/MIME message is being constructed, the
 *     the content will include encrypted data.
 * @param {string=} opt_preamble Text preceding the body of the message. This
 *     text will be appended to the beginning of the PGP/MIME message, within
 *     the root node.
 * @constructor
 */
e2e.openpgp.pgpmime.PgpMail = function(content, opt_preamble) {
  this.content = content;
  this.preamble = opt_preamble || '';
};


/**
 * Processes the addition of certain optional headers, including
 * (subject, from, to, in-reply-to)
 * @param {!Array<!Object<string, string>>} optionalHeaders An array of headers
 *     that have already been defined
 * @return {!Array<!Object<string, string>>}
 */
e2e.openpgp.pgpmime.PgpMail.prototype.addOptionalHeaders =
    function(optionalHeaders) {
  if (goog.isDefAndNotNull(this.content.subject)) {
    optionalHeaders.push({name: constants.Mime.SUBJECT,
      value: this.content.subject});
  }
  if (goog.isDefAndNotNull(this.content.from)) {
    optionalHeaders.push({name: constants.Mime.FROM, value: this.content.from});
  }
  if (goog.isDefAndNotNull(this.content.to)) {
    optionalHeaders.push({name: constants.Mime.TO, value: this.content.to});
  }
  if (goog.isDefAndNotNull(this.content.inReplyTo)) {
    optionalHeaders.push({name: constants.Mime.IN_REPLY_TO,
      value: this.content.inReplyTo});
  }
  return optionalHeaders;
};


/**
 * Builds a plaintext serialized MIME tree for the email.
 * @return {string}
 */
e2e.openpgp.pgpmime.PgpMail.prototype.buildMimeTree = function() {
  var rootNode;
  var optionalHeaders;

  if (!this.content.attachments || this.content.attachments.length === 0) {
    // Create a single plaintext node.
    optionalHeaders = [{name: constants.Mime.CONTENT_TYPE,
      value: constants.Mime.PLAINTEXT},
    {name: constants.Mime.CONTENT_TRANSFER_ENCODING,
      value: constants.Mime.SEVEN_BIT}];
    optionalHeaders = this.addOptionalHeaders(optionalHeaders);
    optionalHeaders.push({name: constants.Mime.MIME_VERSION,
      value: constants.Mime.MIME_VERSION_NUMBER});
    rootNode = new pgpmime.MimeNode({multipart: false,
      optionalHeaders: optionalHeaders});
    rootNode.setContent(this.content.body);

  } else {
    // Create a multipart node with children for body and attachments.
    optionalHeaders = [{name: constants.Mime.CONTENT_TYPE,
      value: constants.Mime.MULTIPART_MIXED},
    {name: constants.Mime.CONTENT_TRANSFER_ENCODING,
      value: constants.Mime.SEVEN_BIT}];
    optionalHeaders = this.addOptionalHeaders(optionalHeaders);
    optionalHeaders.push({name: constants.Mime.MIME_VERSION,
      value: constants.Mime.MIME_VERSION_NUMBER});
    rootNode = new pgpmime.MimeNode({multipart: true,
      optionalHeaders: optionalHeaders});
    rootNode.setContent(this.preamble);

    var textNode = rootNode.addChild({multipart: false,
      optionalHeaders: [{name: constants.Mime.CONTENT_TYPE,
        value: constants.Mime.PLAINTEXT},
      {name: constants.Mime.CONTENT_TRANSFER_ENCODING,
        value: constants.Mime.SEVEN_BIT}]});
    textNode.setContent(this.content.body);

    goog.array.forEach(this.content.attachments, function(attachment) {
      var contentType = constants.Mime.OCTET_STREAM;
      // Implicit content-transfer-encoding is 7bit (RFC 2045).
      var contentTransferEncoding = constants.Mime.SEVEN_BIT;

      if (goog.isDefAndNotNull(attachment.type)) {
        contentType = attachment.type;
      }
      if (goog.isDefAndNotNull(attachment.encoding)) {
        contentTransferEncoding = attachment.encoding;
      }

      var options = {multipart: false,
        optionalHeaders: [{name: constants.Mime.CONTENT_TYPE,
          value: contentType},
        {name: constants.Mime.CONTENT_DISPOSITION,
          value: constants.Mime.ATTACHMENT,
          params: {filename: attachment.filename}},
        {name: constants.Mime.CONTENT_TRANSFER_ENCODING,
          value: contentTransferEncoding}
        ]};
      var attachmentNode = rootNode.addChild(options);
      attachmentNode.setContent(attachment.content);
    });
  }
  return rootNode.buildMessage();
};


/**
 * Builds a serialized MIME tree for PGP-encrypted content, per RFC 3156.
 * @return {string}
 */
e2e.openpgp.pgpmime.PgpMail.prototype.buildPGPMimeTree = function() {
  var optionalHeaders = [
    // Default content transfer encoding is 7bit, according to RFC 2045
    {name: constants.Mime.CONTENT_TYPE,
      value: constants.Mime.DEFAULT_ENCRYPTED_CONTENT_TYPE},
    {name: constants.Mime.CONTENT_TRANSFER_ENCODING,
      value: constants.Mime.SEVEN_BIT}];
  optionalHeaders = this.addOptionalHeaders(optionalHeaders);
  optionalHeaders.push({name: constants.Mime.MIME_VERSION,
    value: constants.Mime.MIME_VERSION_NUMBER});

  // Build the top-level node
  var rootNode = new pgpmime.MimeNode({
    multipart: true, optionalHeaders: optionalHeaders});
  rootNode.setContent(this.preamble);

  // Set the required version info.
  var versionNode = rootNode.addChild({multipart: false,
    optionalHeaders: [
      {name: constants.Mime.CONTENT_TYPE, value: constants.Mime.ENCRYPTED,
        params:
            {'charset': constants.Mime.UTF8,
              'name': constants.Mime.VERSION_ASC}},
      {name: constants.Mime.CONTENT_TRANSFER_ENCODING,
        value: constants.Mime.SEVEN_BIT},
      {name: constants.Mime.CONTENT_DESCRIPTION,
        value: constants.Mime.PGP_MIME_DESCRIPTION}]});
  versionNode.setContent(constants.Mime.VERSION_CONTENT);

  var contentNode = rootNode.addChild({multipart: false,
    optionalHeaders: [
      {name: constants.Mime.CONTENT_TYPE,
        value: constants.Mime.OCTET_STREAM,
        params: {'name': constants.Mime.ENCRYPTED_ASC}},
      {name: constants.Mime.CONTENT_DISPOSITION,
        value: constants.Mime.INLINE,
        params: {'name': constants.Mime.ENCRYPTED_ASC}},
      {name: constants.Mime.CONTENT_TRANSFER_ENCODING,
        value: constants.Mime.SEVEN_BIT}]});
  contentNode.setContent(this.content.body);

  // buildMessage() returns the string representation of the object.
  return rootNode.buildMessage();
};

});  // goog.scope
