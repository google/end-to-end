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
 * @fileoverview Provides the type definitions of signatures.
 */

goog.provide('e2e.signer.signature.Signature');
goog.provide('e2e.signer.signature.SignatureAsync');


/**
 * @typedef {?{s: !e2e.ByteArray, r:(!e2e.ByteArray|undefined),
 *     hashValue: (!e2e.ByteArray|undefined)}}
 */
e2e.signer.signature.Signature;


/**
 * @typedef {e2e.async.Result.<!e2e.signer.signature.Signature>}
 */
e2e.signer.signature.SignatureAsync;
