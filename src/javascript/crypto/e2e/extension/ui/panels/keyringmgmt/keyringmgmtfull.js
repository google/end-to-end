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
 * @fileoverview Provides the full version of the keyring management UI.
 */

goog.provide('e2e.ext.ui.panels.KeyringMgmtFull');

goog.require('e2e.ext.constants.CssClass');
goog.require('e2e.ext.constants.ElementId');
goog.require('e2e.ext.ui.panels.KeyringMgmtMini');
goog.require('e2e.ext.ui.templates.panels.keyringmgmt');
goog.require('goog.array');
goog.require('goog.crypt');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('goog.events.EventType');
goog.require('goog.structs.Map');
goog.require('goog.ui.Component');
goog.require('soy');

goog.scope(function() {
var constants = e2e.ext.constants;
var panels = e2e.ext.ui.panels;
var templates = e2e.ext.ui.templates.panels.keyringmgmt;



/**
 * Constructor for the full version of the keyring management UI.
 * @param {!Object} pgpKeys A collection of raw PGP keys.
 * @param {!function()} exportKeyringCallback The callback to invoke when the
 *     keyring is to be exported.
 * @param {!function(!File)} importKeyringCallback The callback to invoke when
 *     an existing keyring is to be imported.
 * @param {!function(string)} updateKeyringPassphraseCallback The callback to
 *     invoke when the passphrase to the keyring is to be updated.
 * @param {!function(string)} restoreKeyringCallback The callback to invoke when
 *     the keyring is restored.
 * @param {!function(string)} exportKeyCallback The callback to invoke when a
 *     single PGP key is to be exported.
 * @param {!function(string)} removeKeyCallback The callback to invoke when a
 *     single PGP key is to be removed.
 * @constructor
 * @extends {goog.ui.Component}
 */
panels.KeyringMgmtFull = function(pgpKeys, exportKeyringCallback,
    importKeyringCallback, updateKeyringPassphraseCallback,
    restoreKeyringCallback, exportKeyCallback, removeKeyCallback) {
  goog.base(this);

  /**
   * The PGP keys stored in the extension.
   * @type {!goog.structs.Map}
   * @private
   */
  this.pgpKeys_ = new goog.structs.Map(pgpKeys);

  /**
   * Provides keyring-wide management controls.
   * @type {!panels.KeyringMgmtMini}
   * @private
   */
  this.keyringMgmtControls_ = new panels.KeyringMgmtMini(exportKeyringCallback,
      importKeyringCallback, updateKeyringPassphraseCallback,
      restoreKeyringCallback);

  /**
   * The callback to invoke when a single PGP key is to be exported.
   * @type {!function(string)}
   * @private
   */
  this.exportKeyCallback_ = exportKeyCallback;

  /**
   * The callback to invoke when a single PGP key is to be removed.
   * @type {!function(string)}
   * @private
   */
  this.removeKeyCallback_ = removeKeyCallback;
};
goog.inherits(panels.KeyringMgmtFull, goog.ui.Component);


/** @override */
panels.KeyringMgmtFull.prototype.disposeInternal = function() {
  this.pgpKeys_.clear();

  goog.base(this, 'disposeInternal');
};


/** @override */
panels.KeyringMgmtFull.prototype.createDom = function() {
  goog.base(this, 'createDom');
  this.decorateInternal(this.getElement());
};


/** @override */
panels.KeyringMgmtFull.prototype.decorateInternal = function(elem) {
  goog.base(this, 'decorateInternal', elem);
  elem.id = constants.ElementId.KEYRING_DIV;

  var storedKeys = goog.array.map(this.pgpKeys_.getKeys(), function(userId) {
    return {
      userId: userId,
      keys: this.getKeysDescription_(this.pgpKeys_.get(userId))
    };
  }, this);
  soy.renderElement(elem, templates.listKeys, {
    storedKeys: storedKeys,
    sectionTitle: chrome.i18n.getMessage('keyMgmtTitle'),
    exportLabel: chrome.i18n.getMessage('keyMgmtExportLabel'),
    removeLabel: chrome.i18n.getMessage('keyMgmtRemoveLabel'),
    noneLabel: chrome.i18n.getMessage('keyMgmtNoneLabel')
  });

  var keyringTable = this.getElement().querySelector('table');
  this.addChild(this.keyringMgmtControls_, false);
  this.keyringMgmtControls_.renderBefore(keyringTable);
};


/** @override */
panels.KeyringMgmtFull.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var keyringTable = this.getElement().querySelector('table');
  this.getHandler()
      .listen(
          keyringTable,
          goog.events.EventType.CLICK,
          this.handleClick_,
          true);
};


/**
 * Renders a new PGP key into the UI.
 * @param {string} userId The ID of the key.
 * @param {Array} pgpKeys The keys and subkeys to render into the UI.
 */
panels.KeyringMgmtFull.prototype.addNewKey = function(userId, pgpKeys) {
  var keyringTable = this.getElement().querySelector('table');

  // escaped according to http://www.w3.org/TR/CSS21/syndata.html#characters
  var userIdSel = 'tr[data-user-id="' +
      userId.replace(/[^A-Za-z0-9_\u00A0-\uFFFF-]/g, function(c) {
        return '\\' + c;
      }) + '"]';

  goog.dom.removeNode(keyringTable.querySelector(userIdSel));

  if (keyringTable.textContent == chrome.i18n.getMessage('keyMgmtNoneLabel')) {
    keyringTable.removeChild(keyringTable.firstElementChild);
  }

  var tr = document.createElement(goog.dom.TagName.TR);
  tr.dataset.userId = userId;
  soy.renderElement(tr, templates.keyEntry, {
    keyMeta: {
      'userId': userId,
      'keys': this.getKeysDescription_(pgpKeys)
    },
    exportLabel: chrome.i18n.getMessage('keyMgmtExportLabel'),
    removeLabel: chrome.i18n.getMessage('keyMgmtRemoveLabel')
  });
  keyringTable.appendChild(tr);
  this.keyringMgmtControls_.refreshOptions(true);
};


/**
 * Removes a PGP key from the UI.
 * @param {string} userId The ID of the PGP key to remove.
 */
panels.KeyringMgmtFull.prototype.removeKey = function(userId) {
  var tableRows = this.getElement().querySelectorAll('tr');
  tableRows = goog.array.filter(tableRows, function(row) {
    return row.textContent.indexOf(userId) > -1;
  });

  var uidElems = goog.array.filter(
      this.getElementsByClass(constants.CssClass.KEY_UID),
      function(elem) {
        return elem.textContent == userId;
      });

  goog.array.forEach(uidElems, function(elem) {
    var parentRow = this.getParentTableRow_(elem);
    parentRow.parentElement.removeChild(parentRow);
  }, this);

  if (this.getElement().querySelectorAll('tr').length == 0) {
    soy.renderElement(this.getElement().querySelector('table'),
        templates.noneEntry, {
          'noneLabel': chrome.i18n.getMessage('keyMgmtNoneLabel')
        });
    this.keyringMgmtControls_.refreshOptions(false);
  } else {
    this.keyringMgmtControls_.refreshOptions(true);
  }
};


/**
 * Updates the button to set the keyring's passphrase according to whether the
 * keyring is encrypted or not.
 * @param {boolean} encrypted True if the keyring is encrypted.
 */
panels.KeyringMgmtFull.prototype.setKeyringEncrypted = function(encrypted) {
  this.keyringMgmtControls_.setKeyringEncrypted(encrypted);
};


/**
 * Resets the appearance of the management controls.
 */
panels.KeyringMgmtFull.prototype.resetControls = function() {
  this.keyringMgmtControls_.reset();
};


/**
 * Returns a human readable representation of the given collection of PGP keys.
 * @param {Array} keys Raw collection of PGP keys.
 * @return {Array} A collection of PGP key metadata.
 * @private
 */
panels.KeyringMgmtFull.prototype.getKeysDescription_ = function(keys) {
  return goog.array.flatten(goog.array.map(keys, function(key) {
    var type = (key.key.secret ?
        chrome.i18n.getMessage('secretKeyDescription') :
        chrome.i18n.getMessage('publicKeyDescription'));
    return [{
      type: type,
      algorithm: key.key.algorithm,
      fingerprint: goog.crypt.byteArrayToHex(key.key.fingerprint)
    }].concat(goog.array.map(key.subKeys, function(subKey) {
      var type = (subKey.secret ?
          chrome.i18n.getMessage('secretSubKeyDescription') :
          chrome.i18n.getMessage('publicSubKeyDescription'));
      return {
        type: type,
        algorithm: subKey.algorithm,
        fingerprint: goog.crypt.byteArrayToHex(subKey.fingerprint)
      };
    }));
  }));
};


/**
 * Returns the parent table row of the given element.
 * @param {HTMLElement} elem The element for which we need to find the parent
 *     table row.
 * @return {Element} The parent table row.
 * @private
 */
panels.KeyringMgmtFull.prototype.getParentTableRow_ = function(elem) {
  var parentTR = elem.parentElement;
  while (parentTR.tagName != goog.dom.TagName.TR) {
    parentTR = parentTR.parentElement;
  }

  return parentTR;
};


/**
 * Handles events when the user clicks on export/remove icons in the UI.
 * @param {!goog.events.Event} clickEvt The event generated by the user's click.
 * @private
 */
panels.KeyringMgmtFull.prototype.handleClick_ = function(clickEvt) {
  var icon = /** @type {HTMLElement} */ (clickEvt.target);
  if (!(icon instanceof HTMLImageElement)) {
    return;
  }

  var callback = goog.dom.classlist.contains(icon, constants.CssClass.REMOVE) ?
      this.removeKeyCallback_ : this.exportKeyCallback_;
  var parentTR = this.getParentTableRow_(icon);
  var keyUid = goog.dom.getElementByClass(
      constants.CssClass.KEY_UID, parentTR).textContent;
  callback(keyUid);
};


});  // goog.scope
