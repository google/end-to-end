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
 * @param {!e2e.openpgp.pgpmime.types.ContentAndHeaders} content The unencrypted
 *     content of the email, including necessary email headers
 * @param {string=} opt_preamble Text preceding the body of the message. This
 *     text will be appended to the beginning of the PGP-MIME message, within
 *     the root node
 * @constructor
 */
e2e.openpgp.pgpmime.PgpMail = function(content, opt_preamble) {
  this.content = content;
  this.preamble = opt_preamble || '';
};


/**
 * Builds a plaintext serialized MIME tree for the email.
 * @param {!e2e.openpgp.pgpmime.types.MailContent} content The plaintext
 *     content of the email.
 * @return {string}
 * @private
 */
e2e.openpgp.pgpmime.PgpMail.prototype.buildMimeTree_ = function(content) {
  var rootNode;

  if (!content.attachments || content.attachments.length === 0) {
    // Create a single plaintext node.
    rootNode = new pgpmime.MimeNode({multipart: false,
      optionalHeaders: [{name: constants.Mime.CONTENT_TYPE,
        value: constants.Mime.PLAINTEXT}]});
    rootNode.setContent(content.body);
  } else {
    // Create a multipart node with children for body and attachments.
    rootNode = new pgpmime.MimeNode({multipart: true,
      optionalHeaders: [{name: constants.Mime.CONTENT_TYPE,
        value: constants.Mime.MULTIPART_MIXED}]});
    var textNode = rootNode.addChild({multipart: false,
      optionalHeaders: [{name: constants.Mime.CONTENT_TYPE,
        value: constants.Mime.PLAINTEXT}]});
    textNode.setContent(content.body);

    goog.array.forEach(content.attachments, function(attachment) {
      var filename = attachment.filename;
      var options = {multipart: false,
        contentType: {type: constants.Mime.OCTET_STREAM},
        optionalHeaders: [{name: constants.Mime.CONTENT_TRANSFER_ENCODING,
          value: constants.Mime.BASE64}
        ]};
      var attachmentNode = rootNode.addChild(options, filename);
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

  // Build the top-level node
  var rootNode = new pgpmime.MimeNode({multipart: true,
    optionalHeaders: [
      // Default content transfer encoding is 7bit, according to RFC 2045
      {name: constants.Mime.CONTENT_TYPE,
        value: constants.Mime.DEFAULT_ENCRYPTED_CONTENT_TYPE},
      {name: constants.Mime.CONTENT_TRANSFER_ENCODING,
        value: constants.Mime.SEVEN_BIT},
      {name: constants.Mime.SUBJECT, value: this.content.subject},
      {name: constants.Mime.FROM, value: this.content.from},
      {name: constants.Mime.TO, value: this.content.to},
      {name: constants.Mime.IN_REPLY_TO, value: this.content.inReplyTo},
      {name: constants.Mime.MIME_VERSION,
        value: constants.Mime.MIME_VERSION_NUMBER}]});
  rootNode.setContent(this.preamble);

  // Set the required version info
  // We're currently treating this node as an attachment (by including a
  // name field), rather than solely containing the version/control information.
  var versionNode = rootNode.addChild({multipart: false,
    optionalHeaders: [
      {name: constants.Mime.CONTENT_TYPE,
        value: constants.Mime.ENCRYPTED,
        params: {'charset': 'utf-8', 'name': 'version.asc'}},
      {name: constants.Mime.CONTENT_TRANSFER_ENCODING,
        value: constants.Mime.SEVEN_BIT},
      {name: constants.Mime.CONTENT_DESCRIPTION,
        value: 'PGP/MIME Versions Identification'}]});
  versionNode.setContent(constants.Mime.VERSION_CONTENT);

  // Set the ciphertext
  // Due to Gmail bug, we use constants.Mime.PLAINTEXT instead of
  // constants.Mime.OCTET_STREAM for contentType
  var contentNode = rootNode.addChild({multipart: false,
    optionalHeaders: [
      {name: constants.Mime.CONTENT_TYPE,
        value: constants.Mime.PLAINTEXT,
        params: {'charset': 'utf-8', 'name': 'encrypted.asc'}},
      {name: constants.Mime.CONTENT_TRANSFER_ENCODING,
        value: constants.Mime.SEVEN_BIT}]});
  contentNode.setContent(this.content.body);

  // buildMessage() returns the string representation of the object
  return rootNode.buildMessage();
};

});  // goog.scope
