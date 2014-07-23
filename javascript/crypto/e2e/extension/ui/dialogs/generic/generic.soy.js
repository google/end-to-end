// This file was automatically generated from generic.soy.
// Please don't edit this file by hand.

/**
 * @fileoverview Templates in namespace e2e.ext.ui.templates.dialogs.generic.
 */

goog.provide('e2e.ext.ui.templates.dialogs.generic');
goog.provide('e2e.ext.ui.templates.dialogs.generic.Dialog');

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
e2e.ext.ui.templates.dialogs.generic.Dialog = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(((opt_data.message) ? '<div>' + soy.$$changeNewlineToBr(soy.$$escapeHtml(opt_data.message)) + '</div>' : '') + ((opt_data.inputFieldType) ? '<input type="' + soy.$$escapeHtmlAttribute(opt_data.inputFieldType) + '" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.DIALOG_INPUT) + '" placeholder="' + soy.$$escapeHtmlAttribute(opt_data.inputPlaceholder) + '" autofocus>' : '') + '<button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.ACTION) + '">' + soy.$$escapeHtml(opt_data.actionButtonTitle) + '</button>' + ((opt_data.cancelButtonTitle.length > 0) ? '<button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.CANCEL) + '">' + soy.$$escapeHtml(opt_data.cancelButtonTitle) + '</button>' : ''));
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.dialogs.generic.Dialog.soyTemplateName = 'e2e.ext.ui.templates.dialogs.generic.Dialog';
}
