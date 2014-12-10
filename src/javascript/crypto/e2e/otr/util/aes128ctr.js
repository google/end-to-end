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
 * @fileoverview Helper for AES128-CTR operations.
 *
 * @author rcc@google.com (Ryan Chan)
 */

goog.provide('e2e.otr.util.aes128ctr');

goog.require('e2e.cipher.Aes');
goog.require('e2e.cipher.Algorithm');
goog.require('e2e.ciphermode.Ctr');
goog.require('goog.array');


/**
 * Processes data with AES128-CTR using key and optional initial counter.
 * @private
 * @param {boolean} encrypt Encrypts the data if true; else decrypts it.
 * @param {(!Uint8Array|!e2e.ByteArray)} key The key to use for en/decryption.
 * @param {(!Uint8Array|!e2e.ByteArray)} data The data to encrypt.
 * @param {(!Uint8Array|!e2e.ByteArray)=} opt_ctr Initial counter (default = 0).
 * @return {!Uint8Array} The encrypted/decrypted data.
 */
e2e.otr.util.aes128ctr.exec_ = function(encrypt, key, data, opt_ctr) {
  if (key instanceof Uint8Array) {
    key = Array.apply([], key);
  }

  if (data instanceof Uint8Array) {
    data = Array.apply([], data);
  }

  if (opt_ctr instanceof Uint8Array) {
    opt_ctr = Array.apply([], opt_ctr);
  }

  var aes128 = new e2e.cipher.Aes(e2e.cipher.Algorithm.AES128, {key: key});
  var aes128ctr = new e2e.ciphermode.Ctr(aes128);
  var encrypted = (encrypt ? aes128ctr.encryptSync : aes128ctr.decryptSync)
      .call(aes128ctr, data, opt_ctr || goog.array.repeat(0, aes128.blockSize));
  return new Uint8Array(encrypted);
};


/**
 * AES128-CTR encrypts data using key and optional initial counter.
 * @param {(!Uint8Array|!e2e.ByteArray)} key The key to use for encryption.
 * @param {(!Uint8Array|!e2e.ByteArray)} data The data to encrypt.
 * @param {(!Uint8Array|!e2e.ByteArray)=} opt_ctr Initial counter (default = 0).
 * @return {!Uint8Array} The encrypted data.
 */
e2e.otr.util.aes128ctr.encrypt = goog.partial(e2e.otr.util.aes128ctr.exec_, 1);


/**
 * AES128-CTR decrypts data using key and optional initial counter.
 * @param {(!Uint8Array|!e2e.ByteArray)} key The key to use for decryption.
 * @param {(!Uint8Array|!e2e.ByteArray)} data The data to decrypt.
 * @param {(!Uint8Array|!e2e.ByteArray)=} opt_ctr Initial counter (default = 0).
 * @return {!Uint8Array} The decrypted data.
 */
e2e.otr.util.aes128ctr.decrypt = goog.partial(e2e.otr.util.aes128ctr.exec_, 0);
