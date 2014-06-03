// This file was automatically generated from prompt.soy.
// Please don't edit this file by hand.

/**
 * @fileoverview Templates in namespace e2e.ext.templates.prompt.
 */

goog.provide('e2e.ext.templates.prompt');
goog.provide('e2e.ext.templates.prompt.Main');
goog.provide('e2e.ext.templates.prompt.RenderChip');
goog.provide('e2e.ext.templates.prompt.RenderChipHolder');
goog.provide('e2e.ext.templates.prompt.RenderEncrypt');
goog.provide('e2e.ext.templates.prompt.RenderGenericForm');
goog.provide('e2e.ext.templates.prompt.RenderMenu');

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
e2e.ext.templates.prompt.Main = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<html><head><title>' + soy.$$escapeHtmlRcdata(opt_data.extName) + '</title><link rel="stylesheet"/></head><body><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.HEADER) + '"><div><h1 id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.TITLE) + '"></h1></div></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.ERROR_DIV) + '"></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.BODY) + '"></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.CALLBACK_DIALOG) + '"></div></body></html>');
};
if (goog.DEBUG) {
  e2e.ext.templates.prompt.Main.soyTemplateName = 'e2e.ext.templates.prompt.Main';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.templates.prompt.RenderMenu = function(opt_data, opt_ignored, opt_ijData) {
  var output = '<ul>';
  var actionList18 = opt_data.possibleActions;
  var actionListLen18 = actionList18.length;
  for (var actionIndex18 = 0; actionIndex18 < actionListLen18; actionIndex18++) {
    var actionData18 = actionList18[actionIndex18];
    output += '<li action="' + soy.$$escapeHtmlAttribute(soy.$$filterNormalizeUri(actionData18.value)) + '">' + soy.$$escapeHtml(actionData18.title) + '</li>';
  }
  output += '</ul>';
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(output);
};
if (goog.DEBUG) {
  e2e.ext.templates.prompt.RenderMenu.soyTemplateName = 'e2e.ext.templates.prompt.RenderMenu';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.templates.prompt.RenderEncrypt = function(opt_data, opt_ignored, opt_ijData) {
  var output = '<div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.FROM_HOLDER) + '"><div>' + soy.$$escapeHtml(opt_data.fromLabel) + '</div><select id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.SIGNER_SELECT) + '"' + ((opt_data.availableSigningKeys.length == 0) ? 'disabled' : '') + '>';
  var keyList38 = opt_data.availableSigningKeys;
  var keyListLen38 = keyList38.length;
  for (var keyIndex38 = 0; keyIndex38 < keyListLen38; keyIndex38++) {
    var keyData38 = keyList38[keyIndex38];
    output += '<option>' + soy.$$escapeHtml(keyData38) + '</option>';
  }
  output += '</select>' + ((opt_data.availableSigningKeys.length == 0) ? soy.$$escapeHtml(opt_data.noPrivateKeysFound) : '') + '</div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.CHIP_HOLDER) + '"></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.PASSPHRASE_ENCRYPTION_LINK) + '">+ ' + soy.$$escapeHtml(opt_data.passphraseEncryptionLinkTitle) + '</div><textarea></textarea><div><input type="checkbox" id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.SIGN_MESSAGE_CHECK) + '"' + ((opt_data.availableSigningKeys.length > 0) ? 'checked' : 'disabled') + '><label for="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.SIGN_MESSAGE_CHECK) + '">' + soy.$$escapeHtml(opt_data.signerCheckboxTitle) + '</label></div><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.BACK) + '"><img src="images/back.png" title="' + soy.$$escapeHtmlAttribute(opt_data.backButtonTitle) + '"/></button><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.ACTION) + '">' + soy.$$escapeHtml(opt_data.actionButtonTitle) + '</button>' + ((opt_data.insertCheckboxEnabled) ? '<button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.INSERT) + ' ' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.HIDDEN) + '">' + soy.$$escapeHtml(opt_data.insertButtonTitle) + '</button><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.SAVE) + '">' + soy.$$escapeHtml(opt_data.saveDraftButtonTitle) + '</button>' : '') + '<button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.OPTIONS) + '">' + soy.$$escapeHtml(opt_data.optionsButtonTitle) + '</button><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.CANCEL) + '">' + soy.$$escapeHtml(opt_data.cancelButtonTitle) + '</button>';
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(output);
};
if (goog.DEBUG) {
  e2e.ext.templates.prompt.RenderEncrypt.soyTemplateName = 'e2e.ext.templates.prompt.RenderEncrypt';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.templates.prompt.RenderGenericForm = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<textarea placeholder="' + soy.$$escapeHtmlAttribute(opt_data.textAreaPlaceholder) + '"></textarea><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.BACK) + '"><img src="images/back.png" title="' + soy.$$escapeHtmlAttribute(opt_data.backButtonTitle) + '"/></button><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.ACTION) + '">' + soy.$$escapeHtml(opt_data.actionButtonTitle) + '</button><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.CANCEL) + '">' + soy.$$escapeHtml(opt_data.cancelButtonTitle) + '</button>');
};
if (goog.DEBUG) {
  e2e.ext.templates.prompt.RenderGenericForm.soyTemplateName = 'e2e.ext.templates.prompt.RenderGenericForm';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.templates.prompt.RenderChipHolder = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.KEY_SELECT_FORM) + '"><div class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.CHIPS) + '"><span>' + soy.$$escapeHtml(opt_data.recipientsTitle) + '</span><input type="text"></div></div>');
};
if (goog.DEBUG) {
  e2e.ext.templates.prompt.RenderChipHolder.soyTemplateName = 'e2e.ext.templates.prompt.RenderChipHolder';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.templates.prompt.RenderChip = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<div class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.CHIP) + '"><div>' + soy.$$escapeHtml(opt_data.value) + '</div><img src="images/close.png"></div>');
};
if (goog.DEBUG) {
  e2e.ext.templates.prompt.RenderChip.soyTemplateName = 'e2e.ext.templates.prompt.RenderChip';
}
