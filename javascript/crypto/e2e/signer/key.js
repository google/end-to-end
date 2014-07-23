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
 * @fileoverview Type definitions for digital signature keys.
 */

/** @suppress {extraProvide} provide the whole namespace for simplicity */
goog.provide('e2e.signer.key');
goog.provide('e2e.signer.key.Dsa');
goog.provide('e2e.signer.key.Ecdsa');
goog.provide('e2e.signer.key.Key');
goog.provide('e2e.signer.key.Rsa');



/**
 * @typedef {{p: e2e.ByteArray, q: e2e.ByteArray,
 *     g: e2e.ByteArray, x: e2e.ByteArray,
 *     y: e2e.ByteArray}}
 */
e2e.signer.key.Dsa;


/**
 * @typedef {{curve: ?e2e.ecc.PrimeCurveOid,
 *     pubKey: e2e.ByteArray,
 *     privKey: e2e.ByteArray}}
 */
e2e.signer.key.Ecdsa;


/**
 * @typedef {{d: e2e.ByteArray, e: e2e.ByteArray,
 *     n: e2e.ByteArray, p: e2e.ByteArray,
 *     q: e2e.ByteArray}}
 */
e2e.signer.key.Rsa;


/**
 * @typedef {e2e.signer.key.Dsa|e2e.signer.key.Ecdsa|
 *     e2e.signer.key.Rsa}
 */
e2e.signer.key.Key;
