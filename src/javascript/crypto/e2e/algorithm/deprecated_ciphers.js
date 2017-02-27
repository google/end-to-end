/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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
 * @fileoverview Requires deprecated ciphers () to load them into the factory.
 */
/** @suppress {extraProvide} this aggregation needs a namespace */
goog.provide('e2e.cipher.deprecated');

/** @suppress {extraRequire} intentional import */
goog.require('e2e.cipher.Blowfish');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.cipher.Cast5');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.cipher.Des');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.cipher.TripleDes');
