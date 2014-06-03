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
 * @fileoverview Requires all packets to load them into the factory.
 */

goog.provide('e2e.openpgp.packet.all');

goog.require('e2e.openpgp.packet.Compressed');
goog.require('e2e.openpgp.packet.EncryptedData');
goog.require('e2e.openpgp.packet.EncryptedSessionKey');
goog.require('e2e.openpgp.packet.LiteralData');
goog.require('e2e.openpgp.packet.Marker');
goog.require('e2e.openpgp.packet.OnePassSignature');
goog.require('e2e.openpgp.packet.PKEncryptedSessionKey');
goog.require('e2e.openpgp.packet.PublicKey');
goog.require('e2e.openpgp.packet.PublicSubkey');
goog.require('e2e.openpgp.packet.SecretKey');
goog.require('e2e.openpgp.packet.SecretSubkey');
goog.require('e2e.openpgp.packet.Signature');
goog.require('e2e.openpgp.packet.SignatureSub');
goog.require('e2e.openpgp.packet.SymmetricKey');
goog.require('e2e.openpgp.packet.SymmetricallyEncrypted');
goog.require('e2e.openpgp.packet.SymmetricallyEncryptedIntegrity');
goog.require('e2e.openpgp.packet.Trust');
goog.require('e2e.openpgp.packet.UserAttribute');
goog.require('e2e.openpgp.packet.UserId');
