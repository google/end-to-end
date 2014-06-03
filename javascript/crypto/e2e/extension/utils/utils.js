// Copyright 2013 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * @fileoverview Provides common utility methods to the extension.
 */

goog.provide('e2e.ext.utils');

goog.require('goog.array');
goog.require('goog.string');
goog.require('goog.string.format');

goog.scope(function() {
var utils = e2e.ext.utils;


/**
 * Writes provided content to a new file with the specified filename.
 * @param {string} filename The filename to use for the new file.
 * @param {string} content The content to write to the new file.
 * @param {!function(string)} callback The callback to invoke with the URL of
 *     the created file.
 */
utils.WriteToFile = function(filename, content, callback) {
  utils.GetFileEntry_(
      filename, {create: true, exclusive: true}, function(fileEntry) {
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.onerror = utils.errorHandler;
      fileWriter.onwriteend = function() {
        callback(fileEntry.toURL());
      };

      var blob = new Blob(
          [content], {type: 'application/pgp-keys; format=text;'});
      fileWriter.write(blob);
    }, utils.errorHandler);
  });
};


/**
 * Reads the contents of the provided file returns it via the provided callback.
 * Automatically handles both binary OpenPGP packets and text files.
 * @param {string|File} filename The filename of the file or the actual file to
 *     read.
 * @param {!function(string)} callback The callback to invoke with the file's
 *     contents.
 */
utils.ReadFile = function(filename, callback) {
  utils.ReadFile_(false, filename, function(contents) {
    // The 0x80 bit is always set for the Packet Tag for OpenPGP packets.
    if (contents.charCodeAt(0) >= 0x80) {
      callback(contents);
    } else {
      utils.ReadFile_(true, filename, callback);
    }
  });
};


/**
 * Reads the contents of the provided file as text and returns them via the
 * provided callback.
 * @param {boolean} asText If true, then read as text.
 * @param {string|File} filename The filename of the file or the actual file to
 *     read.
 * @param {!function(string)} callback The callback to invoke with the file's
 *     contents.
 * @private
 */
utils.ReadFile_ = function(asText, filename, callback) {
  var read = function(file) {
    var reader = new FileReader();
    reader.onload = function() {
      if (reader.readyState != reader.LOADING) {
        reader.onload = null;
        callback(/** @type {string} */ (reader.result));
      }
    };
    if (asText) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  if (filename instanceof File) {
    read(filename);
  } else {
    utils.GetFileEntry_(
        /** @type {string} */ (filename), {}, function(fileEntry) {
          fileEntry.file(function(file) {
            read(file);
          });
        });
  }
};


/**
 * Returns a handle on the requested file.
 * @param {string} filename The name of the file to open.
 * @param {Object} options Any specific options that are needed when opening the
 *     file. Example: {create: true}.
 * @param {!function(FileEntry)} callback The callback to invoke with the handle
 *     to the file.
 * @private
 */
utils.GetFileEntry_ = function(filename, options, callback) {
  window.webkitRequestFileSystem(
      window.TEMPORARY, 1024 * 1024, function(filesystem) {
        filesystem.root.getFile(
            filename, options, callback, utils.errorHandler);
      }, utils.errorHandler);
};


/**
 * Logs errors to console.
 * @param {*} error The error to log.
 */
utils.errorHandler = function(error) {
  window.console.error(error);
};


/**
 * Constructor for a i18n friendly error.
 * @param {string} defaultMsg The default error message.
 * @param {string} msgId The i18n message id.
 * @constructor
 * @extends {Error}
 */
utils.Error = function(defaultMsg, msgId) {
  goog.base(this, defaultMsg);
  this.messageId = msgId;
};
goog.inherits(utils.Error, Error);

}); // goog.scope

