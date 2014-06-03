// This file was automatically generated from generatekey.soy.
// Please don't edit this file by hand.

/**
 * @fileoverview Templates in namespace e2e.ext.ui.templates.panels.generatekey.
 */

goog.provide('e2e.ext.ui.templates.panels.generatekey');
goog.provide('e2e.ext.ui.templates.panels.generatekey.GenerateKeyForm');

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
e2e.ext.ui.templates.panels.generatekey.GenerateKeyForm = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml(((opt_data.sectionTitle) ? '<h1>' + soy.$$escapeHtml(opt_data.sectionTitle) + '</h1>' : '') + '<div>' + soy.$$changeNewlineToBr(soy.$$escapeHtml(opt_data.emailLabel)) + '</div><input type="text" name="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.EMAIL) + '" class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.EMAIL) + '"><button class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.ACTION) + '">' + soy.$$escapeHtml(opt_data.actionButtonTitle) + '</button>');
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.panels.generatekey.GenerateKeyForm.soyTemplateName = 'e2e.ext.ui.templates.panels.generatekey.GenerateKeyForm';
}
