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
 * @fileoverview PGP/MIME message entity builder (RFC 2045, RFC 2822, RFC 3156).
 * @author yzhu@yahoo-inc.com (Yan Zhu)
 */

goog.provide('e2e.ext.mime.PgpMail');

goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.constants.Mime');
goog.require('e2e.ext.mime.MimeNode');
goog.require('goog.array');


goog.scope(function() {
var ext = e2e.ext;
var constants = e2e.ext.constants;
var mime = e2e.ext.mime;



/**
 * Constructs a PGP/MIME email.
 * @param {!mime.types.MailContent} content The content of the email.
 * @param {!e2e.ext.actions.Executor} actionExecutor Executor for the End-to-
 *   End actions.
 * @param {string} currentUser The author of the email.
 * @param {boolean} signMessage Whether the message should be signed.
 * @param {Array=} opt_recipients The recipients of the email.
 * @param {Array=} opt_passphrases Additional passphrases for encryption.
 * @constructor
 */
ext.mime.PgpMail = function(content, actionExecutor, currentUser,
                            signMessage, opt_recipients, opt_passphrases) {
  this.recipients = opt_recipients;
  this.passphrases = opt_passphrases;
  this.signMessage = signMessage;
  this.actionExecutor_ = actionExecutor;
  this.originalContent = content;
  this.currentUser = currentUser;
};


/**
 * Processes email into an encrypted MIME tree.
 * @param {!function(string)} callback
 */
ext.mime.PgpMail.prototype.buildSignedAndEncrypted = function(callback) {
  var mimetree = this.buildMimeTree_(this.originalContent);
  var request = /** @type {!messages.ApiRequest} */ ({
    action: constants.Actions.ENCRYPT_SIGN,
    content: mimetree,
    signMessage: this.signMessage,
    currentUser: this.currentUser,
    recipients: this.recipients,
    encryptPassphrases: this.passphrases
  });
  this.actionExecutor_.execute(request, this, goog.bind(function(encrypted) {
    var encryptedTree = this.buildEncryptedMimeTree_(encrypted);
    callback(encryptedTree);
  }, this));
};


/**
 * Create a plaintext serialized MIME tree for the email.
 * @param {!mime.types.MailContent} content The plaintext content of the email.
 * @return {string}
 * @private
 */
ext.mime.PgpMail.prototype.buildMimeTree_ = function(content) {
  var rootNode;

  if (!content.attachments || content.attachments.length === 0) {
    // Create a single plaintext node.
    rootNode = new mime.MimeNode({multipart: false,
      contentType: constants.Mime.PLAINTEXT});
    rootNode.setContent(content.body);
  } else {
    // Create a multipart node with children for body and attachments.
    rootNode = new mime.MimeNode({multipart: true,
      contentType: constants.Mime.MULTIPART_MIXED});

    var textNode = rootNode.addChild({multipart: false,
      contentType: constants.Mime.PLAINTEXT});
    textNode.setContent(content.body);

    goog.array.forEach(content.attachments, function(attachment) {
      var filename = attachment.filename;
      var options = {multipart: false,
        contentType: constants.Mime.OCTET_STREAM,
        contentTransferEncoding: constants.Mime.BASE64};

      var attachmentNode = rootNode.addChild(options, filename);
      attachmentNode.setContent(attachment.content);
    });
  }
  return rootNode.buildMessage();
};


/**
 * Builds a serialized MIME tree for PGP-encrypted content, per RFC 3156.
 * @param {string} encrypted The PGP-encrypted content.
 * @return {string}
 * @private
 */
ext.mime.PgpMail.prototype.buildEncryptedMimeTree_ = function(encrypted) {
  // Build the top-level node
  var rootNode = new mime.MimeNode({multipart: true,
    contentType: constants.Mime.DEFAULT_ENCRYPTED_CONTENT_TYPE});

  // Set the required version info.
  var versionNode = rootNode.addChild({multipart: false,
    contentType: constants.Mime.ENCRYPTED});
  versionNode.setContent(constants.Mime.VERSION_CONTENT);

  // Set the ciphertext
  var contentNode = rootNode.addChild({multipart: false,
    contentType: constants.Mime.OCTET_STREAM});
  contentNode.setContent(encrypted);

  return rootNode.buildMessage();
};

});  // goog.scope
