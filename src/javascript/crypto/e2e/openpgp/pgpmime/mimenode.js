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
 * @fileoverview main module for the safe mail app.
 * @author yzhu@yahoo-inc.com (Yan Zhu)
 */

goog.provide('e2e.openpgp.pgpmime.MimeNode');

goog.require('e2e.openpgp.pgpmime.Constants');
goog.require('e2e.openpgp.pgpmime.Utils');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.crypt.base64');
goog.require('goog.object');
goog.require('goog.string');

goog.scope(function() {
var pgpmime = e2e.openpgp.pgpmime;
var constants = pgpmime.Constants;



/**
 * Constructor for a MIME tree node.
 * @param {{
 *   multipart: boolean,
 *   optionalHeaders: (Array<{name: string, value: string}>|undefined)
 * }} options Options to initialize for the node.
 * @param {e2e.openpgp.pgpmime.MimeNode=} opt_parent The parent node.
 * @param {string=} opt_filename Name of the file, if the node is an attachment
 * @constructor
 */
e2e.openpgp.pgpmime.MimeNode = function(options, opt_parent, opt_filename) {
  this.parent = opt_parent || this;
  this.filename = opt_filename;
  this.multipart_ = options.multipart;

  this.children_ = [];
  this.header_ = /** @type {e2e.openpgp.pgpmime.types.Header} */ ({});
  this.content_ = null;
  this.boundary_ = '';

  // set optional headers
  if (goog.isDefAndNotNull(options.optionalHeaders)) {
    goog.array.forEach(options.optionalHeaders, goog.bind(function(header) {
      if (goog.isDefAndNotNull(header.name) &&
          goog.isDefAndNotNull(header.value)) {
        if (goog.isDefAndNotNull(header.params)) {
          this.setHeader_(header.name, header.value, header.params);
        } else {
          this.setHeader_(header.name, header.value);
        }
      }
    }, this));
  }

  this.setBoundary_();
};


/**
 * Sets the MIME message boundary for a node.
 * @private
 */
e2e.openpgp.pgpmime.MimeNode.prototype.setBoundary_ = function() {
  // TODO: Strictly ensure that the boundary value doesn't coincide with
  //   any string in the email content and headers.
  this.boundary_ = '---' + goog.string.getRandomString() +
      Math.floor(Date.now() / 1000).toString();
};


/**
 * Adds a child to a MIME node.
 * @param {{
 *   multipart: boolean,
 *   optionalHeaders: (Array<{name: string, value: string}>|undefined)
 * }} options Options to initialize for the node.
 * @param {string=} opt_filename Name of the file, if one exists.
 * @return {e2e.openpgp.pgpmime.MimeNode}
 */
e2e.openpgp.pgpmime.MimeNode.prototype.addChild =
    function(options, opt_filename) {
  var node = new e2e.openpgp.pgpmime.MimeNode(options, this, opt_filename);
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
e2e.openpgp.pgpmime.MimeNode.prototype.setHeader_ =
    function(key, value, opt_params) {
  var headerValue = e2e.openpgp.pgpmime.Utils.parseHeaderValue(value);
  if (opt_params) {
    headerValue.params = headerValue.params || {};
    goog.object.extend(headerValue.params, opt_params);
  }
  goog.object.set(this.header_, key, headerValue);
};


/**
 * Sets the content.
 * @param {(string|!e2e.ByteArray)} content The content to set
 */
e2e.openpgp.pgpmime.MimeNode.prototype.setContent = function(content) {
  this.content_ = content;
};


/**
 * Builds an RFC 2822 message from the node and its children.
 * @return {string}
 */
e2e.openpgp.pgpmime.MimeNode.prototype.buildMessage = function() {
  var lines = [];
  var transferEncoding = this.header_[constants.Mime.CONTENT_TRANSFER_ENCODING];
  var contentType = this.header_[constants.Mime.CONTENT_TYPE];

  // Set required header fields
  if (this.filename && !this.header_[constants.Mime.CONTENT_DISPOSITION]) {
    // Set the correct content disposition header for attachments.
    this.setHeader_(constants.Mime.CONTENT_DISPOSITION,
        constants.Mime.ATTACHMENT, {filename: this.filename});
  } else if (this.content_ && goog.typeOf(this.content_) === 'string') {
    // sets the charset to utf-8 if the charset hasn't already been specified
    contentType.params.charset =
        contentType.params.charset || constants.Mime.UTF8;
  }
  if (this.multipart_) {
    // Multipart messages need to specify a boundary
    contentType.params.boundary = this.boundary_;
  }

  // TODO: Wrap header lines at 76 chars
  // adds all the headers after serialization (transforming object to string)
  // to the lines array
  lines = lines.concat(e2e.openpgp.pgpmime.Utils.serializeHeader(this.header_));

  // add a newline after the headers (the empty string cell will eventually be
  // turned into a newline)
  lines.push('');

  if (this.content_) {
    if (transferEncoding.value === constants.Mime.BASE64 ||
        goog.typeOf(this.content_) !== 'string') {
      // TODO: Wrap lines at 76 chars
      lines.push(goog.typeOf(this.content_) === 'string' ?
          goog.crypt.base64.encodeString(goog.asserts.assertString(
          this.content_)) :
          goog.crypt.base64.encodeByteArray(
          /** @type {e2e.ByteArray}*/ (this.content_)));
    } else {
      // TODO: Technically lines MUST be wrapped at 1000 chars max for SMTP.
      lines.push(this.content_);
    }
    if (this.multipart_) {
      // add a trailing newline that will precede the children nodes
      lines.push('');
    }
  }

  if (this.multipart_) {
    goog.array.forEach(this.children_, goog.bind(function(node) {
      lines.push('--' + this.boundary_);
      lines.push(node.buildMessage());
    }, this));
    lines.push('--' + this.boundary_ + '--');
    // newline to finish the message
    lines.push('');
  }

  return lines.join(constants.Mime.CRLF);
};

});  // goog.scope
