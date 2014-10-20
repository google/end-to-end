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
 * @fileoverview Type definitions for cipher keys.
 */

/** @suppress {extraProvide} provide the whole namespace for simplicity */
goog.provide('e2e.algorithm.AsymmetricKey');
goog.provide('e2e.algorithm.KeyLocations');
goog.provide('e2e.algorithm.WebCryptoAID');
goog.provide('e2e.algorithm.WebCryptoKey');
goog.provide('e2e.algorithm.WebCryptoKeyPair');
/** @suppress {extraProvide} provide the whole namespace for simplicity */
goog.provide('e2e.cipher.key');
goog.provide('e2e.cipher.key.Ecdh');
goog.provide('e2e.cipher.key.ElGamal');
goog.provide('e2e.cipher.key.Key');
goog.provide('e2e.cipher.key.Rsa');
goog.provide('e2e.cipher.key.SymmetricKey');
/** @suppress {extraProvide} provide the whole namespace for simplicity */
goog.provide('e2e.signer.key');
goog.provide('e2e.signer.key.Dsa');
goog.provide('e2e.signer.key.DsaPrivateKey');
goog.provide('e2e.signer.key.DsaPublicKey');
goog.provide('e2e.signer.key.Ecdsa');
goog.provide('e2e.signer.key.Key');
goog.provide('e2e.signer.key.Rsa');


/**
 * Enum of various possible locations for keys. Each key is in exactly one of
 * these.
 * This currently means that each key needs a loc field, which is hackish.
 * This file would be somewhat more maintainable if we added the KeyLocations
 * field to AsymmetricKey, but then that type and all references in it would
 * have another layer of indirection, which would make the rest of the code
 * more complicated.
 * TODO(user): Figure out a better way to handle this issue.
 * @enum {string}
 */
e2e.algorithm.KeyLocations = {
  JAVASCRIPT: 'JAVASCRIPT',
  WEB_CRYPTO: 'WEB_CRYPTO',
  HARDWARE: 'HARDWARE'
};


/**
 * @typedef {(e2e.signer.key.DsaPublicKey|e2e.signer.key.DsaPrivateKey)}
 */
e2e.signer.key.Dsa;


/**
 * @typedef {?{p: !e2e.ByteArray, q: !e2e.ByteArray,
 *     g: !e2e.ByteArray, x: (!e2e.ByteArray|undefined),
 *     y: !e2e.ByteArray, loc: (undefined|!e2e.algorithm.KeyLocations)}}
 */
e2e.signer.key.DsaPublicKey;


/**
 * @typedef {?{p: !e2e.ByteArray, q: !e2e.ByteArray,
 *     g: !e2e.ByteArray, x: !e2e.ByteArray, y: (!e2e.ByteArray|undefined),
 *     loc: (undefined|!e2e.algorithm.KeyLocations)}}
 */
e2e.signer.key.DsaPrivateKey;


/**
 * @typedef {?{curve: ?e2e.ecc.PrimeCurveOid,
 *     pubKey: !e2e.ByteArray,
 *     privKey: ?e2e.ByteArray,
 *     loc: (undefined|!e2e.algorithm.KeyLocations)}}
 */
e2e.signer.key.Ecdsa;


/**
 * @typedef {?{d: (e2e.ByteArray|undefined), e: !e2e.ByteArray,
 *     n: !e2e.ByteArray, p: (e2e.ByteArray|undefined),
 *     q: (e2e.ByteArray|undefined),
 *     loc: (undefined|!e2e.algorithm.KeyLocations)}}
 */
e2e.signer.key.Rsa;


/**
 * @typedef {e2e.signer.key.Dsa|e2e.signer.key.DsaPublicKey|
 *     e2e.signer.key.Ecdsa|e2e.signer.key.Rsa|null}
 */
e2e.signer.key.Key;


/**
 * @typedef {?{d: (e2e.ByteArray|undefined), e: !e2e.ByteArray,
 *     n: !e2e.ByteArray, p: (e2e.ByteArray|undefined),
 *     q: (e2e.ByteArray|undefined),
 *     loc: (undefined|!e2e.algorithm.KeyLocations)}}
 */
e2e.cipher.key.Rsa;


/**
 * @typedef {?{curve: ?e2e.ecc.PrimeCurveOid,
 *     kdfInfo: !e2e.ByteArray,
 *     pubKey: !e2e.ByteArray,
 *     fingerprint: !e2e.ByteArray,
 *     privKey: ?e2e.ByteArray,
 *     loc: (undefined|!e2e.algorithm.KeyLocations)}}
 */
e2e.cipher.key.Ecdh;


/**
  * @typedef {?{p: !e2e.ByteArray, y: !e2e.ByteArray,
  *     g: !e2e.ByteArray, x: !e2e.ByteArray,
  *     loc: (undefined|!e2e.algorithm.KeyLocations)}}
 */
e2e.cipher.key.ElGamal;


/**
 * Used to store the algorithm identifier, including things like name, key size,
 * public exponent (for RSA), etc.
 * @typedef {*}
 */
e2e.algorithm.WebCryptoAID;


/**
 * @typedef {!{algorithm: !e2e.algorithm.WebCryptoAID, extractable: boolean,
 *           type:string, usages: !Array.<string>}}
 */
e2e.algorithm.WebCryptoKey;


/**
 * @typedef {!{privateKey: (e2e.algorithm.WebCryptoKey|undefined),
 *             publicKey: e2e.algorithm.WebCryptoKey}}
 */
e2e.algorithm.WebCryptoKeyPair;


/**
 * @typedef {e2e.cipher.key.ElGamal|e2e.cipher.key.Ecdh|
 *     e2e.cipher.key.Rsa|e2e.signer.key.Key|null}
 */
e2e.algorithm.AsymmetricKey;


/**
 * @typedef {?{key: !e2e.ByteArray}}
 */
e2e.cipher.key.SymmetricKey;


/**
 * @typedef {e2e.algorithm.AsymmetricKey|
 *     e2e.cipher.key.SymmetricKey|
 *     {passphrase: !e2e.ByteArray}|null}
 */
e2e.cipher.key.Key;
