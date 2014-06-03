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
 * @fileoverview Provides a base class to implement digital signatures on top.
 * @author thaidn@google.com (Thai Duong)
 */

goog.provide('e2e.signer.Error');
goog.provide('e2e.signer.Signer');

goog.require('e2e.Algorithm');
goog.require('e2e.async.Result');
goog.require('e2e.hash.Hash');
goog.require('e2e.signer.signature.Signature');
goog.require('goog.debug.Error');
goog.require('goog.object');


/**
 * Error class used to represent errors in the digital signature algorithms.
 * @param {*=} opt_msg Optional message to send.
 * @extends {goog.debug.Error}
 * @constructor
 */
e2e.signer.Error = function(opt_msg) {
  goog.base(this, opt_msg);
};
goog.inherits(e2e.signer.Error, goog.debug.Error);


/**
 * Interface for all signers.
 * @interface
 * @extends {e2e.Algorithm}
 */
e2e.signer.Signer = function() {};


/**
 * Applies the signing algorithm to the data.
 * @param {e2e.ByteArray} data The data to sign.
 * @return {!e2e.async.Result.<e2e.signer.signature.Signature>} The
 *     result of signing.
 */
e2e.signer.Signer.prototype.sign;


/**
 * Applies the verification algorithm to the data.
 * @param {e2e.ByteArray} data The data to verify.
 * @param {e2e.signer.signature.Signature} sig The signature to check.
 * @return {!e2e.async.Result.<boolean>} The result of verification.
 */
e2e.signer.Signer.prototype.verify;



/**
 * Returns the hash function used for the signature.
 * @return {e2e.hash.Hash}
 */
e2e.signer.Signer.prototype.getHash;


/**
 * Sets the hash function used for the signature.
 * @param {e2e.hash.Hash} Hash function
 */
e2e.signer.Signer.prototype.setHash;
