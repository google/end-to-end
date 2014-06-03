// Copyright 2012 Google Inc. All Rights Reserved.
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
 * @fileoverview Provides a base class to implement ciphers on top.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.cipher.Algorithm');


/**
 * Algorithms (used to define which algorithm is defined).
 * @enum {string}
 */
e2e.cipher.Algorithm = {
  // Symmetric Ciphers
  'PLAINTEXT': 'PLAINTEXT',
  'IDEA': 'IDEA',
  'TRIPLE_DES': 'TRIPLE_DES',
  'CAST5': 'CAST5',
  'BLOWFISH': 'BLOWFISH',
  'AES128': 'AES128',
  'AES192': 'AES192',
  'AES256': 'AES256',
  'TWOFISH': 'TWOFISH',
  // Asymmetric Ciphers
  'RSA': 'RSA',
  'ELGAMAL': 'ELGAMAL',
  'ECDH': 'ECDH'
};
