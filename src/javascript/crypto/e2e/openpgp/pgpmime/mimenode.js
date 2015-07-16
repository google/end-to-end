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
 * @fileoverview Main module for the safemail app.
 * @author yzhu@yahoo-inc.com (Yan Zhu)
 */

goog.provide('e2e.openpgp.pgpmime.MimeNode');

goog.require('e2e.openpgp.error.UnsupportedError');
goog.require('e2e.openpgp.pgpmime.Constants');
goog.require('e2e.openpgp.pgpmime.Text');
goog.require('e2e.openpgp.pgpmime.Utils');
/** @suppress {extraRequire} import typedef */
goog.require('e2e.openpgp.pgpmime.types.NodeContent');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.crypt.base64');
goog.require('goog.object');
goog.require('goog.string');

goog.scope(function() {
var pgpmime = e2e.openpgp.pgpmime;
var constants = pgpmime.Constants;


/**
 * The maximum amount of recursions permitted for setBoundary_
 * @const
 * @private
 */
var MAX_RECURSION_DEPTH_ = 30;



/**
 * Constructor for a MIME tree node.
 * @param {!e2e.openpgp.pgpmime.types.NodeContent} options Options to initialize
 *     for the node.
 * @param {e2e.openpgp.pgpmime.MimeNode=} opt_parent The parent node.
 * @constructor
 */
e2e.openpgp.pgpmime.MimeNode = function(options, opt_parent) {
  this.parent = opt_parent || this;
  this.multipart_ = options.multipart;
  /** @private {!Array<!e2e.openpgp.pgpmime.MimeNode>} */
  this.children_ = [];
  /** @private {e2e.openpgp.pgpmime.types.Header} */
  this.header_ =  /** @private {e2e.openpgp.pgpmime.types.Header} */ ({});
  /** @private */
  this.content_ = null;
  /** @private {string} */
  this.boundary_ = '';

  // Set headers.
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
};


/**
 * Adds a child to a MIME node.
 * @param {!e2e.openpgp.pgpmime.types.NodeContent} options Options to initialize
 *     for the node.
 * @return {e2e.openpgp.pgpmime.MimeNode}
 */
e2e.openpgp.pgpmime.MimeNode.prototype.addChild = function(options) {
  var node = new e2e.openpgp.pgpmime.MimeNode(options, this);
  this.children_.push(node);
  return node;
};


/**
 * Sets a MIME header.
 * @param {string} key Name of the header.
 * @param {string} value Value of the header, possibly including parameters.
 * @param {Object.<string, string>=} opt_params Optional dict of additional
 *     parameters
 * @private
 */
e2e.openpgp.pgpmime.MimeNode.prototype.setHeader_ = function(key, value,
    opt_params) {
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
 * Checks if the proposed boundary is contained within the message.
 * @param {string} boundary The proposed boundary.
 * @return {boolean} Returns true if the proposed boundary does not appear
 *     within the message. Otherwise returns false.
 * @private
 */
e2e.openpgp.pgpmime.MimeNode.prototype.isBoundaryValid_ = function(boundary) {
  // Assign a temporary boundary that will be used in buildMessage().
  this.boundary_ = 'temporary_boundary';
  var tempMessage = this.mimeToString_();
  return !goog.string.contains(tempMessage, boundary);
};


/**
 * Generates a string that can be used as a MIME message boundary for a node.
 * @return {string}
 * @private
 */
e2e.openpgp.pgpmime.MimeNode.prototype.generateBoundary_ = function() {
  return '---' + goog.string.getRandomString() +
      Math.floor(Date.now() / 1000).toString();
};


/**
 * Sets the MIME message boundary for a node.
 * Until it succeeds, this function recursively reattempts to generate a unique
 * boundary for the message (i.e., it attempts to generate a string that doesn't
 * appear within the original message).
 * @param {number} bound A bound on the amount of permitted recursions.
 * @private
 */
e2e.openpgp.pgpmime.MimeNode.prototype.setBoundary_ = function(bound) {
  var boundary = this.generateBoundary_();
  if (this.isBoundaryValid_(boundary)) {
    // String was unique, save it as the official boundary for this message.
    this.boundary_ = boundary;
  } else {
    // String was not unique.
    if (bound > 0) {
      // Recurse and try again.
      this.setBoundary_(bound - 1);
    } else {
      // We've reached the limit on the amount of permitted recursions.
      // Realistically, bugs aside, this branch shouldn't be reached.
      throw new e2e.openpgp.error.UnsupportedError('Maximum recursion limit' +
          'of ' + MAX_RECURSION_DEPTH_ +
          'reached in e2e.openpgp.pgpmime.MimeNode.setBoundary_');
    }
  }
};


/**
 * Builds an RFC 2822 message from the node and its children.
 * @return {string}
 * @private
 */
e2e.openpgp.pgpmime.MimeNode.prototype.mimeToString_ = function() {
  var lines = [];
  var transferEncoding = this.header_[constants.Mime.CONTENT_TRANSFER_ENCODING];
  var contentType = this.header_[constants.Mime.CONTENT_TYPE];
  var contentIsString = goog.typeOf(this.content_) === 'string';

  if (this.header_[constants.Mime.CONTENT_TYPE].value ===
      constants.Mime.PLAINTEXT && this.content_ && contentIsString) {
    // Sets the charset to utf-8 if the charset hasn't already been specified.
    contentType.params.charset =
        contentType.params.charset || constants.Mime.UTF8;
  }
  if (this.multipart_) {
    // Multipart messages need to specify a boundary.
    contentType.params.boundary = this.boundary_;
  }

  // Adds all the headers after serialization (transforming object to string)
  // to the lines array
  lines = lines.concat(e2e.openpgp.pgpmime.Utils.serializeHeader(this.header_));

  // Add a newline after the headers (the empty string cell will eventually be
  // turned into a newline).
  lines.push('');

  if (this.content_) {
    if (transferEncoding.value === constants.Mime.BASE64 || !contentIsString) {
      // Lines are wrapped at 64 chars, per the PEM protocol. Newline characters
      // will be stripped out of any encrypted content during decryption.
      if (contentIsString) {
        lines.push(e2e.openpgp.pgpmime.Text.prettyTextWrap(
            goog.crypt.base64.encodeString(goog.asserts.assertString(
            this.content_)), constants.MimeNum.LINE_WRAP, constants.Mime.CRLF));
      } else {
        lines.push(e2e.openpgp.pgpmime.Text.prettyTextWrap(
            goog.crypt.base64.encodeByteArray(/** @type {e2e.ByteArray}*/
            (this.content_)), constants.MimeNum.LINE_WRAP,
            constants.Mime.CRLF));
      }
    } else {
      lines.push(e2e.openpgp.pgpmime.Text.prettyTextWrap(
          goog.asserts.assertString(this.content_),
          constants.MimeNum.LINE_WRAP, constants.Mime.CRLF));
    }
    if (this.multipart_) {
      // Add a trailing newline that will precede the children nodes.
      lines.push('');
    }
  }

  if (this.multipart_) {
    goog.array.forEach(this.children_, goog.bind(function(node) {
      lines.push('--' + this.boundary_);
      lines.push(node.buildMessage());
    }, this));
    lines.push('--' + this.boundary_ + '--');
    // Newline to finish the message.
    lines.push('');
  }

  return lines.join(constants.Mime.CRLF);
};


/**
 * Assigns a unique boundary to a MIME node and then builds an RFC 2822 message
 * from the node and its children.
 * @return {string}
 */
e2e.openpgp.pgpmime.MimeNode.prototype.buildMessage = function() {
  // Set a unique boundary for the MIME message.
  this.setBoundary_(MAX_RECURSION_DEPTH_);
  // Return the string representation of the MIME message.
  return this.mimeToString_();
};

});  // goog.scope
