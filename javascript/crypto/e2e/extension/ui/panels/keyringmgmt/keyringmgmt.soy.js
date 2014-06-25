// This file was automatically generated from keyringmgmt.soy.
// Please don't edit this file by hand.

/**
 * @fileoverview Templates in namespace e2e.ext.ui.templates.panels.keyringmgmt.
 */

goog.provide('e2e.ext.ui.templates.panels.keyringmgmt');
goog.provide('e2e.ext.ui.templates.panels.keyringmgmt.KeyEntry');
goog.provide('e2e.ext.ui.templates.panels.keyringmgmt.ListKeys');
goog.provide('e2e.ext.ui.templates.panels.keyringmgmt.ManageKeyring');
goog.provide('e2e.ext.ui.templates.panels.keyringmgmt.NoneEntry');

goog.require('soy');
goog.require('soydata');
goog.require('goog.i18n.bidi');


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.panels.keyringmgmt.ListKeys = function(opt_data, opt_ignored, opt_ijData) {
  var output = '<h1>' + soy.$$escapeHtml(opt_data.sectionTitle) + '</h1><table>';
  var keyMetaList6 = opt_data.storedKeys;
  var keyMetaListLen6 = keyMetaList6.length;
  if (keyMetaListLen6 > 0) {
    for (var keyMetaIndex6 = 0; keyMetaIndex6 < keyMetaListLen6; keyMetaIndex6++) {
      var keyMetaData6 = keyMetaList6[keyMetaIndex6];
      output += '<tr data-user-id="' + soy.$$escapeHtmlAttribute(keyMetaData6.userId) + '">' + e2e.ext.ui.templates.panels.keyringmgmt.KeyEntry({keyMeta: keyMetaData6, exportLabel: opt_data.exportLabel, removeLabel: opt_data.removeLabel}, null, opt_ijData) + '</tr>';
    }
  } else {
    output += e2e.ext.ui.templates.panels.keyringmgmt.NoneEntry(opt_data, null, opt_ijData);
  }
  output += '</table>';
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(output);
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.panels.keyringmgmt.ListKeys.soyTemplateName = 'e2e.ext.ui.templates.panels.keyringmgmt.ListKeys';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.panels.keyringmgmt.NoneEntry = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<tr><td><i>' + soy.$$escapeHtml(opt_data.noneLabel) + '</i></td></tr>');
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.panels.keyringmgmt.NoneEntry.soyTemplateName = 'e2e.ext.ui.templates.panels.keyringmgmt.NoneEntry';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.panels.keyringmgmt.KeyEntry = function(opt_data, opt_ignored, opt_ijData) {
  var output = '<td><div class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEY_UID) + '">' + soy.$$escapeHtml(opt_data.keyMeta.userId) + '</div>';
  var keyList29 = opt_data.keyMeta.keys;
  var keyListLen29 = keyList29.length;
  for (var keyIndex29 = 0; keyIndex29 < keyListLen29; keyIndex29++) {
    var keyData29 = keyList29[keyIndex29];
    output += '<div class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEY_META) + '">' + soy.$$escapeHtml(keyData29.type) + ' ' + soy.$$escapeHtml(keyData29.algorithm) + ' ' + soy.$$escapeHtml(keyData29.fingerprint) + '</div>';
  }
  output += '</td><td><img class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.EXPORT) + '" src="images/download_item.png" title="' + soy.$$escapeHtmlAttribute(opt_data.exportLabel) + '"><img class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.REMOVE) + '" src="images/delete.png" title="' + soy.$$escapeHtmlAttribute(opt_data.removeLabel) + '"></td>';
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(output);
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.panels.keyringmgmt.KeyEntry.soyTemplateName = 'e2e.ext.ui.templates.panels.keyringmgmt.KeyEntry';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.panels.keyringmgmt.ManageKeyring = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.KEYRING_IMPORT_DIV) + '" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.HIDDEN) + '"><input type="file" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.ACTION) + '"/><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.CANCEL) + '">' + soy.$$escapeHtml(opt_data.importCancelButtonTitle) + '</button></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.KEYRING_PASSPHRASE_CHANGE_DIV) + '" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.HIDDEN) + '"><div>' + soy.$$escapeHtml(opt_data.changePassphrasePlaceholder) + '</div><input type="password" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.PASSPHRASE) + '"/><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.ACTION) + '">' + soy.$$escapeHtml(opt_data.passphraseChangeActionButtonTitle) + '</button><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.CANCEL) + '">' + soy.$$escapeHtml(opt_data.passphraseChangeCancelButtonTitle) + '</button></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.KEYRING_PASSPHRASE_CONFIRM_DIV) + '" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.HIDDEN) + '"><div>' + soy.$$escapeHtml(opt_data.confirmPassphrasePlaceholder) + '</div><input type="password" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.PASSPHRASE) + '"/><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.ACTION) + '">' + soy.$$escapeHtml(opt_data.passphraseConfirmActionButtonTitle) + '</button><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.CANCEL) + '">' + soy.$$escapeHtml(opt_data.passphraseChangeCancelButtonTitle) + '</button></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.KEYRING_OPTIONS_DIV) + '"><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEYRING_IMPORT) + ' ' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.CANCEL) + '">' + soy.$$escapeHtml(opt_data.importKeyringLabel) + '</button><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEYRING_EXPORT) + ' ' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.CANCEL) + '">' + soy.$$escapeHtml(opt_data.exportKeyringLabel) + '</button><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEYRING_PASSPHRASE_CHANGE) + ' ' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.CANCEL) + '">' + soy.$$escapeHtml(opt_data.changePassphraseLabel) + '</button></div>');
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.panels.keyringmgmt.ManageKeyring.soyTemplateName = 'e2e.ext.ui.templates.panels.keyringmgmt.ManageKeyring';
}
