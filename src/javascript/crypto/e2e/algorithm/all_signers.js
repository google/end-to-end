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
 * @fileoverview Requires all signers to load them into the factory.
 */

/** @suppress {extraProvide} this aggregation needs a namespace */
goog.provide('e2e.signer.all');

/** @suppress {extraRequire} intentional import */
goog.require('e2e.signer.Dsa');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.signer.Ecdsa');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.signer.RsaSign');
