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
  var output = '<div class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEYRING_BACKUP_WINDOW) + '"><h3><table><tbody>';
  var dimension__soy6 = e2e.ext.constants.BackupCode;
  var rowstart__soy7 = opt_data.key.length / dimension__soy6.ROWS;
  var colstart__soy8 = rowstart__soy7 / dimension__soy6.COLS;
  var byteList9 = opt_data.key;
  var byteListLen9 = byteList9.length;
  for (var byteIndex9 = 0; byteIndex9 < byteListLen9; byteIndex9++) {
    var byteData9 = byteList9[byteIndex9];
    output += ((byteIndex9 % rowstart__soy7 == 0) ? '<tr>' : '') + ((byteIndex9 % colstart__soy8 == 0) ? '<td>' : '') + soy.$$escapeHtml(byteData9) + ((byteIndex9 % colstart__soy8 == colstart__soy8 - 1) ? '</td>' : '') + ((byteIndex9 % rowstart__soy7 == rowstart__soy7 - 1) ? '</tr>' : '');
  }
  output += '</tbody></table></h3><span>' + soy.$$escapeHtml(opt_data.caseSensitiveText) + '</span></div>';
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(output);
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
