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
 * @fileoverview Encodes a message according to the EMSA PKCS1 v1.5 standard.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.pkcs.ASN_PREFIXES');
goog.provide('e2e.pkcs.EMSA_PKCS1_v1_5');

/** @suppress {extraRequire} manually import typedefs due to b/15739810 */
goog.require('e2e.ByteArray');
goog.require('e2e.hash.Algorithm');
goog.require('e2e.pkcs.Error');
goog.require('goog.array');


/**
 * List of prefixes per hash algorithm.
 * @type {!Object.<e2e.hash.Algorithm, !e2e.ByteArray>}
 */
e2e.pkcs.ASN_PREFIXES = {};
e2e.pkcs.ASN_PREFIXES[e2e.hash.Algorithm.MD5] = [
  0x30, 0x20, 0x30, 0x0C, 0x06, 0x08, 0x2A, 0x86, 0x48, 0x86, 0xF7,
  0x0D, 0x02, 0x05, 0x05, 0x00, 0x04, 0x10];
e2e.pkcs.ASN_PREFIXES[e2e.hash.Algorithm.RIPEMD] = [
  0x30, 0x21, 0x30, 0x09, 0x06, 0x05, 0x2B, 0x24, 0x03, 0x02,
  0x01, 0x05, 0x00, 0x04, 0x14];
e2e.pkcs.ASN_PREFIXES[e2e.hash.Algorithm.SHA1] = [
  0x30, 0x21, 0x30, 0x09, 0x06, 0x05, 0x2b, 0x0E, 0x03, 0x02, 0x1A,
  0x05, 0x00, 0x04, 0x14];
e2e.pkcs.ASN_PREFIXES[e2e.hash.Algorithm.SHA224] = [
  0x30, 0x2d, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65,
  0x03, 0x04, 0x02, 0x04, 0x05, 0x00, 0x04, 0x1C];
e2e.pkcs.ASN_PREFIXES[e2e.hash.Algorithm.SHA256] = [
  0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65,
  0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20];
e2e.pkcs.ASN_PREFIXES[e2e.hash.Algorithm.SHA384] = [
  0x30, 0x41, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65,
  0x03, 0x04, 0x02, 0x02, 0x05, 0x00, 0x04, 0x30];
e2e.pkcs.ASN_PREFIXES[e2e.hash.Algorithm.SHA512] = [
  0x30, 0x51, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65,
  0x03, 0x04, 0x02, 0x03, 0x05, 0x00, 0x04, 0x40];


/**
 * Encodes the message as specified in EMSA PKCS1 v1.5.
 * @param {!e2e.hash.Hash} hash An instance of hash to use.
 * @param {!e2e.ByteArray} m The message to encode.
 * @param {number} ml The intended length of the encoded message.
 * @param {boolean=} opt_noLeadingZero Whether to strip the leading 0.
 * @return {!e2e.ByteArray} The encoded message.
 */
e2e.pkcs.EMSA_PKCS1_v1_5 = function(hash, m, ml, opt_noLeadingZero) {
  var h = hash.hash(m);
  var t = [];
  if (!goog.isDef(e2e.pkcs.ASN_PREFIXES[hash.algorithm])) {
    throw new e2e.pkcs.Error('invalid hash for signature');
  }
  goog.array.extend(t, e2e.pkcs.ASN_PREFIXES[hash.algorithm]);
  goog.array.extend(t, h);
  var tlen = t.length;
  if (ml < tlen + 11) {
    throw new e2e.pkcs.Error(
        'intended encoded message length too short');
  }
  var ps = goog.array.repeat(0xFF, ml - tlen - 3 + 1);
  var prefix = opt_noLeadingZero ? [0x01] : [0x00, 0x01];
  var em = prefix.concat(ps).concat([0x00]).concat(t);
  return em;
};
