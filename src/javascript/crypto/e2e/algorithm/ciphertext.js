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
 * @fileoverview Provides the type definitions of ciphertext.
 */

/** @suppress {extraProvide} provide the whole namespace for simplicity */
goog.provide('e2e.cipher.ciphertext');
goog.provide('e2e.cipher.ciphertext.Asymmetric');
goog.provide('e2e.cipher.ciphertext.AsymmetricAsync');
goog.provide('e2e.cipher.ciphertext.CipherText');
goog.provide('e2e.cipher.ciphertext.Ecdh');
goog.provide('e2e.cipher.ciphertext.Elgamal');
goog.provide('e2e.cipher.ciphertext.Rsa');
goog.provide('e2e.cipher.ciphertext.Symmetric');


/**
 * @typedef {?{c: !e2e.ByteArray}}
 */
e2e.cipher.ciphertext.Rsa;


/**
 * @typedef {?{u: !e2e.ByteArray, v:!e2e.ByteArray}}
 */
e2e.cipher.ciphertext.Elgamal;


/**
 * @typedef {?{u: !e2e.ByteArray, v:!e2e.ByteArray}}
 */
e2e.cipher.ciphertext.Ecdh;


/**
 * @typedef {e2e.ByteArray}
 */
e2e.cipher.ciphertext.Symmetric;


/**
 * @typedef {e2e.cipher.ciphertext.Ecdh|
 *     e2e.cipher.ciphertext.Elgamal|
 *     e2e.cipher.ciphertext.Rsa|null}
 */
e2e.cipher.ciphertext.Asymmetric;


/**
 * @typedef {e2e.async.Result.<!e2e.cipher.ciphertext.Ecdh>|
 *     e2e.async.Result.<!e2e.cipher.ciphertext.Elgamal>|
 *     e2e.async.Result.<!e2e.cipher.ciphertext.Rsa>}
 */
e2e.cipher.ciphertext.AsymmetricAsync;


/**
 * @typedef {e2e.cipher.ciphertext.Symmetric|
 *     e2e.cipher.ciphertext.Asymmetric|
 *     e2e.cipher.ciphertext.AsymmetricAsync}
 */
e2e.cipher.ciphertext.CipherText;
