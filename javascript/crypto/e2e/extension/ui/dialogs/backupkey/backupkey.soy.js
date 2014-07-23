// This file was automatically generated from backupkey.soy.
// Please don't edit this file by hand.

/**
 * @fileoverview Templates in namespace e2e.ext.ui.templates.dialogs.backupkey.
 */

goog.provide('e2e.ext.ui.templates.dialogs.backupkey');
goog.provide('e2e.ext.ui.templates.dialogs.backupkey.BackupKey');
goog.provide('e2e.ext.ui.templates.dialogs.backupkey.Grid');
goog.provide('e2e.ext.ui.templates.dialogs.backupkey.GridCell');
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
e2e.ext.ui.templates.dialogs.backupkey.Grid = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<table>' + ((opt_data.opt_caption) ? '<caption>' + soy.$$escapeHtml(opt_data.opt_caption) + '</caption>' : '') + '<tbody>' + soy.$$escapeHtml(opt_data.content) + '</tbody></table>');
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.dialogs.backupkey.Grid.soyTemplateName = 'e2e.ext.ui.templates.dialogs.backupkey.Grid';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.dialogs.backupkey.GridCell = function(opt_data, opt_ignored, opt_ijData) {
  var output = '';
  var dimension__soy13 = e2e.ext.constants.BackupCode;
  var rowstart__soy14 = opt_data.length / dimension__soy13.ROWS;
  var colstart__soy15 = rowstart__soy14 / dimension__soy13.COLS;
  output += ((opt_data.i % rowstart__soy14 == 0) ? '<tr>' : '') + ((opt_data.i % colstart__soy15 == 0) ? '<td>' : '') + soy.$$escapeHtml(opt_data.content) + ((opt_data.i % colstart__soy15 == colstart__soy15 - 1) ? '</td>' : '') + ((opt_data.i % rowstart__soy14 == rowstart__soy14 - 1) ? '</tr>' : '');
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(output);
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.dialogs.backupkey.GridCell.soyTemplateName = 'e2e.ext.ui.templates.dialogs.backupkey.GridCell';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.dialogs.backupkey.BackupKey = function(opt_data, opt_ignored, opt_ijData) {
  var output = '<div class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEYRING_BACKUP_WINDOW) + '">';
  var param33 = '';
  var iList34 = opt_data.key;
  var iListLen34 = iList34.length;
  for (var iIndex34 = 0; iIndex34 < iListLen34; iIndex34++) {
    var iData34 = iList34[iIndex34];
    param33 += e2e.ext.ui.templates.dialogs.backupkey.GridCell({length: opt_data.key.length, i: iIndex34, content: iData34}, null, opt_ijData);
  }
  output += e2e.ext.ui.templates.dialogs.backupkey.Grid({content: soydata.VERY_UNSAFE.$$ordainSanitizedHtmlForInternalBlocks(param33)}, null, opt_ijData);
  output += '<span>' + soy.$$escapeHtml(opt_data.caseSensitiveText) + '</span></div>';
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
  var output = '<div><label><div>' + soy.$$escapeHtml(opt_data.emailLabel) + '</div><input type="text" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEYRING_RESTORE_EMAIL) + '"></label></div><div class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEYRING_BACKUP_WINDOW) + '">';
  var param53 = '';
  var dimension__soy54 = e2e.ext.constants.BackupCode;
  var length__soy55 = dimension__soy54.ROWS * dimension__soy54.COLS;
  var celllength__soy56 = Math.ceil(e2e.ext.constants.BACKUP_CODE_LENGTH / length__soy55);
  var iLimit57 = length__soy55;
  for (var i57 = 0; i57 < iLimit57; i57++) {
    param53 += e2e.ext.ui.templates.dialogs.backupkey.GridCell({length: length__soy55, i: i57, content: soydata.VERY_UNSAFE.$$ordainSanitizedHtmlForInternalBlocks('<input type="text" maxlength="' + soy.$$escapeHtmlAttribute(celllength__soy56) + '" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEYRING_RESTORE_INPUT) + '">')}, null, opt_ijData);
  }
  output += e2e.ext.ui.templates.dialogs.backupkey.Grid({opt_caption: opt_data.backupCodeLabel, content: soydata.VERY_UNSAFE.$$ordainSanitizedHtmlForInternalBlocks(param53)}, null, opt_ijData);
  output += '<span>&nbsp;</span></div>';
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(output);
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.dialogs.backupkey.RestoreKey.soyTemplateName = 'e2e.ext.ui.templates.dialogs.backupkey.RestoreKey';
}
