// This file was automatically generated from templates.soy.
// Please don't edit this file by hand.

/**
 * @fileoverview Templates in namespace e2e.ext.templates.
 */

goog.provide('e2e.ext.templates');
goog.provide('e2e.ext.templates.Dialog');
goog.provide('e2e.ext.templates.Settings');

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
e2e.ext.templates.Settings = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<html><head><title>' + soy.$$escapeHtmlRcdata(opt_data.extName) + '</title><link rel="stylesheet"/></head><body><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.HEADER) + '"><div><h1>' + soy.$$escapeHtml(opt_data.pageTitle) + '</h1></div></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.ERROR_DIV) + '"></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.BODY) + '"></div><div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.CALLBACK_DIALOG) + '"></div></body></html>');
};
if (goog.DEBUG) {
  e2e.ext.templates.Settings.soyTemplateName = 'e2e.ext.templates.Settings';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.templates.Dialog = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(((opt_data.message) ? '<div>' + soy.$$changeNewlineToBr(soy.$$escapeHtml(opt_data.message)) + '</div>' : '') + ((opt_data.inputFieldType) ? '<input type="' + soy.$$escapeHtmlAttribute(opt_data.inputFieldType) + '" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.DIALOG_INPUT) + '" placeholder="' + soy.$$escapeHtmlAttribute(opt_data.inputPlaceholder) + '" autofocus>' : '') + '<button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.ACTION) + '">' + soy.$$escapeHtml(opt_data.actionButtonTitle) + '</button>' + ((opt_data.cancelButtonTitle.length > 0) ? '<button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.CANCEL) + '">' + soy.$$escapeHtml(opt_data.cancelButtonTitle) + '</button>' : ''));
};
if (goog.DEBUG) {
  e2e.ext.templates.Dialog.soyTemplateName = 'e2e.ext.templates.Dialog';
}
