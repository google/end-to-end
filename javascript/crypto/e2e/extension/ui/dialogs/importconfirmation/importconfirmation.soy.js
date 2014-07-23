// This file was automatically generated from importconfirmation.soy.
// Please don't edit this file by hand.

/**
 * @fileoverview Templates in namespace e2e.ext.ui.templates.dialogs.importconfirmation.
 */

goog.provide('e2e.ext.ui.templates.dialogs.importconfirmation');
goog.provide('e2e.ext.ui.templates.dialogs.importconfirmation.ImportKeyConfirm');
goog.provide('e2e.ext.ui.templates.dialogs.importconfirmation.KeyPacketInfo');

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
e2e.ext.ui.templates.dialogs.importconfirmation.ImportKeyConfirm = function(opt_data, opt_ignored, opt_ijData) {
  var output = '<p>' + soy.$$escapeHtml(opt_data.promptImportKeyConfirmLabel) + '</p><div>';
  var keyList6 = opt_data.keys;
  var keyListLen6 = keyList6.length;
  for (var keyIndex6 = 0; keyIndex6 < keyListLen6; keyIndex6++) {
    var keyData6 = keyList6[keyIndex6];
    output += '<div class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEY_META) + '"><p><strong>';
    var uidList10 = keyData6.uids;
    var uidListLen10 = uidList10.length;
    for (var uidIndex10 = 0; uidIndex10 < uidListLen10; uidIndex10++) {
      var uidData10 = uidList10[uidIndex10];
      output += soy.$$escapeHtml(uidData10) + ((! (uidIndex10 == uidListLen10 - 1)) ? ', ' : '');
    }
    output += '</strong>:</p>';
    var keyId__soy17 = 'key-' + ('' + keyIndex6);
    keyId__soy17 = soydata.$$markUnsanitizedTextForInternalBlocks(keyId__soy17);
    output += '<br><input id="' + soy.$$escapeHtmlAttribute(keyId__soy17) + '" type="checkbox" data-mainkey="' + soy.$$escapeHtmlAttribute(keyIndex6) + '"><label for="' + soy.$$escapeHtmlAttribute(keyId__soy17) + '">' + e2e.ext.ui.templates.dialogs.importconfirmation.KeyPacketInfo({keyPacketInfo: keyData6.key, secretKeyDescription: opt_data.secretKeyDescription, publicKeyDescription: opt_data.publicKeyDescription}, null, opt_ijData) + '</label>';
    var subKeyInfoList32 = keyData6.subKeys;
    var subKeyInfoListLen32 = subKeyInfoList32.length;
    for (var subKeyInfoIndex32 = 0; subKeyInfoIndex32 < subKeyInfoListLen32; subKeyInfoIndex32++) {
      var subKeyInfoData32 = subKeyInfoList32[subKeyInfoIndex32];
      var subKeyId__soy33 = '' + keyId__soy17 + '-sub-' + ('' + subKeyInfoIndex32);
      subKeyId__soy33 = soydata.$$markUnsanitizedTextForInternalBlocks(subKeyId__soy33);
      output += '<br><input id="' + soy.$$escapeHtmlAttribute(subKeyId__soy33) + '" type="checkbox" data-mainkey="' + soy.$$escapeHtmlAttribute(keyIndex6) + '" data-subkey="yes" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEY_SUBKEY) + '"><label for="' + soy.$$escapeHtmlAttribute(subKeyId__soy33) + '">' + e2e.ext.ui.templates.dialogs.importconfirmation.KeyPacketInfo({keyPacketInfo: subKeyInfoData32, secretKeyDescription: opt_data.secretSubKeyDescription, publicKeyDescription: opt_data.publicSubKeyDescription}, null, opt_ijData) + '</label>';
    }
    output += '</div>';
  }
  output += '</div>';
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(output);
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.dialogs.importconfirmation.ImportKeyConfirm.soyTemplateName = 'e2e.ext.ui.templates.dialogs.importconfirmation.ImportKeyConfirm';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.dialogs.importconfirmation.KeyPacketInfo = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<div><span class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEY_TYPE_DESC) + '">' + ((opt_data.keyPacketInfo.secret) ? soy.$$escapeHtml(opt_data.secretKeyDescription) : soy.$$escapeHtml(opt_data.publicKeyDescription)) + ' ' + soy.$$escapeHtml(opt_data.keyPacketInfo.algorithm) + '</span> <span class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEY_FINGERPRINT) + '">' + soy.$$escapeHtml(opt_data.keyPacketInfo.fingerprintHex) + '</span></div>');
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.dialogs.importconfirmation.KeyPacketInfo.soyTemplateName = 'e2e.ext.ui.templates.dialogs.importconfirmation.KeyPacketInfo';
}
