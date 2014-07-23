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
  var output = '<p>' + soy.$$escapeHtml(opt_data.promptImportKeyConfirmLabel) + ' (<a class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.SELECT_ALL_LINK) + '">' + soy.$$escapeHtml(opt_data.selectAllLabel) + '</a>)</p><div>';
  var keyList10 = opt_data.keys;
  var keyListLen10 = keyList10.length;
  for (var keyIndex10 = 0; keyIndex10 < keyListLen10; keyIndex10++) {
    var keyData10 = keyList10[keyIndex10];
    output += '<div class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEY_META) + '"><p><strong>';
    var uidList14 = keyData10.uids;
    var uidListLen14 = uidList14.length;
    for (var uidIndex14 = 0; uidIndex14 < uidListLen14; uidIndex14++) {
      var uidData14 = uidList14[uidIndex14];
      output += soy.$$escapeHtml(uidData14) + ((! (uidIndex14 == uidListLen14 - 1)) ? ', ' : '');
    }
    output += '</strong>:</p>';
    var keyId__soy21 = 'key-' + ('' + keyIndex10);
    keyId__soy21 = soydata.$$markUnsanitizedTextForInternalBlocks(keyId__soy21);
    output += '<br><input id="' + soy.$$escapeHtmlAttribute(keyId__soy21) + '" type="checkbox" data-mainkey="' + soy.$$escapeHtmlAttribute(keyIndex10) + '"><label for="' + soy.$$escapeHtmlAttribute(keyId__soy21) + '">' + e2e.ext.ui.templates.dialogs.importconfirmation.KeyPacketInfo({keyPacketInfo: keyData10.key, secretKeyDescription: opt_data.secretKeyDescription, publicKeyDescription: opt_data.publicKeyDescription}, null, opt_ijData) + '</label>';
    var subKeyInfoList36 = keyData10.subKeys;
    var subKeyInfoListLen36 = subKeyInfoList36.length;
    for (var subKeyInfoIndex36 = 0; subKeyInfoIndex36 < subKeyInfoListLen36; subKeyInfoIndex36++) {
      var subKeyInfoData36 = subKeyInfoList36[subKeyInfoIndex36];
      var subKeyId__soy37 = '' + keyId__soy21 + '-sub-' + ('' + subKeyInfoIndex36);
      subKeyId__soy37 = soydata.$$markUnsanitizedTextForInternalBlocks(subKeyId__soy37);
      output += '<br><input id="' + soy.$$escapeHtmlAttribute(subKeyId__soy37) + '" type="checkbox" data-mainkey="' + soy.$$escapeHtmlAttribute(keyIndex10) + '" data-subkey="yes" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.KEY_SUBKEY) + '"><label for="' + soy.$$escapeHtmlAttribute(subKeyId__soy37) + '">' + e2e.ext.ui.templates.dialogs.importconfirmation.KeyPacketInfo({keyPacketInfo: subKeyInfoData36, secretKeyDescription: opt_data.secretSubKeyDescription, publicKeyDescription: opt_data.publicSubKeyDescription}, null, opt_ijData) + '</label>';
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
