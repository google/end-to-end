/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
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
 *
 * @fileoverview Surrogate Secret Key Block and related classes definition.
 *
 */


goog.provide('e2e.openpgp.packet.SurrogateSecretKey');

goog.require('e2e.openpgp.KeyProviderCipher');
goog.require('e2e.openpgp.packet.SecretKeyInterface');
goog.require('goog.asserts');



/**
 * Surrogate Secret Key Packet that has no key material, and can be used
 * in place of {@link e2e.openpgp.packet.SecretKey} for the sole purpose of
 * signing/decryption using the provided callbacks.
 * @param {!e2e.openpgp.KeyId} keyId Key ID that this key should report.
 * @param {!e2e.cipher.Algorithm|!e2e.signer.Algorithm} algorithm
 *     Signing/decryption algorithm implemented.
 * @param {function(!e2e.signer.Algorithm,!e2e.hash.Algorithm,!e2e.ByteArray):
 *     !goog.Thenable<!e2e.signer.signature.Signature>=} opt_signCallback
 *     Signing callback.
 * @param {function(!e2e.cipher.Algorithm,!e2e.cipher.ciphertext.CipherText):
 *     !goog.Thenable<!e2e.ByteArray>=} opt_decryptCallback Decryption callback.
 * @param {!e2e.hash.Algorithm=} opt_hashAlgorithm Hash algorithm implemented
 *     for the signature.
 * @implements {e2e.openpgp.packet.SecretKeyInterface}
 * @constructor
 */
e2e.openpgp.packet.SurrogateSecretKey = function(keyId, algorithm,
    opt_signCallback, opt_decryptCallback, opt_hashAlgorithm) {
  this.keyId = keyId;
  this.cipher = new e2e.openpgp.KeyProviderCipher(
      algorithm,
      opt_signCallback,
      opt_decryptCallback,
      opt_hashAlgorithm);
};


/**
 * Returns a surrogate secret key for signing purposes with a cipher using
 * the sign callback function passed in the constructor.
 * @param {!e2e.openpgp.Key} key Secret key handle that this key should
 *     represent.
 * @param {function(!e2e.openpgp.Key,!e2e.openpgp.KeyId,!e2e.signer.Algorithm,
 *     !e2e.hash.Algorithm,!e2e.ByteArray):
 *     !goog.Thenable<!e2e.signer.signature.Signature>} signCallback
 *     The signing callback.
 * @return {e2e.openpgp.packet.SurrogateSecretKey}
 */
e2e.openpgp.packet.SurrogateSecretKey.constructSigningKey = function(key,
    signCallback) {
  if (!goog.isFunction(signCallback) ||
      !goog.isDefAndNotNull(key.signingKeyId)) {
    return null;
  }
  goog.asserts.assertString(key.signAlgorithm);
  goog.asserts.assertString(key.signHashAlgorithm);
  return new e2e.openpgp.packet.SurrogateSecretKey(
      key.signingKeyId,
      key.signAlgorithm,
      goog.partial(signCallback, key, key.signingKeyId),
      undefined,
      key.signHashAlgorithm
  );
};
