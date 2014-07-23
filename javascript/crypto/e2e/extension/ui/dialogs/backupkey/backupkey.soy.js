// This file was automatically generated from backupkey.soy.
// Please don't edit this file by hand.

/**
 * @fileoverview Templates in namespace e2e.ext.ui.templates.dialogs.backupkey.
 */

goog.provide('e2e.ext.ui.templates.dialogs.backupkey');
goog.provide('e2e.ext.ui.templates.dialogs.backupkey.BackupKey');
goog.provide('e2e.ext.ui.templates.dialogs.backupkey.RestoreKey');

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
e2e.ext.ui.templates.dialogs.backupkey.BackupKey = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<div><h3>' + soy.$$escapeHtml(opt_data.key) + '</h3></div>');
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.dialogs.backupkey.BackupKey.soyTemplateName = 'e2e.ext.ui.templates.dialogs.backupkey.BackupKey';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.dialogs.backupkey.RestoreKey = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<div><label><div>' + soy.$$escapeHtml(opt_data.emailLabel) + '</div><input type="text" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEYRING_RESTORE_EMAIL) + '"></label></div><div><label><div>' + soy.$$escapeHtml(opt_data.backupCodeLabel) + '</div><input type="text" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEYRING_RESTORE_INPUT) + '"></label></div>');
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.dialogs.backupkey.RestoreKey.soyTemplateName = 'e2e.ext.ui.templates.dialogs.backupkey.RestoreKey';
}
