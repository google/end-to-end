/**
 * @license
 * Copyright 2012 Google Inc. All rights reserved.
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
 * @fileoverview Provides a base class to implement hashes on top.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.hash.Algorithm');
goog.provide('e2e.hash.Error');
goog.provide('e2e.hash.Hash');

goog.require('goog.crypt.Hash');
goog.require('goog.debug.Error');



/**
 * Error class used to represent errors in the hash algorithms.
 * @param {*=} opt_msg Optional message to send.
 * @extends {goog.debug.Error}
 * @constructor
 */
e2e.hash.Error = function(opt_msg) {
  e2e.hash.Error.base(this, 'constructor', opt_msg);
};
goog.inherits(e2e.hash.Error, goog.debug.Error);


/**
 * List of Hash algorithms that can be implemented.
 * @enum {string}
 */
e2e.hash.Algorithm = {
  'MD5': 'MD5',
  'SHA1': 'SHA1',
  'RIPEMD': 'RIPEMD160',
  'SHA256': 'SHA256',
  'SHA384': 'SHA384',
  'SHA512': 'SHA512',
  'SHA224': 'SHA224'
};



/**
 * Wrapper around goog.crypt.Hash with some extra properties.
 * @extends {goog.crypt.Hash}
 * @constructor
 * @struct
 */
e2e.hash.Hash = function() {
  e2e.hash.Hash.base(this, 'constructor');
};
goog.inherits(e2e.hash.Hash, goog.crypt.Hash);


/**
 * The implemented algorithm.
 * @type {e2e.hash.Algorithm}
 */
e2e.hash.Hash.prototype.algorithm;


/**
 * The internal instance of the hash.
 * @type {goog.crypt.Hash}
 * @protected
 */
e2e.hash.Hash.prototype.inst_;


/** @inheritDoc */
e2e.hash.Hash.prototype.blockSize;


/** @inheritDoc */
e2e.hash.Hash.prototype.reset = function() {
  this.inst_.reset();
};


/** @inheritDoc */
e2e.hash.Hash.prototype.digest = function() {
  return this.inst_.digest();
};


/** @inheritDoc */
e2e.hash.Hash.prototype.update = function(msg, opt_bytes) {
  this.inst_.update(msg, opt_bytes);
};


/**
 * Performs reset, update and digest in one operation.
 * @param {Uint8Array|Array.<number>|string} msg The message to hash.
 * @return {!Array.<number>} The checksum.
 */
e2e.hash.Hash.prototype.hash = function(msg) {
  this.reset();
  this.update(msg);
  return this.digest();
};
