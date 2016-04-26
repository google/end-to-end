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
 * @fileoverview Provides the keyring backup UI.
 */

goog.provide('e2e.ext.ui.dialogs.BackupKey');

goog.require('e2e.async.Result');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.error.UnsupportedError');
goog.require('e2e.ext.actions.Executor');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.constants.Actions');
goog.require('e2e.ext.ui.dialogs.Overlay');
goog.require('e2e.ext.ui.templates.dialogs.backupkey');
goog.require('goog.array');
goog.require('goog.crypt.Sha1');
goog.require('goog.crypt.base64');
goog.require('soy');

goog.scope(function() {
var constants = e2e.ext.constants;
var dialogs = e2e.ext.ui.dialogs;
var messages = e2e.ext.messages;
var templates = e2e.ext.ui.templates.dialogs.backupkey;



/**
 * Constructor for the full version of the keyring management UI.
 * @constructor
 * @extends {e2e.ext.ui.dialogs.Overlay}
 */
dialogs.BackupKey = function() {
  goog.base(this);
};
goog.inherits(dialogs.BackupKey, dialogs.Overlay);


/** @override */
dialogs.BackupKey.prototype.createDom = function() {
  goog.base(this, 'createDom');
  this.decorateInternal(this.getElement());
};


/** @override */
dialogs.BackupKey.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);
  this.setTitle(chrome.i18n.getMessage('keyMgmtBackupKeyringLabel'));
  this.getBackupCode_().addCallback(goog.bind(function(key) {
    soy.renderElement(this.getContentElement(), templates.backupKey, {
      key: key,
      caseSensitiveText:
          chrome.i18n.getMessage('keyMgmtBackupKeyringCaseSensitive')
    });
  }, this));
};


/**
 * Returns the backup code to display in the UI.
 * @private
 * @return {e2e.async.Result.<string>} Base64 encoded backup code to display.
 */
dialogs.BackupKey.prototype.getBackupCode_ = function() {
  var result = new e2e.async.Result();
  new e2e.ext.actions.Executor().execute(/** @type {!messages.ApiRequest} */ ({
    action: constants.Actions.GET_KEYRING_BACKUP_DATA
  }), this, /** @param {e2e.openpgp.KeyringBackupInfo} data */ function(data) {
    if (data.count % 2) {
      throw new e2e.error.InvalidArgumentsError('Odd number of keys');
    }

    // Limit of 256 key pairs since count is encoded as a single byte.
    if (data.count > 512) {
      throw new e2e.error.UnsupportedError('Too many keys');
    }

    var backup = goog.array.concat(
        constants.BACKUP_CODE_VERSION,
        // count / 2 since we store the number of key PAIRS
        [data.count / 2],
        data.seed);

    var sha1 = new goog.crypt.Sha1();
    sha1.update(backup);
    var checksum = sha1.digest().slice(0, 2);

    result.callback(goog.crypt.base64.encodeByteArray(
        goog.array.concat(backup, checksum)));
  });
  return result;
};
});  // goog.scope
