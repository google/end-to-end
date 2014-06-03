// This file was automatically generated from preferences.soy.
// Please don't edit this file by hand.

/**
 * @fileoverview Templates in namespace e2e.ext.ui.templates.panels.preferences.
 */

goog.provide('e2e.ext.ui.templates.panels.preferences');
goog.provide('e2e.ext.ui.templates.panels.preferences.ListPreferences');
goog.provide('e2e.ext.ui.templates.panels.preferences.PreferenceEntry');

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
e2e.ext.ui.templates.panels.preferences.ListPreferences = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<h1>' + soy.$$escapeHtml(opt_data.sectionTitle) + '</h1>');
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.panels.preferences.ListPreferences.soyTemplateName = 'e2e.ext.ui.templates.panels.preferences.ListPreferences';
}


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {!soydata.SanitizedHtml}
 * @suppress {checkTypes|uselessCode}
 */
e2e.ext.ui.templates.panels.preferences.PreferenceEntry = function(opt_data, opt_ignored, opt_ijData) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtml('<div  class="' + soy.$$escapeHtmlAttribute(e2e.ext.constants.CssClass.PREFERENCE_DIV) + '"><input type="checkbox" id="preference-' + soy.$$escapeHtmlAttribute(opt_data.name) + '" ' + ((opt_data.checked) ? 'checked' : '') + ' /><label for="preference-' + soy.$$escapeHtmlAttribute(opt_data.name) + '">' + soy.$$escapeHtml(opt_data.description) + '</label></div>');
};
if (goog.DEBUG) {
  e2e.ext.ui.templates.panels.preferences.PreferenceEntry.soyTemplateName = 'e2e.ext.ui.templates.panels.preferences.PreferenceEntry';
}
