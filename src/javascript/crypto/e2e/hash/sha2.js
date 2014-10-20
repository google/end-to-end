/**
 * @license
 * Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Wraps the original Sha224 and Sha256 implementations.
 * @author adhintz@google.com (Drew Hintz)
 */

goog.provide('e2e.hash.Sha224');
goog.provide('e2e.hash.Sha256');
goog.provide('e2e.hash.Sha384');
goog.provide('e2e.hash.Sha512');

goog.require('e2e.hash.Algorithm');
goog.require('e2e.hash.Hash');
goog.require('e2e.hash.factory');
goog.require('goog.crypt.Sha224');
goog.require('goog.crypt.Sha256');
goog.require('goog.crypt.Sha384');
goog.require('goog.crypt.Sha512');



/**
 * Wrapper around the goog.crypt.Sha224 implementation.
 * @extends {e2e.hash.Hash}
 * @constructor
 * @struct
 */
e2e.hash.Sha224 = function() {
  e2e.hash.Sha224.base(this, 'constructor');
  this.inst_ = new goog.crypt.Sha224();
  this.blockSize = this.inst_.blockSize;
};
goog.inherits(e2e.hash.Sha224, e2e.hash.Hash);


/** @inheritDoc */
e2e.hash.Sha224.prototype.algorithm = e2e.hash.Algorithm.SHA224;

e2e.hash.factory.add(e2e.hash.Sha224);



/**
 * Wrapper around the goog.crypt.Sha256 implementation.
 * @extends {e2e.hash.Hash}
 * @constructor
 * @struct
 */
e2e.hash.Sha256 = function() {
  e2e.hash.Sha256.base(this, 'constructor');
  this.inst_ = new goog.crypt.Sha256();
  this.blockSize = this.inst_.blockSize;
};
goog.inherits(e2e.hash.Sha256, e2e.hash.Hash);


/** @inheritDoc */
e2e.hash.Sha256.prototype.algorithm = e2e.hash.Algorithm.SHA256;

e2e.hash.factory.add(e2e.hash.Sha256);



/**
 * Wrapper around the goog.crypt.Sha384 implementation.
 * @extends {e2e.hash.Hash}
 * @constructor
 * @struct
 */
e2e.hash.Sha384 = function() {
  e2e.hash.Sha384.base(this, 'constructor');
  this.inst_ = new goog.crypt.Sha384();
  this.blockSize = this.inst_.blockSize;
};
goog.inherits(e2e.hash.Sha384, e2e.hash.Hash);


/** @inheritDoc */
e2e.hash.Sha384.prototype.algorithm = e2e.hash.Algorithm.SHA384;

e2e.hash.factory.add(e2e.hash.Sha384);



/**
 * Wrapper around the goog.crypt.Sha512 implementation.
 * @extends {e2e.hash.Hash}
 * @constructor
 * @struct
 */
e2e.hash.Sha512 = function() {
  e2e.hash.Sha512.base(this, 'constructor');
  this.inst_ = new goog.crypt.Sha512();
  this.blockSize = this.inst_.blockSize;
};
goog.inherits(e2e.hash.Sha512, e2e.hash.Hash);


/** @inheritDoc */
e2e.hash.Sha512.prototype.algorithm = e2e.hash.Algorithm.SHA512;

e2e.hash.factory.add(e2e.hash.Sha512);
