// This file was automatically generated from templates.soy.
// Please don't edit this file by hand.

/**
 * @fileoverview Templates in namespace e2e.ext.ui.templates.
 */

goog.provide('e2e.ext.ui.templates');
goog.provide('e2e.ext.ui.templates.Dialog');
goog.provide('e2e.ext.ui.templates.ImportKeyConfirm');
goog.provide('e2e.ext.ui.templates.KeyPacketInfo');
goog.provide('e2e.ext.ui.templates.Settings');

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
e2e.ext.ui.templates.Settings = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<html><head><title>' + soy.$$escapeHtmlRcdata(opt_data.pageTitle) + '</title><link rel="stylesheet"/></head><body><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.HEADER) + '"><div><h1>' + soy.$$escapeHtml(opt_data.pageTitle) + '</h1></div></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.ERROR_DIV) + '"></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.BODY) + '"></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.CALLBACK_DIALOG) + '"></div></body></html>');
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.Settings.soyTemplateName = 'e2e.ext.ui.templates.Settings';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.Dialog = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(((opt_data.message) ? '<div>' + soy.$$changeNewlineToBr(soy.$$escapeHtml(opt_data.message)) + '</div>' : '') + ((opt_data.inputFieldType) ? '<input type="' + soy.$$escapeHtmlAttribute(opt_data.inputFieldType) + '" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.DIALOG_INPUT) + '" placeholder="' + soy.$$escapeHtmlAttribute(opt_data.inputPlaceholder) + '" autofocus>' : '') + '<button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.ACTION) + '">' + soy.$$escapeHtml(opt_data.actionButtonTitle) + '</button>' + ((opt_data.cancelButtonTitle.length > 0) ? '<button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.CANCEL) + '">' + soy.$$escapeHtml(opt_data.cancelButtonTitle) + '</button>' : ''));
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.Dialog.soyTemplateName = 'e2e.ext.ui.templates.Dialog';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.ImportKeyConfirm = function(opt_data, opt_ignored, opt_ijData) {
  var output = '<p>' + soy.$$escapeHtml(opt_data.promptImportKeyConfirmLabel) + '</p><div class="keys">';
  var keyList48 = opt_data.keys;
  var keyListLen48 = keyList48.length;
  for (var keyIndex48 = 0; keyIndex48 < keyListLen48; keyIndex48++) {
    var keyData48 = keyList48[keyIndex48];
    output += '<div class="key"><p><strong>';
    var uidList50 = keyData48.uids;
    var uidListLen50 = uidList50.length;
    for (var uidIndex50 = 0; uidIndex50 < uidListLen50; uidIndex50++) {
      var uidData50 = uidList50[uidIndex50];
      output += soy.$$escapeHtml(uidData50) + ((! (uidIndex50 == uidListLen50 - 1)) ? ', ' : '');
    }
    output += '</strong>:</p>' + e2e.ext.ui.templates.KeyPacketInfo({keyPacketInfo: keyData48.key, secretKeyDescription: opt_data.secretKeyDescription, publicKeyDescription: opt_data.publicKeyDescription}, null, opt_ijData);
    var subKeyInfoList61 = keyData48.subKeys;
    var subKeyInfoListLen61 = subKeyInfoList61.length;
    for (var subKeyInfoIndex61 = 0; subKeyInfoIndex61 < subKeyInfoListLen61; subKeyInfoIndex61++) {
      var subKeyInfoData61 = subKeyInfoList61[subKeyInfoIndex61];
      output += e2e.ext.ui.templates.KeyPacketInfo({keyPacketInfo: subKeyInfoData61, secretKeyDescription: opt_data.secretSubKeyDescription, publicKeyDescription: opt_data.publicSubKeyDescription}, null, opt_ijData);
    }
    output += '</div>';
  }
  output += '</div>';
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(output);
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.ImportKeyConfirm.soyTemplateName = 'e2e.ext.ui.templates.ImportKeyConfirm';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.KeyPacketInfo = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<div><span class="keyTypeDescription">' + ((opt_data.keyPacketInfo.secret) ? soy.$$escapeHtml(opt_data.secretKeyDescription) : soy.$$escapeHtml(opt_data.publicKeyDescription)) + ' ' + soy.$$escapeHtml(opt_data.keyPacketInfo.algorithm) + '</span> <span class="keyFingerprint">' + soy.$$escapeHtml(opt_data.keyPacketInfo.fingerprintHex) + '</span></div>');
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.KeyPacketInfo.soyTemplateName = 'e2e.ext.ui.templates.KeyPacketInfo';
}
