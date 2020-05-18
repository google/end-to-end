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
goog.provide('e2e.openpgp.packet.SecretKeyInterface');



/**
 * An interface representing a secret key packet that is used only for the
 * purpose of using its cipher (i.e. the secret key that might not have the key
 * material and is not serializable).
 * @interface
 */
e2e.openpgp.packet.SecretKeyInterface = function() {};


/**
 * @type {!e2e.openpgp.KeyId|undefined} Key ID.
 */
e2e.openpgp.packet.SecretKeyInterface.prototype.keyId;


/**
 * @type {e2e.cipher.Cipher|e2e.signer.Signer} The cipher.
 */
e2e.openpgp.packet.SecretKeyInterface.prototype.cipher;
