// This file was automatically generated from templates.soy.
// Please don't edit this file by hand.

/**
 * @fileoverview Templates in namespace e2e.ext.ui.templates.
 */

goog.provide('e2e.ext.ui.templates');
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
