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
 * @fileoverview MIME nodes for building PGP/MIME emails.
 * @author yzhu@yahoo-inc.com (Yan Zhu)
 */

goog.provide('e2e.ext.mime.MimeNode');

goog.require('e2e.ext.constants.Mime');
goog.require('e2e.ext.mime.utils');
goog.require('goog.array');
goog.require('goog.crypt.base64');
goog.require('goog.object');
goog.require('goog.string');

goog.scope(function() {
var ext = e2e.ext;
var constants = e2e.ext.constants;



/**
 * Constructor for a MIME tree node.
 * @param {{
 *   contentType: string,
 *   contentTransferEncoding: (string|undefined),
 *   multipart: boolean
 * }} options Options to initialize for the node.
 * @param {e2e.ext.mime.MimeNode=} opt_parent The parent node.
 * @param {string=} opt_filename Name of the file, if the node is an attachment.
 *   to false.
 * @constructor
 */
ext.mime.MimeNode = function(options, opt_parent, opt_filename) {
  this.parent = opt_parent || this;
  this.filename = opt_filename;

  this.multipart_ = options.multipart;
  this.children_ = [];
  this.header_ = /** @type {e2e.ext.mime.types.Header} */ ({});
  this.content_ = null;
  this.boundary_ = '';

  this.setHeader_(constants.Mime.CONTENT_TYPE, options.contentType);

  // Default content transfer encoding is 7bit, according to RFC 2045
  var ctEncoding = options.contentTransferEncoding ?
      options.contentTransferEncoding : constants.Mime.SEVEN_BIT;
  this.setHeader_(constants.Mime.CONTENT_TRANSFER_ENCODING, ctEncoding);

  this.setBoundary_();
};


/**
 * Sets the MIME message boundary for a node.
 * @private
 */
ext.mime.MimeNode.prototype.setBoundary_ = function() {
  // TODO: Strictly ensure that the boundary value doesn't coincide with
  //   any string in the email content and headers.
  this.boundary_ = '---' + goog.string.getRandomString() +
      Math.floor(Date.now() / 1000).toString();
};


/**
 * Adds a child to a MIME node.
 * @param {{
 *   contentType: string,
 *   contentTransferEncoding: (string|undefined),
 *   multipart: boolean
 * }} options Options to initialize for the node.
 * @param {string=} opt_filename Name of the file, if one exists.
 * @return {e2e.ext.mime.MimeNode}
 */
ext.mime.MimeNode.prototype.addChild = function(options, opt_filename) {
  var node = new ext.mime.MimeNode(options, this, opt_filename);
  this.children_.push(node);
  return node;
};


/**
 * Sets a MIME header.
 * @param {string} key Name of the header.
 * @param {string} value Value of the header, possibly including parameters.
 * @param {Object.<string, string>=} opt_params Optional dict of additional
 *   parameters
 * @private
 */
ext.mime.MimeNode.prototype.setHeader_ = function(key, value, opt_params) {
  var headerValue = ext.mime.utils.parseHeaderValue(value);
  if (opt_params) {
    headerValue.params = headerValue.params || {};
    goog.object.extend(headerValue.params, opt_params);
  }
  goog.object.set(this.header_, key, headerValue);
};


/**
 * Sets the content.
 * @param {(string|!e2e.byteArray)} content The content to set
 */
ext.mime.MimeNode.prototype.setContent = function(content) {
  this.content_ = content;
};


/**
 * Builds an RFC 2822 message from the node and its children.
 * @return {string}
 */
ext.mime.MimeNode.prototype.buildMessage = function() {
  var lines = [];
  var transferEncoding =
      this.header_[constants.Mime.CONTENT_TRANSFER_ENCODING];
  var contentType = this.header_[constants.Mime.CONTENT_TYPE];

  // Set required header fields
  if (this.filename && !this.header_[constants.Mime.CONTENT_DISPOSITION]) {
    // Set the correct content disposition header for attachments.
    this.setHeader_(constants.Mime.CONTENT_DISPOSITION,
                    constants.Mime.ATTACHMENT,
                    {filename: this.filename});
  } else if (this.content_ && goog.typeOf(this.content_) === 'string') {
    // TODO: Support other charsets.
    contentType.params.charset = contentType.params.charset ||
        constants.Mime.UTF8;
  } else if (this.multipart_) {
    // Multipart messages need to specify a boundary
    contentType.params.boundary = this.boundary_;
  }

  // TODO: Wrap header lines at 76 chars
  lines = lines.concat(ext.mime.utils.serializeHeader(this.header_));

  lines.push('');

  if (this.content_) {
    if (transferEncoding.value === constants.Mime.BASE64 ||
        goog.typeOf(this.content_) !== 'string') {
      // TODO: Wrap lines at 76 chars
      lines.push(goog.typeOf(this.content_) === 'string' ?
                 goog.crypt.base64.encodeString(this.content_) :
                 goog.crypt.base64.encodeByteArray(this.content_));
    } else {
      // TODO: Technically lines must be wrapped at 1000 chars max for SMTP.
      lines.push(this.content_);
    }
    if (this.multipart_) {
      lines.push('');
    }
  }

  if (this.multipart_) {
    goog.array.forEach(this.children_, goog.bind(function(node) {
      lines.push('--' + this.boundary_);
      lines.push(node.buildMessage());
    }, this));
    lines.push('--' + this.boundary_ + '--');
    lines.push('');
  }

  return lines.join(constants.Mime.CRLF);
};

});  // goog.scope
