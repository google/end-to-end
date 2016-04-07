/**
 * @license
 * Copyright 2012 Google Inc. All rights reserved.
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
 * @fileoverview All error types that the e2e module can throw.
 * @author evn@google.com (Eduardo Vela)
 */

goog.provide('e2e.openpgp.error.DecryptError');
goog.provide('e2e.openpgp.error.Error');
goog.provide('e2e.openpgp.error.InvalidArgumentsError');
goog.provide('e2e.openpgp.error.MissingPassphraseError');
goog.provide('e2e.openpgp.error.ParseError');
goog.provide('e2e.openpgp.error.PassphraseError');
goog.provide('e2e.openpgp.error.SerializationError');
goog.provide('e2e.openpgp.error.SignatureError');
goog.provide('e2e.openpgp.error.SignatureExpiredError');
goog.provide('e2e.openpgp.error.UnsupportedError');
goog.provide('e2e.openpgp.error.WrongPassphraseError');

goog.require('goog.debug.Error');



/**
 * The base class for End to End OpenPGP errors.
 * @param {*=} opt_msg The custom error message.
 * @constructor
 * @extends {goog.debug.Error}
 */
e2e.openpgp.error.Error = function(opt_msg) {
  e2e.openpgp.error.Error.base(this, 'constructor', opt_msg);
};
goog.inherits(e2e.openpgp.error.Error, goog.debug.Error);



/**
 * Class to represent all parsing errors.
 * @param {*=} opt_msg The custom error message.
 * @constructor
 * @extends {e2e.openpgp.error.Error}
 */
e2e.openpgp.error.ParseError = function(opt_msg) {
  e2e.openpgp.error.ParseError.base(this, 'constructor', opt_msg);
};
goog.inherits(e2e.openpgp.error.ParseError, e2e.openpgp.error.Error);



/**
 * Class to represent required signature verification errors.
 * @param {*=} opt_msg The custom error message.
 * @constructor
 * @extends {e2e.openpgp.error.Error}
 */
e2e.openpgp.error.SignatureError = function(opt_msg) {
  e2e.openpgp.error.SignatureError.base(this, 'constructor', opt_msg);
};
goog.inherits(e2e.openpgp.error.SignatureError,
    e2e.openpgp.error.Error);



/**
 * Class to represent signature verification error due to expired signature.
 * @param {*=} opt_msg The custom error message.
 * @constructor
 * @extends {e2e.openpgp.error.SignatureError}
 */
e2e.openpgp.error.SignatureExpiredError = function(opt_msg) {
  e2e.openpgp.error.SignatureExpiredError.base(this, 'constructor', opt_msg);
};
goog.inherits(e2e.openpgp.error.SignatureExpiredError,
    e2e.openpgp.error.SignatureError);



/**
 * Class to represent all decryption errors.
 * @param {*=} opt_msg The custom error message.
 * @constructor
 * @extends {e2e.openpgp.error.Error}
 */
e2e.openpgp.error.DecryptError = function(opt_msg) {
  e2e.openpgp.error.DecryptError.base(this, 'constructor', opt_msg);
};
goog.inherits(e2e.openpgp.error.DecryptError, e2e.openpgp.error.Error);



/**
 * Class to represent all serialization errors.
 * @param {*=} opt_msg The custom error message.
 * @constructor
 * @extends {e2e.openpgp.error.Error}
 */
e2e.openpgp.error.SerializationError = function(opt_msg) {
  e2e.openpgp.error.SerializationError.base(this, 'constructor', opt_msg);
};
goog.inherits(e2e.openpgp.error.SerializationError,
              e2e.openpgp.error.Error);



/**
 * Exception used when a function receives an invalid argument.
 * @param {string} message The message with the error details.
 * @constructor
 * @extends {e2e.openpgp.error.Error}
*/
e2e.openpgp.error.InvalidArgumentsError = function(message) {
  e2e.openpgp.error.InvalidArgumentsError.base(this, 'constructor', message);
};
goog.inherits(e2e.openpgp.error.InvalidArgumentsError,
              e2e.openpgp.error.Error);



/**
 * Exception used when the client requests an unimplemented feature.
 * @param {string} message The message with the error details.
 * @constructor
 * @extends {e2e.openpgp.error.Error}
*/
e2e.openpgp.error.UnsupportedError = function(message) {
  e2e.openpgp.error.UnsupportedError.base(this, 'constructor', message);
};
goog.inherits(e2e.openpgp.error.UnsupportedError,
              e2e.openpgp.error.Error);



/**
 * Exception used for all passphrase errors.
 * @param {string} message The message with the error details.
 * @constructor
 * @extends {e2e.openpgp.error.Error}
*/
e2e.openpgp.error.PassphraseError = function(message) {
  e2e.openpgp.error.PassphraseError.base(this, 'constructor', message);
};
goog.inherits(e2e.openpgp.error.PassphraseError,
              e2e.openpgp.error.Error);



/**
 * Exception used when an encrypted cipher needs a passphrase.
 * @constructor
 * @extends {e2e.openpgp.error.PassphraseError}
*/
e2e.openpgp.error.MissingPassphraseError = function() {
  e2e.openpgp.error.MissingPassphraseError.base(
      this, 'constructor', 'Missing passphrase.');
};
goog.inherits(e2e.openpgp.error.MissingPassphraseError,
              e2e.openpgp.error.PassphraseError);



/**
 * Exception used when an encrypted cipher has the wrong passphrase.
 * @constructor
 * @extends {e2e.openpgp.error.PassphraseError}
*/
e2e.openpgp.error.WrongPassphraseError = function() {
  e2e.openpgp.error.WrongPassphraseError.base(
      this, 'constructor', 'Wrong passphrase.');
};
goog.inherits(e2e.openpgp.error.WrongPassphraseError,
              e2e.openpgp.error.PassphraseError);
