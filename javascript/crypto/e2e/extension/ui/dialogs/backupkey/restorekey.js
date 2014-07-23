// Copyright 2014 Google Inc. All rights reserved.
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
 * @fileoverview Provides the keyring backup UI.
 */

goog.provide('e2e.ext.ui.dialogs.RestoreKey');

goog.require('e2e');
goog.require('e2e.error.InvalidArgumentsError');
goog.require('e2e.ext.actions.Executor');
goog.require('e2e.ext.constants');
goog.require('e2e.ext.ui.dialogs.Overlay');
goog.require('e2e.ext.ui.templates.dialogs.backupkey');
goog.require('e2e.ext.utils');
goog.require('e2e.openpgp.KeyRing');
goog.require('goog.crypt.base64');
goog.require('soy');

goog.scope(function() {
var constants = e2e.ext.constants;
var dialogs = e2e.ext.ui.dialogs;
var templates = e2e.ext.ui.templates.dialogs.backupkey;


/**
 * Constructor for the restore key window.
 * @constructor
 * @extends {e2e.ext.ui.dialogs.Overlay}
 */
dialogs.RestoreKey = function() {
  goog.base(this);
};
goog.inherits(dialogs.RestoreKey, dialogs.Overlay);


/** @override */
dialogs.RestoreKey.prototype.createDom = function() {
  goog.base(this, 'createDom');
  this.decorateInternal(this.getElement());
};


/** @override */
dialogs.RestoreKey.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);
  this.setTitle(chrome.i18n.getMessage('keyMgmtRestoreKeyringLabel'));
  soy.renderElement(this.getContentElement(), templates.RestoreKey);
};


/** @override */
dialogs.RestoreKey.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  this.getHandler().listen(this, goog.ui.Dialog.EventType.SELECT,
      this.executeRestore_);
};


/**
 * Parses the user input into a base64 encoded string.
 * @private
 * @return {string} The base 64 encoded backup code.
 */
dialogs.RestoreKey.prototype.getInputValue_ = function() {
  return this.getElementByClass(constants.CssClass.KEYRING_RESTORE_INPUT).value;
};


/**
 * Executes the action for restoring keyring data
 * @private
 */
dialogs.RestoreKey.prototype.executeRestore_ = function() {
  new e2e.ext.actions.Executor().execute({
    action: constants.Actions.RESTORE_KEYRING_DATA,
    content: this.getInputValue_()
  }, this);
};

}); // goog.scope
