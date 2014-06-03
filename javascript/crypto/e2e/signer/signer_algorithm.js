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
 * @fileoverview Provides a base class to implement digital signatures on top.
 * @author thaidn@google.com (Thai Duong)
 */


goog.provide('e2e.signer.Algorithm');

/**
 * Algorithms (used to define which algorithm is defined).
 * @enum {string}
 */
e2e.signer.Algorithm = {
  'DSA': 'DSA',
  'ECDSA': 'ECDSA',
  'RSA': 'RSA'
};
