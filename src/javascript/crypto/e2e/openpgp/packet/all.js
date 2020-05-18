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
 * @fileoverview Requires all packets to load them into the factory.
 */
/** @suppress {extraProvide} this aggregation needs a namespace */
goog.provide('e2e.openpgp.packet.all');

/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.Compressed');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.EncryptedData');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.EncryptedSessionKey');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.LiteralData');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.Marker');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.OnePassSignature');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.PKEncryptedSessionKey');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.PublicKey');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.PublicSubkey');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.SecretKey');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.SecretSubkey');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.Signature');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.SignatureSub');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.SymmetricKey');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.SymmetricallyEncrypted');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.SymmetricallyEncryptedIntegrity');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.Trust');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.UserAttribute');
/** @suppress {extraRequire} intentional import */
goog.require('e2e.openpgp.packet.UserId');
