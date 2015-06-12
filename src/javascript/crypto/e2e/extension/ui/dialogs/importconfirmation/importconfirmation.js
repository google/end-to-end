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
 * @fileoverview A dialog to confirm key imports.
 */

goog.provide('e2e.ext.ui.dialogs.ImportConfirmation');

goog.require('e2e.ext.ui.dialogs.Generic');
goog.require('e2e.ext.ui.dialogs.InputType');
goog.require('e2e.ext.ui.templates.dialogs.importconfirmation');

goog.scope(function() {
var ui = e2e.ext.ui;
var constants = e2e.ext.constants;
var dialogs = e2e.ext.ui.dialogs;
var templates = e2e.ext.ui.templates.dialogs.importconfirmation;



/**
 * Constructor for the import confirmation dialog.
 * @param {!e2e.openpgp.Keys} keys The keys to import.
 * @param {!function(string=)} callback The callback where the user's
 *     input must be passed.
 * @constructor
 * @extends {dialogs.Generic}
 */
dialogs.ImportConfirmation = function(keys, callback) {
  goog.base(
      this,
      templates.importKeyConfirm({
        promptImportKeyConfirmLabel: chrome.i18n.getMessage(
            'promptImportKeyConfirmLabel'),
        keys: keys,
        secretKeyDescription: chrome.i18n.getMessage('secretKeyDescription'),
        publicKeyDescription: chrome.i18n.getMessage('publicKeyDescription'),
        keyFingerprintLabel: chrome.i18n.getMessage('keyFingerprintLabel')
      }),
      callback,
      dialogs.InputType.NONE,
      '',
      chrome.i18n.getMessage('promptOkActionLabel'),
      chrome.i18n.getMessage('actionCancelPgpAction'));
};
goog.inherits(dialogs.ImportConfirmation, dialogs.Generic);


/** @override */
dialogs.ImportConfirmation.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
};

});  // goog.scope
