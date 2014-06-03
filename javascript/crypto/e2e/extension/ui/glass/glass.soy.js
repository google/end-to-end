// This file was automatically generated from glass.soy.
// Please don't edit this file by hand.

/**
 * @fileoverview Templates in namespace e2e.ext.ui.templates.glass.
 */

goog.provide('e2e.ext.ui.templates.glass');
goog.provide('e2e.ext.ui.templates.glass.ContentFrame');

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
e2e.ext.ui.templates.glass.ContentFrame = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<html><head><link rel="stylesheet"/></head><body><fieldset><legend>' + soy.$$escapeHtml(opt_data.label) + '</legend>' + ((opt_data.error) ? '<div id="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.ElementId.ERROR_DIV) + '">' + soy.$$escapeHtml(opt_data.error) + '</div>' : '') + '<div>' + soy.$$changeNewlineToBr(soy.$$escapeHtml(opt_data.content)) + '</div></fieldset><div></div></body></html>');
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.glass.ContentFrame.soyTemplateName = 'e2e.ext.ui.templates.glass.ContentFrame';
}
