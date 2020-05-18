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
 * @fileoverview OTR related constants.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.constants');
goog.provide('e2e.otr.constants.MessageType');
goog.provide('e2e.otr.constants.PubkeyType');
goog.provide('e2e.otr.constants.TlvType');
goog.provide('e2e.otr.constants.Version');


/**
 * OTR version to bit array mapping.
 * @enum {number}
 */
e2e.otr.constants.Version = {
  V1: 1,
  V2: 1 << 1,
  V3: 1 << 2
};


/**
 * OTR message types.
 * @enum {e2e.otr.Byte}
 */
e2e.otr.constants.MessageType = {
  DH_COMMIT: new Uint8Array([0x02]),
  DATA: new Uint8Array([0x03]),
  DH_KEY: new Uint8Array([0x0a]),
  REVEAL_SIGNATURE: new Uint8Array([0x11]),
  SIGNATURE: new Uint8Array([0x12])
};


/**
 * OTR TLV types.
 * @enum {e2e.otr.Short}
 */
e2e.otr.constants.TlvType = {
  PADDING: new Uint8Array([0x00, 0x00]),
  DISCONNECTED: new Uint8Array([0x00, 0x01]),
  SMP_MESSAGE_1: new Uint8Array([0x00, 0x02]),
  SMP_MESSAGE_2: new Uint8Array([0x00, 0x03]),
  SMP_MESSAGE_3: new Uint8Array([0x00, 0x04]),
  SMP_MESSAGE_4: new Uint8Array([0x00, 0x05]),
  SMP_MESSAGE_ABORT: new Uint8Array([0x00, 0x06]),
  SMP_MESSAGE_1Q: new Uint8Array([0x00, 0x07]),
  EXTRA_SYMMETRIC_KEY: new Uint8Array([0x00, 0x08])
};


/**
 * OTR pubkey types.
 * @enum {e2e.otr.Short}
 */
e2e.otr.constants.PubkeyType = {
  DSA: new Uint8Array([0x00, 0x00])
};


/**
 * RFC 3526 1536-bit modulus for DH group computations.
 * @type {!Uint8Array}
 */
e2e.otr.constants.DH_MODULUS = new Uint8Array([
  0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC9, 0x0F, 0xDA, 0xA2, 0x21,
  0x68, 0xC2, 0x34, 0xC4, 0xC6, 0x62, 0x8B, 0x80, 0xDC, 0x1C, 0xD1, 0x29, 0x02,
  0x4E, 0x08, 0x8A, 0x67, 0xCC, 0x74, 0x02, 0x0B, 0xBE, 0xA6, 0x3B, 0x13, 0x9B,
  0x22, 0x51, 0x4A, 0x08, 0x79, 0x8E, 0x34, 0x04, 0xDD, 0xEF, 0x95, 0x19, 0xB3,
  0xCD, 0x3A, 0x43, 0x1B, 0x30, 0x2B, 0x0A, 0x6D, 0xF2, 0x5F, 0x14, 0x37, 0x4F,
  0xE1, 0x35, 0x6D, 0x6D, 0x51, 0xC2, 0x45, 0xE4, 0x85, 0xB5, 0x76, 0x62, 0x5E,
  0x7E, 0xC6, 0xF4, 0x4C, 0x42, 0xE9, 0xA6, 0x37, 0xED, 0x6B, 0x0B, 0xFF, 0x5C,
  0xB6, 0xF4, 0x06, 0xB7, 0xED, 0xEE, 0x38, 0x6B, 0xFB, 0x5A, 0x89, 0x9F, 0xA5,
  0xAE, 0x9F, 0x24, 0x11, 0x7C, 0x4B, 0x1F, 0xE6, 0x49, 0x28, 0x66, 0x51, 0xEC,
  0xE4, 0x5B, 0x3D, 0xC2, 0x00, 0x7C, 0xB8, 0xA1, 0x63, 0xBF, 0x05, 0x98, 0xDA,
  0x48, 0x36, 0x1C, 0x55, 0xD3, 0x9A, 0x69, 0x16, 0x3F, 0xA8, 0xFD, 0x24, 0xCF,
  0x5F, 0x83, 0x65, 0x5D, 0x23, 0xDC, 0xA3, 0xAD, 0x96, 0x1C, 0x62, 0xF3, 0x56,
  0x20, 0x85, 0x52, 0xBB, 0x9E, 0xD5, 0x29, 0x07, 0x70, 0x96, 0x96, 0x6D, 0x67,
  0x0C, 0x35, 0x4E, 0x4A, 0xBC, 0x98, 0x04, 0xF1, 0x74, 0x6C, 0x08, 0xCA, 0x23,
  0x73, 0x27, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);


/**
 * RFC 3526 generator for 1536-bit DH group computations.
 * @type {number}
 */
e2e.otr.constants.DH_GENERATOR = 2;


/**
 * Message states. See spec: "The protocol state machine."
 * @enum {number}
 */
e2e.otr.constants.MSGSTATE = {
  PLAINTEXT: 0,
  ENCRYPTED: 1,
  FINISHED: 2
};


/**
 * Authentication states. See spec: "The protocol state machine."
 * @enum {number}
 */
e2e.otr.constants.AUTHSTATE = {
  NONE: 0,
  AWAITING_DHKEY: 1,
  AWAITING_REVEALSIG: 2,
  AWAITING_SIG: 3,
  V1_SETUP: 4
};


/**
 * Default session policy.
 * @const
 * @type {e2e.otr.Policy}
 */
e2e.otr.constants.DEFAULT_POLICY = {
  ALLOW_V1: false,
  ALLOW_V2: false,
  ALLOW_V3: true,
  REQUIRE_ENCRYPTION: false,
  SEND_WHITESPACE_TAG: false,
  WHITESPACE_START_AKE: false,
  ERROR_START_AKE: false
};


/**
 * Message prefixes.
 * @enum {string}
 */
e2e.otr.constants.MESSAGE_PREFIX = {
  ENCODED: '?OTR:',
  ERROR: '?OTR Error:',
  QUERY: '?OTR',
  WHITESPACE: ' \t  \t\t\t\t \t \t \t  ',
  WHITESPACE_V1: ' \t \t  \t ',
  WHITESPACE_V2: '  \t\t  \t ',
  WHITESPACE_V3: '  \t\t  \t\t'
};


/**
 * Encoded message suffix.
 * @const
 */
e2e.otr.constants.MESSAGE_SUFFIX_ENCODED = '.';
