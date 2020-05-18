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
 * @fileoverview Defines the types used in the OTR protocol.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.Byte');
goog.provide('e2e.otr.Ctr');
goog.provide('e2e.otr.Int');
goog.provide('e2e.otr.Mac');
goog.provide('e2e.otr.Policy');
goog.provide('e2e.otr.PublicKeyAny');
goog.provide('e2e.otr.Short');


/**
 * OTR protocol type Byte.
 * @typedef {Uint8Array}
 */
e2e.otr.Byte;


/**
 * OTR protocol type Ctr. (8 bytes)
 * @typedef {Uint8Array}
 */
e2e.otr.Ctr;


/**
 * OTR protocol type Int. (4 bytes)
 * @typedef {Uint8Array}
 */
e2e.otr.Int;


/**
 * OTR protocol type Mac. (20 bytes)
 * @typedef {Uint8Array}
 */
e2e.otr.Mac;


/**
 * OTR protocol type Short. (2 bytes)
 * @typedef {Uint8Array}
 */
e2e.otr.Short;


/**
 * OTR policy configuration.
 * TODO: Clean up the typedef when closure-compiler #126 is resolved.
 * @typedef {{ALLOW_V1: boolean, ALLOW_V2: boolean, ALLOW_V3: boolean,
 *     REQUIRE_ENCRYPTION: boolean, SEND_WHITESPACE_TAG: boolean,
 *     WHITESPACE_START_AKE: boolean, ERROR_START_AKE: boolean}}
 */
e2e.otr.Policy;


/**
 * Represents any public key type.
 * @typedef {e2e.signer.key.DsaPublicKey}
 */
e2e.otr.PublicKeyAny;
